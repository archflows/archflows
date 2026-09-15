// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {TokenLib} from "./lib/TokenLib.sol";

/// @title ArcFlowStaking
/// @notice Permissionless staking pools: stake, lock, earn, claim (Synthetix-style).
/// @dev Storage is append-only so the existing UUPS proxy can keep upgrading. The protocol
///      owner can replace this implementation — keep that key on a multisig, not a hot wallet.
contract ArcFlowStaking is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    struct Pool {
        address stakeToken;
        address rewardToken;
        address owner;
        uint128 totalStaked;
        uint256 rewardRate;
        uint256 rewardPerTokenStored;
        uint256 rewardReserves;
        uint64 lastUpdate;
        uint64 periodFinish;
        uint64 minLock;
        /// @dev Rewards credited to users but not yet paid. Recoverable unused = reserves - pending.
        uint256 pendingRewards;
        /// @dev 0 = no cap.
        uint128 cap;
        /// @dev 0 = no expiry. After this, new stakes revert; unstake/claim still work.
        uint64 expiresAt;
        bool paused;
        /// @dev False on pre-upgrade pools. Recover is disabled there so leftover accounting
        ///      cannot skim unclaimed user rewards that were never added to `pendingRewards`.
        bool rewardAccounting;
    }

    struct Stake {
        uint128 amount;
        uint256 rewards;
        uint256 userRewardPerTokenPaid;
        /// @dev Next time any remaining lot unlocks. 0 = everything currently withdrawable.
        uint64 unlockAt;
    }

    /// @dev One deposit. Restaking never re-locks an older lot.
    struct Lot {
        uint128 amount;
        uint64 unlockAt;
    }

    uint256 public constant PRECISION = 1e18;
    /// @dev Two years. Long enough for real lock staking, short enough to block a forever-rug.
    uint64 public constant MAX_MIN_LOCK = 730 days;
    uint64 public constant MAX_FUND_DURATION = 3650 days;
    uint256 public constant MAX_LOTS = 16;

    uint256 public nextId;
    mapping(uint256 => Pool) public pools;
    mapping(uint256 => mapping(address => Stake)) public stakes;

    bool public protocolPaused;
    mapping(address => uint256[]) public poolsByCreator;
    mapping(address => uint256[]) public poolsByStaker;
    mapping(uint256 => mapping(address => bool)) private _stakerIndexed;

    address public pendingOwner;
    mapping(uint256 => address) public pendingPoolOwner;
    mapping(uint256 => mapping(address => Lot[])) private _lots;

    error ZeroAddress();
    error ZeroAmount();
    error NotOwner();
    error Locked();
    error NothingToWithdraw();
    error NothingToClaim();
    error InsufficientStake();
    error InvalidLock();
    error InvalidDuration();
    error Paused();
    error CapExceeded();
    error PoolExpired();
    error NothingToRecover();
    error SameTokenOnly();

    event PoolCreated(
        uint256 indexed id, address indexed stakeToken, address indexed rewardToken, address owner, uint64 minLock
    );
    event RewardFunded(uint256 indexed id, uint256 amount, uint64 duration, uint256 rewardRate, uint64 periodFinish);
    event Staked(uint256 indexed id, address indexed account, uint128 amount, uint64 unlockAt);
    event Unstaked(uint256 indexed id, address indexed account, uint128 amount);
    event RewardPaid(uint256 indexed id, address indexed account, uint256 amount);
    event RewardsRecovered(uint256 indexed id, address indexed to, uint256 amount);
    event PoolPaused(uint256 indexed id, bool paused);
    event ProtocolPaused(bool paused);
    event CapSet(uint256 indexed id, uint128 cap);
    event ExpirySet(uint256 indexed id, uint64 expiresAt);
    event PoolTransferStarted(uint256 indexed id, address indexed from, address indexed to);
    event PoolTransferred(uint256 indexed id, address indexed from, address indexed to);
    event Compounded(uint256 indexed id, address indexed account, uint256 amount);
    event ProtocolOwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address owner_) external initializer {
        __Ownable_init(owner_);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
    }

    function createPool(address stakeToken, address rewardToken, uint64 minLock) external returns (uint256 id) {
        if (stakeToken == address(0) || rewardToken == address(0)) revert ZeroAddress();
        if (minLock > MAX_MIN_LOCK) revert InvalidLock();

        id = nextId++;
        pools[id] = Pool({
            stakeToken: stakeToken,
            rewardToken: rewardToken,
            owner: msg.sender,
            totalStaked: 0,
            rewardRate: 0,
            rewardPerTokenStored: 0,
            rewardReserves: 0,
            lastUpdate: uint64(block.timestamp),
            periodFinish: 0,
            minLock: minLock,
            pendingRewards: 0,
            cap: 0,
            expiresAt: 0,
            paused: false,
            rewardAccounting: true
        });
        poolsByCreator[msg.sender].push(id);
        emit PoolCreated(id, stakeToken, rewardToken, msg.sender, minLock);
    }

    function fund(uint256 id, uint256 amount, uint64 duration) external nonReentrant {
        Pool storage p = pools[id];
        if (msg.sender != p.owner) revert NotOwner();
        if (amount == 0 || duration == 0) revert ZeroAmount();
        if (duration > MAX_FUND_DURATION) revert InvalidDuration();
        uint256 finish = uint256(block.timestamp) + uint256(duration);
        if (finish > type(uint64).max) revert InvalidDuration();

        _update(id, address(0));
        uint256 received = TokenLib.pull(p.rewardToken, msg.sender, amount);
        p.rewardReserves += received;

        if (block.timestamp >= p.periodFinish) {
            p.rewardRate = received / duration;
        } else {
            uint256 leftover = uint256(p.periodFinish - block.timestamp) * p.rewardRate;
            p.rewardRate = (received + leftover) / duration;
        }
        if (p.rewardRate == 0) revert ZeroAmount();

        p.lastUpdate = uint64(block.timestamp);
        // forge-lint: disable-next-line(unsafe-typecast)
        p.periodFinish = uint64(finish);
        emit RewardFunded(id, received, duration, p.rewardRate, p.periodFinish);
    }

    function stake(uint256 id, uint128 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        Pool storage p = pools[id];
        _assertCanEnter(p);

        Stake storage u = stakes[id][msg.sender];
        _update(id, msg.sender);

        uint128 received = TokenLib.pull128(p.stakeToken, msg.sender, amount);
        uint64 unlockAt = _creditStake(p, u, id, msg.sender, received);
        emit Staked(id, msg.sender, received, unlockAt);
    }

    /// @notice Unstakes unlocked lots and claims rewards.
    function unstake(uint256 id, uint128 amount) external nonReentrant {
        _unstake(id, amount, true);
    }

    /// @notice Unstakes unlocked lots without claiming. Use if the reward token is denylisted.
    function unstakeOnly(uint256 id, uint128 amount) external nonReentrant {
        _unstake(id, amount, false);
    }

    function getReward(uint256 id) external nonReentrant returns (uint256 amount) {
        amount = _payout(id, msg.sender);
        if (amount == 0) revert NothingToClaim();
    }

    /// @notice Withdraws every currently unlocked lot and claims rewards. Locked lots stay.
    function exit(uint256 id) external nonReentrant {
        Stake storage u = stakes[id][msg.sender];
        _hydrateLots(id, msg.sender, u);

        uint128 free = _unlockedAmount(_lots[id][msg.sender], u);
        if (free != 0) {
            _unstake(id, free, true);
            return;
        }

        uint256 reward = _payout(id, msg.sender);
        if (reward == 0) revert NothingToWithdraw();
    }

    /// @notice Restakes claimed rewards as a new lot. Does not re-lock older deposits.
    function compound(uint256 id) external nonReentrant returns (uint256 amount) {
        Pool storage p = pools[id];
        if (p.stakeToken != p.rewardToken) revert SameTokenOnly();
        _assertCanEnter(p);

        amount = _settleRewards(id, msg.sender);
        if (amount == 0) revert NothingToClaim();
        if (amount > type(uint128).max) revert CapExceeded();

        Stake storage u = stakes[id][msg.sender];
        // forge-lint: disable-next-line(unsafe-typecast)
        uint128 add = uint128(amount);
        uint64 unlockAt = _creditStake(p, u, id, msg.sender, add);

        emit Staked(id, msg.sender, add, unlockAt);
        emit Compounded(id, msg.sender, amount);
    }

    /// @notice Returns unused emissions. Never takes rewards already credited to stakers.
    /// @dev Requires `totalStaked == 0` so lazy `pendingRewards` is complete (every leaver was updated).
    function recoverRewards(uint256 id) external nonReentrant returns (uint256 amount) {
        Pool storage p = pools[id];
        if (msg.sender != p.owner) revert NotOwner();
        if (!p.rewardAccounting) revert NothingToRecover();

        _update(id, address(0));
        if (p.totalStaked != 0) revert Locked();

        p.rewardRate = 0;
        p.periodFinish = uint64(block.timestamp);

        if (p.rewardReserves <= p.pendingRewards) revert NothingToRecover();
        amount = p.rewardReserves - p.pendingRewards;
        p.rewardReserves -= amount;
        TokenLib.push(p.rewardToken, p.owner, amount);
        emit RewardsRecovered(id, p.owner, amount);
    }

    function setPaused(uint256 id, bool paused_) external {
        Pool storage p = pools[id];
        if (msg.sender != p.owner) revert NotOwner();
        p.paused = paused_;
        emit PoolPaused(id, paused_);
    }

    function setProtocolPaused(bool paused_) external onlyOwner {
        protocolPaused = paused_;
        emit ProtocolPaused(paused_);
    }

    function setCap(uint256 id, uint128 cap) external {
        Pool storage p = pools[id];
        if (msg.sender != p.owner) revert NotOwner();
        if (cap != 0 && cap < p.totalStaked) revert CapExceeded();
        p.cap = cap;
        emit CapSet(id, cap);
    }

    function setExpiry(uint256 id, uint64 expiresAt) external {
        Pool storage p = pools[id];
        if (msg.sender != p.owner) revert NotOwner();
        if (p.totalStaked != 0) revert Locked();
        if (expiresAt != 0 && expiresAt <= block.timestamp) revert PoolExpired();
        p.expiresAt = expiresAt;
        emit ExpirySet(id, expiresAt);
    }

    /// @notice Starts a two-step pool handoff. Pass address(0) to cancel.
    function transferPool(uint256 id, address newOwner) external {
        Pool storage p = pools[id];
        if (msg.sender != p.owner) revert NotOwner();
        if (newOwner == p.owner) revert ZeroAddress();
        pendingPoolOwner[id] = newOwner;
        emit PoolTransferStarted(id, msg.sender, newOwner);
    }

    function acceptPool(uint256 id) external {
        if (msg.sender == address(0) || msg.sender != pendingPoolOwner[id]) revert NotOwner();
        Pool storage p = pools[id];
        address from = p.owner;
        p.owner = msg.sender;
        pendingPoolOwner[id] = address(0);
        poolsByCreator[msg.sender].push(id);
        emit PoolTransferred(id, from, msg.sender);
    }

    /// @notice Two-step protocol ownership. Instant transfer is disabled.
    function transferOwnership(address newOwner) public override onlyOwner {
        if (newOwner == address(0) || newOwner == owner()) revert ZeroAddress();
        pendingOwner = newOwner;
        emit ProtocolOwnershipTransferStarted(owner(), newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotOwner();
        pendingOwner = address(0);
        _transferOwnership(msg.sender);
    }

    function renounceOwnership() public override onlyOwner {
        if (protocolPaused) revert Paused();
        pendingOwner = address(0);
        super.renounceOwnership();
    }

    function earned(uint256 id, address account) public view returns (uint256) {
        Pool storage p = pools[id];
        Stake storage u = stakes[id][account];
        return u.rewards + (uint256(u.amount) * (_rewardPerToken(p) - u.userRewardPerTokenPaid)) / PRECISION;
    }

    function rewardPerToken(uint256 id) external view returns (uint256) {
        return _rewardPerToken(pools[id]);
    }

    function creatorPoolCount(address creator) external view returns (uint256) {
        return poolsByCreator[creator].length;
    }

    function stakerPoolCount(address staker) external view returns (uint256) {
        return poolsByStaker[staker].length;
    }

    function lotCount(uint256 id, address account) external view returns (uint256) {
        uint256 n = _lots[id][account].length;
        if (n == 0 && stakes[id][account].amount != 0) return 1;
        return n;
    }

    function lotAt(uint256 id, address account, uint256 index) external view returns (uint128 amount, uint64 unlockAt) {
        Lot[] storage lots = _lots[id][account];
        if (lots.length == 0) {
            Stake storage u = stakes[id][account];
            if (u.amount == 0 || index != 0) revert InsufficientStake();
            return (u.amount, u.unlockAt);
        }
        Lot storage lot = lots[index];
        return (lot.amount, lot.unlockAt);
    }

    function unlockedOf(uint256 id, address account) public view returns (uint128) {
        return _unlockedAmount(_lots[id][account], stakes[id][account]);
    }

    function _unstake(uint256 id, uint128 amount, bool claimRewards) private {
        if (amount == 0) revert ZeroAmount();
        Pool storage p = pools[id];
        Stake storage u = stakes[id][msg.sender];
        _hydrateLots(id, msg.sender, u);
        if (amount > u.amount) revert InsufficientStake();

        Lot[] storage lots = _lots[id][msg.sender];
        if (amount > _unlockedAmount(lots, u)) revert Locked();

        _update(id, msg.sender);
        _pullUnlocked(lots, amount);
        u.amount -= amount;
        p.totalStaked -= amount;
        _syncUnlockAt(u, lots);

        TokenLib.push(p.stakeToken, msg.sender, amount);
        emit Unstaked(id, msg.sender, amount);

        if (claimRewards) _payout(id, msg.sender);
    }

    function _payout(uint256 id, address account) private returns (uint256 amount) {
        amount = _settleRewards(id, account);
        if (amount == 0) return 0;
        TokenLib.push(pools[id].rewardToken, account, amount);
        emit RewardPaid(id, account, amount);
    }

    function _settleRewards(uint256 id, address account) private returns (uint256 amount) {
        Pool storage p = pools[id];
        Stake storage u = stakes[id][account];
        _update(id, account);

        amount = u.rewards;
        if (amount == 0) return 0;
        if (amount > p.rewardReserves) amount = p.rewardReserves;
        if (amount == 0) return 0;
        u.rewards -= amount;
        if (p.rewardAccounting) {
            p.pendingRewards = p.pendingRewards < amount ? 0 : p.pendingRewards - amount;
        }
        p.rewardReserves -= amount;
    }

    function _creditStake(Pool storage p, Stake storage u, uint256 id, address account, uint128 received)
        private
        returns (uint64 unlockAt)
    {
        uint256 nextTotal = uint256(p.totalStaked) + uint256(received);
        if (nextTotal > type(uint128).max) revert CapExceeded();
        if (p.cap != 0 && nextTotal > p.cap) revert CapExceeded();

        if (u.amount == 0 && !_stakerIndexed[id][account]) {
            _stakerIndexed[id][account] = true;
            poolsByStaker[account].push(id);
        }

        _hydrateLots(id, account, u);
        unlockAt = _addLock(p.minLock);
        _pushLot(_lots[id][account], received, unlockAt);

        u.amount += received;
        // forge-lint: disable-next-line(unsafe-typecast)
        p.totalStaked = uint128(nextTotal);
        _syncUnlockAt(u, _lots[id][account]);
    }

    function _pushLot(Lot[] storage lots, uint128 amount, uint64 unlockAt) private {
        if (unlockAt <= block.timestamp) {
            uint256 n = lots.length;
            for (uint256 i; i < n; ++i) {
                if (lots[i].unlockAt <= block.timestamp) {
                    lots[i].amount += amount;
                    return;
                }
            }
        } else if (lots.length != 0 && lots[lots.length - 1].unlockAt == unlockAt) {
            lots[lots.length - 1].amount += amount;
            return;
        }

        if (lots.length >= MAX_LOTS) {
            uint256 idx = _latestLotIndex(lots);
            lots[idx].amount += amount;
            if (unlockAt > lots[idx].unlockAt) lots[idx].unlockAt = unlockAt;
            return;
        }

        lots.push(Lot({amount: amount, unlockAt: unlockAt}));
    }

    function _latestLotIndex(Lot[] storage lots) private view returns (uint256 idx) {
        uint64 latest = lots[0].unlockAt;
        uint256 n = lots.length;
        for (uint256 i = 1; i < n; ++i) {
            if (lots[i].unlockAt >= latest) {
                latest = lots[i].unlockAt;
                idx = i;
            }
        }
    }

    function _pullUnlocked(Lot[] storage lots, uint128 amount) private {
        uint128 remaining = amount;
        uint256 i;
        while (remaining != 0) {
            if (i >= lots.length) revert Locked();
            if (block.timestamp < lots[i].unlockAt) {
                unchecked {
                    ++i;
                }
                continue;
            }
            if (lots[i].amount <= remaining) {
                remaining -= lots[i].amount;
                lots[i] = lots[lots.length - 1];
                lots.pop();
            } else {
                lots[i].amount -= remaining;
                remaining = 0;
            }
        }
    }

    function _hydrateLots(uint256 id, address account, Stake storage u) private {
        Lot[] storage lots = _lots[id][account];
        if (lots.length == 0 && u.amount != 0) {
            lots.push(Lot({amount: u.amount, unlockAt: u.unlockAt}));
        }
    }

    function _unlockedAmount(Lot[] storage lots, Stake storage u) private view returns (uint128 free) {
        uint256 n = lots.length;
        if (n == 0) {
            if (u.amount != 0 && block.timestamp >= u.unlockAt) return u.amount;
            return 0;
        }
        for (uint256 i; i < n; ++i) {
            if (block.timestamp >= lots[i].unlockAt) free += lots[i].amount;
        }
    }

    function _syncUnlockAt(Stake storage u, Lot[] storage lots) private {
        uint64 next;
        uint256 n = lots.length;
        for (uint256 i; i < n; ++i) {
            uint64 lotUnlock = lots[i].unlockAt;
            if (block.timestamp < lotUnlock && (next == 0 || lotUnlock < next)) next = lotUnlock;
        }
        u.unlockAt = next;
    }

    function _assertCanEnter(Pool storage p) private view {
        if (protocolPaused || p.paused) revert Paused();
        if (p.expiresAt != 0 && block.timestamp >= p.expiresAt) revert PoolExpired();
    }

    function _update(uint256 id, address account) private {
        Pool storage p = pools[id];
        uint64 applicable = uint64(_lastTimeRewardApplicable(p));

        if (p.totalStaked == 0 && applicable > p.lastUpdate) {
            uint256 extended = uint256(p.periodFinish) + uint256(applicable - p.lastUpdate);
            p.periodFinish = extended > type(uint64).max ? type(uint64).max : uint64(extended);
        }

        p.rewardPerTokenStored = _rewardPerToken(p);
        if (applicable > p.lastUpdate) p.lastUpdate = applicable;
        if (account != address(0)) {
            Stake storage u = stakes[id][account];
            uint256 delta = (uint256(u.amount) * (p.rewardPerTokenStored - u.userRewardPerTokenPaid)) / PRECISION;
            u.rewards += delta;
            if (p.rewardAccounting) p.pendingRewards += delta;
            u.userRewardPerTokenPaid = p.rewardPerTokenStored;
        }
    }

    function _lastTimeRewardApplicable(Pool storage p) private view returns (uint256) {
        return block.timestamp < p.periodFinish ? block.timestamp : p.periodFinish;
    }

    function _rewardPerToken(Pool storage p) private view returns (uint256) {
        if (p.totalStaked == 0) return p.rewardPerTokenStored;
        uint256 last = _lastTimeRewardApplicable(p);
        if (last <= p.lastUpdate) return p.rewardPerTokenStored;
        return p.rewardPerTokenStored + ((last - p.lastUpdate) * p.rewardRate * PRECISION) / p.totalStaked;
    }

    function _addLock(uint64 minLock) private view returns (uint64) {
        uint256 end = uint256(block.timestamp) + uint256(minLock);
        if (end > type(uint64).max) revert InvalidLock();
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint64(end);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /// @dev Was 46. Seven slots used after the original three mappings.
    uint256[39] private __gap;
}
