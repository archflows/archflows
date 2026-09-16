// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ArcFlowStream} from "./ArcFlowStream.sol";
import {MerkleProof} from "./lib/MerkleProof.sol";
import {TokenLib} from "./lib/TokenLib.sol";

/// @title arcflows airdrop
/// @notice Merkle airdrops with optional vesting into the stream module.
/// @dev A live claim window is immutable for recipients: no pause, no mid-window clawback.
///      The protocol owner can still upgrade this UUPS proxy — keep that key on a multisig.
contract ArcFlowDistributor is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    struct Campaign {
        address token;
        address funder;
        bytes32 merkleRoot;
        uint128 deposited;
        uint128 claimed;
        uint64 claimStart;
        uint64 claimEnd;
        uint64 vestDuration;
        uint64 vestCliffDelay;
        bool canceled;
    }

    uint64 public constant MIN_WINDOW = 1 hours;
    uint64 public constant MAX_WINDOW = 3650 days;
    uint64 public constant MAX_VEST_DURATION = 3650 days;
    uint64 public constant MIN_VEST_DURATION = 1 minutes;
    uint64 public constant MAX_START_DELAY = 365 days;

    ArcFlowStream public stream;

    uint256 public nextId;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(uint256 => uint256)) public claimedBitMap;

    address public pendingOwner;
    bool public protocolPaused;
    mapping(address => uint256[]) public campaignsByFunder;
    mapping(address => uint256[]) public campaignsByToken;

    error ZeroAddress();
    error ZeroAmount();
    error InvalidWindow();
    error InvalidVest();
    error NotFunder();
    error NotRecipient();
    error NotOwner();
    error TooEarly();
    error TooLate();
    error AlreadyClaimed();
    error InvalidProof();
    error ExceedsDeposit();
    error NothingToClawback();
    error Paused();
    error Canceled();

    event CampaignCreated(
        uint256 indexed id,
        address indexed token,
        address indexed funder,
        bytes32 merkleRoot,
        uint128 deposited,
        uint64 claimStart,
        uint64 claimEnd,
        uint64 vestDuration,
        uint64 vestCliffDelay
    );
    event Claimed(
        uint256 indexed id,
        uint256 index,
        address indexed account,
        address indexed receiver,
        uint128 amount,
        uint256 streamId
    );
    event ClawedBack(uint256 indexed id, uint128 amount);
    event ToppedUp(uint256 indexed id, uint128 received, uint128 deposited);
    event CampaignCanceled(uint256 indexed id, uint128 refunded);
    event ProtocolPaused(bool paused);
    event ProtocolOwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address owner_, ArcFlowStream stream_) external initializer {
        if (address(stream_) == address(0)) revert ZeroAddress();
        __Ownable_init(owner_);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        stream = stream_;
    }

    function createCampaign(
        address token,
        bytes32 merkleRoot,
        uint128 amount,
        uint64 claimStart,
        uint64 claimEnd,
        uint64 vestDuration,
        uint64 vestCliffDelay
    ) external nonReentrant returns (uint256 id) {
        if (protocolPaused) revert Paused();
        if (token == address(0)) revert ZeroAddress();
        if (merkleRoot == bytes32(0) || amount == 0) revert ZeroAmount();
        if (claimStart == 0) claimStart = uint64(block.timestamp);
        if (claimStart < block.timestamp) revert InvalidWindow();
        if (claimStart - uint64(block.timestamp) > MAX_START_DELAY) revert InvalidWindow();
        if (claimEnd <= claimStart) revert InvalidWindow();
        uint64 window = claimEnd - claimStart;
        if (window < MIN_WINDOW || window > MAX_WINDOW) revert InvalidWindow();
        if (vestDuration != 0) {
            if (vestDuration < MIN_VEST_DURATION || vestDuration > MAX_VEST_DURATION) revert InvalidVest();
            if (vestCliffDelay > vestDuration) revert InvalidVest();
        } else if (vestCliffDelay != 0) {
            revert InvalidVest();
        }

        uint128 received = TokenLib.pull128(token, msg.sender, amount);

        id = nextId++;
        campaigns[id] = Campaign({
            token: token,
            funder: msg.sender,
            merkleRoot: merkleRoot,
            deposited: received,
            claimed: 0,
            claimStart: claimStart,
            claimEnd: claimEnd,
            vestDuration: vestDuration,
            vestCliffDelay: vestCliffDelay,
            canceled: false
        });
        campaignsByFunder[msg.sender].push(id);
        campaignsByToken[token].push(id);

        emit CampaignCreated(
            id, token, msg.sender, merkleRoot, received, claimStart, claimEnd, vestDuration, vestCliffDelay
        );
    }

    /// @notice Claims for `account`. Anyone may pay gas; tokens always go to `account`.
    function claim(uint256 id, uint256 index, address account, uint128 amount, bytes32[] calldata proof)
        external
        nonReentrant
        returns (uint256 streamId)
    {
        streamId = _claim(id, index, account, amount, proof, account);
    }

    /// @notice Merkle account redirects the drop (denylist / new wallet). Only `account` may call.
    function claimTo(
        uint256 id,
        uint256 index,
        address account,
        uint128 amount,
        bytes32[] calldata proof,
        address receiver
    ) external nonReentrant returns (uint256 streamId) {
        if (msg.sender != account) revert NotRecipient();
        if (receiver == address(0)) revert ZeroAddress();
        streamId = _claim(id, index, account, amount, proof, receiver);
    }

    /// @notice Funder adds tokens if the tree was underfunded. Does not change the merkle root.
    function topUp(uint256 id, uint128 amount) external nonReentrant returns (uint128 received) {
        if (protocolPaused) revert Paused();
        if (amount == 0) revert ZeroAmount();
        Campaign storage c = campaigns[id];
        if (msg.sender != c.funder) revert NotFunder();
        if (c.canceled) revert Canceled();
        if (block.timestamp >= c.claimEnd) revert TooLate();

        received = TokenLib.pull128(c.token, msg.sender, amount);
        c.deposited += received;
        emit ToppedUp(id, received, c.deposited);
    }

    /// @notice Abort before the window opens. After `claimStart`, the drop is recipient-locked.
    function cancel(uint256 id) external nonReentrant returns (uint128 amount) {
        Campaign storage c = campaigns[id];
        if (msg.sender != c.funder) revert NotFunder();
        if (c.canceled) revert Canceled();
        if (block.timestamp >= c.claimStart) revert TooLate();
        if (c.claimed != 0) revert TooLate();

        amount = c.deposited;
        if (amount == 0) revert NothingToClawback();
        c.deposited = 0;
        c.canceled = true;
        TokenLib.push(c.token, c.funder, amount);
        emit CampaignCanceled(id, amount);
    }

    /// @notice Returns unclaimed tokens to the funder after the claim window closes.
    function clawback(uint256 id) external nonReentrant returns (uint128 amount) {
        Campaign storage c = campaigns[id];
        if (msg.sender != c.funder) revert NotFunder();
        if (c.canceled) revert Canceled();
        if (block.timestamp < c.claimEnd) revert TooEarly();

        amount = c.deposited - c.claimed;
        if (amount == 0) revert NothingToClawback();

        c.deposited = c.claimed;
        TokenLib.push(c.token, c.funder, amount);
        emit ClawedBack(id, amount);
    }

    function setProtocolPaused(bool paused_) external onlyOwner {
        protocolPaused = paused_;
        emit ProtocolPaused(paused_);
    }

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

    function isClaimed(uint256 id, uint256 index) public view returns (bool) {
        uint256 wordIndex = index / 256;
        // forge-lint: disable-next-line(incorrect-shift)
        uint256 bit = 1 << (index % 256);
        return claimedBitMap[id][wordIndex] & bit != 0;
    }

    function unclaimed(uint256 id) external view returns (uint128) {
        Campaign storage c = campaigns[id];
        return c.deposited - c.claimed;
    }

    function funderCampaignCount(address funder) external view returns (uint256) {
        return campaignsByFunder[funder].length;
    }

    function tokenCampaignCount(address token) external view returns (uint256) {
        return campaignsByToken[token].length;
    }

    function _claim(
        uint256 id,
        uint256 index,
        address account,
        uint128 amount,
        bytes32[] calldata proof,
        address receiver
    ) private returns (uint256 streamId) {
        Campaign storage c = campaigns[id];
        if (c.canceled) revert Canceled();
        if (block.timestamp < c.claimStart) revert TooEarly();
        if (block.timestamp >= c.claimEnd) revert TooLate();
        if (isClaimed(id, index)) revert AlreadyClaimed();
        if (amount == 0) revert ZeroAmount();

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(index, account, amount))));
        if (!MerkleProof.verify(proof, c.merkleRoot, leaf)) revert InvalidProof();
        if (uint256(c.claimed) + uint256(amount) > uint256(c.deposited)) revert ExceedsDeposit();

        _setClaimed(id, index);
        c.claimed += amount;

        if (c.vestDuration == 0) {
            TokenLib.push(c.token, receiver, amount);
            emit Claimed(id, index, account, receiver, amount, 0);
            return 0;
        }

        TokenLib.approve(c.token, address(stream), amount);
        uint64 start = uint64(block.timestamp);
        streamId = stream.create(
            ArcFlowStream.CreateParams({
                token: c.token,
                recipient: receiver,
                amount: amount,
                start: start,
                cliff: start + c.vestCliffDelay,
                end: start + c.vestDuration,
                period: 1,
                cancelable: false,
                transferable: true,
                canTopup: false
            })
        );
        TokenLib.approve(c.token, address(stream), 0);
        emit Claimed(id, index, account, receiver, amount, streamId);
    }

    function _setClaimed(uint256 id, uint256 index) private {
        uint256 wordIndex = index / 256;
        // forge-lint: disable-next-line(incorrect-shift)
        uint256 bit = 1 << (index % 256);
        claimedBitMap[id][wordIndex] |= bit;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /// @dev Was 46. Four slots used: pendingOwner, protocolPaused, campaignsByFunder, campaignsByToken.
    uint256[42] private __gap;
}
