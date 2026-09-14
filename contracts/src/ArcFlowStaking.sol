// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {TokenLib} from "./lib/TokenLib.sol";

/// @title ArcFlowStaking
/// @notice Staking-as-a-service: anyone creates a pool, funds rewards, users stake (Streamflow Staking).
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
    }

    struct Stake {
        uint128 amount;
        uint256 rewards;
        uint256 userRewardPerTokenPaid;
        uint64 unlockAt;
    }

    uint256 public constant PRECISION = 1e18;

    uint256 public nextId;
    mapping(uint256 => Pool) public pools;
    mapping(uint256 => mapping(address => Stake)) public stakes;

    error ZeroAddress();
    error ZeroAmount();
    error NotOwner();
    error Locked();
    error NothingToWithdraw();
    error NothingToClaim();

    event PoolCreated(
        uint256 indexed id, address indexed stakeToken, address indexed rewardToken, address owner, uint64 minLock
    );
    event RewardFunded(uint256 indexed id, uint256 amount, uint64 duration, uint256 rewardRate, uint64 periodFinish);
    event Staked(uint256 indexed id, address indexed account, uint128 amount);
    event Unstaked(uint256 indexed id, address indexed account, uint128 amount);
    event RewardPaid(uint256 indexed id, address indexed account, uint256 amount);

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
            minLock: minLock
        });
        emit PoolCreated(id, stakeToken, rewardToken, msg.sender, minLock);
    }

    function fund(uint256 id, uint256 amount, uint64 duration) external nonReentrant {
        Pool storage p = pools[id];
        if (msg.sender != p.owner) revert NotOwner();
        if (amount == 0 || duration == 0) revert ZeroAmount();

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
        p.periodFinish = uint64(block.timestamp + duration);
        emit RewardFunded(id, received, duration, p.rewardRate, p.periodFinish);
    }

    function stake(uint256 id, uint128 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        Pool storage p = pools[id];
        Stake storage u = stakes[id][msg.sender];
        _update(id, msg.sender);

        uint128 received = TokenLib.pull128(p.stakeToken, msg.sender, amount);
        u.amount += received;
        p.totalStaked += received;
        uint64 unlockAt = uint64(block.timestamp) + p.minLock;
        if (unlockAt > u.unlockAt) u.unlockAt = unlockAt;

        emit Staked(id, msg.sender, received);
    }

    function unstake(uint256 id, uint128 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        Pool storage p = pools[id];
        Stake storage u = stakes[id][msg.sender];
        if (block.timestamp < u.unlockAt) revert Locked();
        if (amount > u.amount) revert NothingToWithdraw();

        _update(id, msg.sender);
        u.amount -= amount;
        p.totalStaked -= amount;
        TokenLib.push(p.stakeToken, msg.sender, amount);
        emit Unstaked(id, msg.sender, amount);
    }

    function getReward(uint256 id) external nonReentrant returns (uint256 amount) {
        amount = _payout(id, msg.sender);
        if (amount == 0) revert NothingToClaim();
    }

    function exit(uint256 id) external nonReentrant {
        Pool storage p = pools[id];
        Stake storage u = stakes[id][msg.sender];
        if (block.timestamp < u.unlockAt) revert Locked();

        _update(id, msg.sender);
        uint128 stakedAmount = u.amount;
        u.amount = 0;
        p.totalStaked -= stakedAmount;

        TokenLib.push(p.stakeToken, msg.sender, stakedAmount);
        if (stakedAmount != 0) emit Unstaked(id, msg.sender, stakedAmount);

        uint256 reward = _payout(id, msg.sender);
        if (stakedAmount == 0 && reward == 0) revert NothingToWithdraw();
    }

    function earned(uint256 id, address account) public view returns (uint256) {
        Pool storage p = pools[id];
        Stake storage u = stakes[id][account];
        return u.rewards + (uint256(u.amount) * (_rewardPerToken(p) - u.userRewardPerTokenPaid)) / PRECISION;
    }

    function rewardPerToken(uint256 id) external view returns (uint256) {
        return _rewardPerToken(pools[id]);
    }

    function _payout(uint256 id, address account) private returns (uint256 amount) {
        Pool storage p = pools[id];
        Stake storage u = stakes[id][account];
        _update(id, account);

        amount = u.rewards;
        if (amount == 0) return 0;
        // Pay at most what is funded and keep the shortfall owed, never silently burn it.
        if (amount > p.rewardReserves) amount = p.rewardReserves;
        if (amount == 0) return 0;
        u.rewards -= amount;
        p.rewardReserves -= amount;
        TokenLib.push(p.rewardToken, account, amount);
        emit RewardPaid(id, account, amount);
    }

    function _update(uint256 id, address account) private {
        Pool storage p = pools[id];
        uint64 applicable = uint64(_lastTimeRewardApplicable(p));

        // With no stakers nobody can accrue, so push the schedule out by the idle window instead of
        // letting those rewards become permanently unallocated.
        if (p.totalStaked == 0 && applicable > p.lastUpdate) {
            p.periodFinish += applicable - p.lastUpdate;
        }

        p.rewardPerTokenStored = _rewardPerToken(p);
        if (applicable > p.lastUpdate) p.lastUpdate = applicable;
        if (account != address(0)) {
            Stake storage u = stakes[id][account];
            u.rewards =
                u.rewards + (uint256(u.amount) * (p.rewardPerTokenStored - u.userRewardPerTokenPaid)) / PRECISION;
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

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /// @dev Reserved so later versions can add state without shifting existing slots.
    uint256[46] private __gap;
}
