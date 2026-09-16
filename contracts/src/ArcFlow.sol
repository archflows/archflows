// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title arcflows locker
/// @notice Token locks and linear vesting for Arc.
///         After a launchpad create, a dev locks their allocation so it cannot be sold until it unlocks.
/// @dev Deployed behind a UUPS proxy so the owner can replace this implementation.
///      This version still cannot cancel, shorten, or reassign a position.
contract arcflows is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    struct Position {
        address token;
        address beneficiary;
        address creator;
        uint128 amount;
        uint128 claimed;
        uint64 start;
        uint64 cliff;
        uint64 end;
    }

    /// @notice Floor against a lock that is already over when it lands. Callers pick any longer schedule.
    uint64 public constant MIN_DURATION = 1 minutes;

    /// @notice Flat lock fee, 10 USDC in the ERC-20 6-decimal view. Never native 18-dec units.
    uint128 public constant LOCK_FEE = 10 * 1e6;

    /// @dev Arc USDC ERC-20 interface. Same asset as gas; do not send `msg.value` for the fee.
    address public usdc;
    /// @dev Fee sink. Set at initialize; this implementation does not rotate it.
    address public treasury;

    uint256 public nextId;
    mapping(uint256 => Position) public positions;
    mapping(address => uint256[]) public locksByCreator;
    mapping(address => uint256[]) public locksByBeneficiary;
    mapping(address => uint256[]) public locksByToken;

    /// @notice Tokens owed to positions, per token. Anything above this is an untracked donation.
    mapping(address => uint256) public totalLocked;

    error ZeroAddress();
    error ZeroAmount();
    error InvalidSchedule();
    error AmountTooLarge();
    error TransferFailed();
    error NotBeneficiary();
    error NothingToClaim();

    event Locked(
        uint256 indexed id,
        address indexed token,
        address indexed beneficiary,
        address creator,
        uint128 amount,
        uint64 start,
        uint64 cliff,
        uint64 end
    );
    event FeePaid(uint256 indexed id, address indexed from, uint128 amount);
    event Claimed(uint256 indexed id, address indexed beneficiary, uint128 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address owner_, address usdc_, address treasury_) external initializer {
        if (usdc_ == address(0) || treasury_ == address(0) || treasury_ == address(this)) revert ZeroAddress();
        __Ownable_init(owner_);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        usdc = usdc_;
        treasury = treasury_;
    }

    /// @notice Lock `amount` of `token` for `beneficiary`.
    /// @dev Hard lock: set cliff == end. Linear vest: start <= cliff < end.
    ///      Pass `start = 0` (and `cliff = 0` for a vest) to use `block.timestamp`.
    ///      `start` in the past is rejected: a backdated vest looks locked on a proof page
    ///      while most of the bag is already claimable.
    ///      Each lock charges `LOCK_FEE` USDC to `treasury` up front. The fee never sits in
    ///      `totalLocked` and cannot be claimed out of a position.
    ///      `amount` is the amount pulled from the caller. For tokens that take a transfer fee,
    ///      the position is credited with what actually arrived, never more.
    function lock(address token, address beneficiary, uint128 amount, uint64 start, uint64 cliff, uint64 end)
        external
        nonReentrant
        returns (uint256 id)
    {
        if (token == address(0) || beneficiary == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (start == 0) start = uint64(block.timestamp);
        else if (start < block.timestamp) revert InvalidSchedule();
        if (cliff == 0) cliff = start;
        if (cliff < start || end < cliff) revert InvalidSchedule();
        // A lock that is already fully unlocked is not proof of anything.
        if (end <= block.timestamp) revert InvalidSchedule();
        if (end - start < MIN_DURATION) revert InvalidSchedule();

        _takeFee();
        uint128 received = _pull(token, msg.sender, amount);

        id = nextId++;
        positions[id] = Position({
            token: token,
            beneficiary: beneficiary,
            creator: msg.sender,
            amount: received,
            claimed: 0,
            start: start,
            cliff: cliff,
            end: end
        });

        locksByCreator[msg.sender].push(id);
        locksByBeneficiary[beneficiary].push(id);
        locksByToken[token].push(id);
        totalLocked[token] += received;

        emit Locked(id, token, beneficiary, msg.sender, received, start, cliff, end);
        emit FeePaid(id, msg.sender, LOCK_FEE);
    }

    function claim(uint256 id) external nonReentrant returns (uint128 amount) {
        Position storage p = positions[id];
        if (msg.sender != p.beneficiary) revert NotBeneficiary();

        uint128 released = _released(p, uint64(block.timestamp));
        if (released <= p.claimed) revert NothingToClaim();

        amount = released - p.claimed;
        p.claimed = released;
        totalLocked[p.token] -= amount;

        _push(p.token, p.beneficiary, amount);
        emit Claimed(id, p.beneficiary, amount);
    }

    function claimable(uint256 id) external view returns (uint128) {
        Position storage p = positions[id];
        uint128 released = _released(p, uint64(block.timestamp));
        if (released <= p.claimed) return 0;
        return released - p.claimed;
    }

    function creatorLockCount(address creator) external view returns (uint256) {
        return locksByCreator[creator].length;
    }

    function beneficiaryLockCount(address beneficiary) external view returns (uint256) {
        return locksByBeneficiary[beneficiary].length;
    }

    function tokenLockCount(address token) external view returns (uint256) {
        return locksByToken[token].length;
    }

    function _released(Position storage p, uint64 timestamp) internal view returns (uint128) {
        if (p.amount == 0 || timestamp < p.cliff) return 0;
        if (timestamp >= p.end) return p.amount;
        uint256 duration = uint256(p.end) - uint256(p.start);
        if (duration == 0) return p.amount;
        // Elapsed is strictly below duration here, so the product stays under p.amount.
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint128((uint256(p.amount) * (uint256(timestamp) - uint256(p.start))) / duration);
    }

    function _takeFee() internal {
        uint256 before = IERC20(usdc).balanceOf(treasury);
        _call(usdc, abi.encodeCall(IERC20.transferFrom, (msg.sender, treasury, LOCK_FEE)));
        if (IERC20(usdc).balanceOf(treasury) - before != LOCK_FEE) revert TransferFailed();
    }

    /// @return received Balance actually gained by this contract, which is what the position is credited.
    function _pull(address token, address from, uint128 amount) internal returns (uint128 received) {
        uint256 before = IERC20(token).balanceOf(address(this));
        _call(token, abi.encodeCall(IERC20.transferFrom, (from, address(this), amount)));
        uint256 delta = IERC20(token).balanceOf(address(this)) - before;
        if (delta == 0) revert ZeroAmount();
        if (delta > type(uint128).max) revert AmountTooLarge();
        // Bounded by the check above.
        // forge-lint: disable-next-line(unsafe-typecast)
        received = uint128(delta);
    }

    function _push(address token, address to, uint128 amount) internal {
        _call(token, abi.encodeCall(IERC20.transfer, (to, amount)));
    }

    function _call(address token, bytes memory payload) private {
        (bool ok, bytes memory data) = token.call(payload);
        if (!ok) revert TransferFailed();
        if (data.length != 0 && (data.length < 32 || !abi.decode(data, (bool)))) revert TransferFailed();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /// @dev Reserved so later versions can add state without shifting existing slots.
    uint256[45] private __gap;
}
