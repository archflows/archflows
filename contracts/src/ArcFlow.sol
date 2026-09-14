// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title ArcFlow
/// @notice Immutable token locks and linear vesting for Arc.
///         After a launchpad create, a dev locks their allocation so it cannot be sold until it unlocks.
/// @dev A position can never be cancelled, shortened, or reassigned. That is the product guarantee.
contract ArcFlow {
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
    error Reentrancy();

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
    event Claimed(uint256 indexed id, address indexed beneficiary, uint128 amount);

    uint256 private _entered;

    modifier nonReentrant() {
        if (_entered == 1) revert Reentrancy();
        _entered = 1;
        _;
        _entered = 0;
    }

    /// @notice Lock `amount` of `token` for `beneficiary`.
    /// @dev Hard lock: set cliff == end. Linear vest: start <= cliff < end.
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
        if (cliff < start || end < cliff) revert InvalidSchedule();
        // A lock that is already fully unlocked is not proof of anything.
        if (end <= block.timestamp) revert InvalidSchedule();

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
}
