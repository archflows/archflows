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
contract arcflowsLocker is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
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

    /// @notice Default referral share of `LOCK_FEE` when a lock is attributed to a referrer (15%).
    uint16 public constant DEFAULT_REFERRAL_RATE_BPS = 1500;

    /// @notice Upper bound for `referralRateBps` (100%).
    uint16 public constant MAX_REFERRAL_RATE_BPS = 10_000;

    /// @dev Arc USDC ERC-20 interface. Same asset as gas; do not send `msg.value` for the fee.
    address public usdc;
    /// @dev Platform fee sink. Owner may rotate via `setTreasury`.
    address public treasury;
    /// @dev Dedicated referral pool wallet. Referral fees land here; claims pull from here via `transferFrom`.
    address public referralWallet;
    /// @dev Share of `LOCK_FEE` attributed to referrers on referred locks, in basis points.
    uint16 public referralRateBps;
    /// @dev Platform share of the gross referral commission, in basis points (2000 = 20%).
    uint16 public referralPlatformBps;
    /// @dev Backend relayer that may call `withdrawReferral` after verifying a user signature.
    address public withdrawExecutor;
    /// @dev USDC owed to each referrer from on-chain lock fees. Withdrawn via `withdrawReferral`.
    mapping(address => uint256) public referralBalances;

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
    error InvalidReferralRate();
    error NotAuthorized();
    error InsufficientReferralBalance();

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
    event ReferralFeePaid(uint256 indexed id, address indexed from, address indexed referrer, uint128 amount);
    event TreasuryUpdated(address treasury);
    event ReferralWalletUpdated(address wallet);
    event ReferralRateUpdated(uint16 rateBps);
    event ReferralPlatformBpsUpdated(uint16 platformBps);
    event WithdrawExecutorUpdated(address executor);
    event ReferralCredited(address indexed referrer, uint128 amount);
    event ReferralWithdrawn(address indexed referrer, uint128 amount);
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

    /// @notice Initializes referral fee routing on upgraded proxies.
    function initializeV2(address referralWallet_) external reinitializer(2) {
        if (referralWallet_ == address(0)) revert ZeroAddress();
        referralWallet = referralWallet_;
        referralRateBps = DEFAULT_REFERRAL_RATE_BPS;
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0) || treasury_ == address(this)) revert ZeroAddress();
        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    function setReferralWallet(address wallet_) external onlyOwner {
        if (wallet_ == address(0)) revert ZeroAddress();
        referralWallet = wallet_;
        emit ReferralWalletUpdated(wallet_);
    }

    function setReferralRateBps(uint16 rateBps_) external onlyOwner {
        if (rateBps_ > MAX_REFERRAL_RATE_BPS) revert InvalidReferralRate();
        referralRateBps = rateBps_;
        emit ReferralRateUpdated(rateBps_);
    }

    function setReferralPlatformBps(uint16 platformBps_) external onlyOwner {
        if (platformBps_ > MAX_REFERRAL_RATE_BPS) revert InvalidReferralRate();
        referralPlatformBps = platformBps_;
        emit ReferralPlatformBpsUpdated(platformBps_);
    }

    function setWithdrawExecutor(address executor_) external onlyOwner {
        if (executor_ == address(0)) revert ZeroAddress();
        withdrawExecutor = executor_;
        emit WithdrawExecutorUpdated(executor_);
    }

    /// @notice Enables in-contract referral balances. `withdrawExecutor_` may be zero if claims are user-paid.
    function initializeV3(address withdrawExecutor_) external reinitializer(3) {
        withdrawExecutor = withdrawExecutor_;
        referralPlatformBps = 2000;
    }

    /// @notice Disabled — referral claims are processed by the backend relayer via `withdrawReferral`.
    function claimReferral(uint128 /* amount */) external pure {
        revert NotAuthorized();
    }

    /// @notice Pays a referrer from the referral pool wallet. Only `withdrawExecutor` (backend) may call.
    function withdrawReferral(address referrer, uint128 amount) external nonReentrant {
        if (msg.sender != withdrawExecutor) revert NotAuthorized();
        if (referrer == address(0) || amount == 0) revert ZeroAmount();
        if (referralBalances[referrer] < amount) revert InsufficientReferralBalance();

        referralBalances[referrer] -= amount;
        _payoutReferral(referrer, amount);
        emit ReferralWithdrawn(referrer, amount);
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
        return _lock(token, beneficiary, amount, start, cliff, end, address(0));
    }

    /// @notice Same as `lock`, but routes `referralRateBps` of the fee to `referralWallet` when `referrer` is set.
    /// @dev Self-referrals are ignored and pay the full fee to `treasury`.
    function lockWithReferral(
        address token,
        address beneficiary,
        uint128 amount,
        uint64 start,
        uint64 cliff,
        uint64 end,
        address referrer
    ) external nonReentrant returns (uint256 id) {
        return _lock(token, beneficiary, amount, start, cliff, end, referrer);
    }

    function _lock(
        address token,
        address beneficiary,
        uint128 amount,
        uint64 start,
        uint64 cliff,
        uint64 end,
        address referrer
    ) internal returns (uint256 id) {
        if (token == address(0) || beneficiary == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (start == 0) start = uint64(block.timestamp);
        else if (start < block.timestamp) revert InvalidSchedule();
        if (cliff == 0) cliff = start;
        if (cliff < start || end < cliff) revert InvalidSchedule();
        // A lock that is already fully unlocked is not proof of anything.
        if (end <= block.timestamp) revert InvalidSchedule();
        if (end - start < MIN_DURATION) revert InvalidSchedule();

        uint128 referralAmount = _takeFee(referrer);
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
        if (referralAmount > 0) emit ReferralFeePaid(id, msg.sender, referrer, referralAmount);
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

    /// @return referralAmount Net USDC credited to `referralBalances[referrer]` for this lock, if any.
    function _takeFee(address referrer) internal returns (uint128 referralAmount) {
        referralAmount = 0;
        if (referrer != address(0) && referrer != msg.sender && referralRateBps > 0) {
            uint128 gross = uint128((uint256(LOCK_FEE) * referralRateBps) / 10_000);
            uint16 platformBps = referralPlatformBps;
            referralAmount = platformBps > 0 ? uint128((uint256(gross) * (10_000 - platformBps)) / 10_000) : gross;
        }

        uint128 treasuryAmount = LOCK_FEE - referralAmount;
        if (referralAmount > 0) {
            if (referralWallet == address(0)) revert ZeroAddress();
            uint256 poolBefore = IERC20(usdc).balanceOf(referralWallet);
            _call(usdc, abi.encodeCall(IERC20.transferFrom, (msg.sender, referralWallet, referralAmount)));
            if (IERC20(usdc).balanceOf(referralWallet) - poolBefore != referralAmount) revert TransferFailed();
            referralBalances[referrer] += referralAmount;
            emit ReferralCredited(referrer, referralAmount);
        }

        uint256 treasuryBefore = IERC20(usdc).balanceOf(treasury);
        _call(usdc, abi.encodeCall(IERC20.transferFrom, (msg.sender, treasury, treasuryAmount)));
        if (IERC20(usdc).balanceOf(treasury) - treasuryBefore != treasuryAmount) revert TransferFailed();
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

    /// @dev Pulls USDC from `referralWallet` to `to`. The lock contract must be approved by the pool wallet.
    function _payoutReferral(address to, uint128 amount) internal {
        if (referralWallet == address(0)) revert ZeroAddress();
        uint256 poolBefore = IERC20(usdc).balanceOf(referralWallet);
        _call(usdc, abi.encodeCall(IERC20.transferFrom, (referralWallet, to, amount)));
        if (IERC20(usdc).balanceOf(referralWallet) + amount != poolBefore) revert TransferFailed();
    }

    function _call(address token, bytes memory payload) private {
        (bool ok, bytes memory data) = token.call(payload);
        if (!ok) revert TransferFailed();
        if (data.length != 0 && (data.length < 32 || !abi.decode(data, (bool)))) revert TransferFailed();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /// @dev Reserved so later versions can add state without shifting existing slots.
    uint256[40] private __gap;
}
