// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ArcFlowStream} from "./ArcFlowStream.sol";
import {MerkleProof} from "./lib/MerkleProof.sol";
import {TokenLib} from "./lib/TokenLib.sol";

/// @title ArcFlowDistributor
/// @notice Merkle airdrops with optional vesting into ArcFlowStream (Streamflow Distributor).
/// @dev A campaign is immutable once created. The funder cannot pause claims or pull funds back
///      before `claimEnd`, otherwise the airdrop would carry no guarantee for recipients.
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
    }

    ArcFlowStream public stream;

    uint256 public nextId;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(uint256 => uint256)) public claimedBitMap;

    error ZeroAddress();
    error ZeroAmount();
    error InvalidWindow();
    error InvalidVest();
    error NotFunder();
    error TooEarly();
    error TooLate();
    error AlreadyClaimed();
    error InvalidProof();
    error ExceedsDeposit();
    error NothingToClawback();

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
    event Claimed(uint256 indexed id, uint256 index, address indexed account, uint128 amount, uint256 streamId);
    event ClawedBack(uint256 indexed id, uint128 amount);

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
        if (token == address(0)) revert ZeroAddress();
        if (merkleRoot == bytes32(0) || amount == 0) revert ZeroAmount();
        if (claimStart == 0) claimStart = uint64(block.timestamp);
        if (claimEnd <= claimStart) revert InvalidWindow();
        if (vestDuration > 0 && vestCliffDelay > vestDuration) revert InvalidVest();

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
            vestCliffDelay: vestCliffDelay
        });

        emit CampaignCreated(
            id, token, msg.sender, merkleRoot, received, claimStart, claimEnd, vestDuration, vestCliffDelay
        );
    }

    function claim(uint256 id, uint256 index, address account, uint128 amount, bytes32[] calldata proof)
        external
        nonReentrant
        returns (uint256 streamId)
    {
        Campaign storage c = campaigns[id];
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
            TokenLib.push(c.token, account, amount);
            emit Claimed(id, index, account, amount, 0);
            return 0;
        }

        TokenLib.approve(c.token, address(stream), amount);
        uint64 start = uint64(block.timestamp);
        streamId = stream.create(
            ArcFlowStream.CreateParams({
                token: c.token,
                recipient: account,
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
        emit Claimed(id, index, account, amount, streamId);
    }

    /// @notice Returns unclaimed tokens to the funder, only once the claim window has closed.
    function clawback(uint256 id) external nonReentrant returns (uint128 amount) {
        Campaign storage c = campaigns[id];
        if (msg.sender != c.funder) revert NotFunder();
        if (block.timestamp < c.claimEnd) revert TooEarly();

        amount = c.deposited - c.claimed;
        if (amount == 0) revert NothingToClawback();

        c.deposited = c.claimed;
        TokenLib.push(c.token, c.funder, amount);
        emit ClawedBack(id, amount);
    }

    function isClaimed(uint256 id, uint256 index) public view returns (bool) {
        uint256 wordIndex = index / 256;
        // forge-lint: disable-next-line(incorrect-shift)
        uint256 bit = 1 << (index % 256);
        return claimedBitMap[id][wordIndex] & bit != 0;
    }

    function _setClaimed(uint256 id, uint256 index) private {
        uint256 wordIndex = index / 256;
        // forge-lint: disable-next-line(incorrect-shift)
        uint256 bit = 1 << (index % 256);
        claimedBitMap[id][wordIndex] |= bit;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /// @dev Reserved so later versions can add state without shifting existing slots.
    uint256[46] private __gap;
}
