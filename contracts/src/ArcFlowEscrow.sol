// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {TokenLib} from "./lib/TokenLib.sol";

/// @title arcflows escrow
/// @notice Peer-to-peer funded escrow with buyer release and timeout refund (Streamflow Escrow).
contract ArcFlowEscrow is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    enum Status {
        Empty,
        Funded,
        Released,
        Refunded
    }

    struct Deal {
        address token;
        address buyer;
        address seller;
        uint128 amount;
        uint64 unlockAt;
        bytes32 termsHash;
        Status status;
    }

    /// @dev Upper bound so a deal can never be written with a refund date beyond a human horizon.
    uint64 public constant MAX_TIMEOUT = 3650 days;

    uint256 public nextId;
    mapping(uint256 => Deal) public deals;
    mapping(address => uint256[]) public dealsByBuyer;
    mapping(address => uint256[]) public dealsBySeller;

    error ZeroAddress();
    error ZeroAmount();
    error InvalidTimeout();
    error NotBuyer();
    error NotParty();
    error BadStatus();
    error TooEarly();

    event Created(
        uint256 indexed id,
        address indexed token,
        address indexed buyer,
        address seller,
        uint128 amount,
        uint64 unlockAt,
        bytes32 termsHash
    );
    event Released(uint256 indexed id, address indexed seller, uint128 amount);
    event Refunded(uint256 indexed id, address indexed buyer, uint128 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address owner_) external initializer {
        __Ownable_init(owner_);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
    }

    /// @param timeout Seconds until the buyer can refund without seller consent. Must be set, so a
    ///        silent seller can never leave the buyer with paying as the only way out.
    function create(address token, address seller, uint128 amount, uint64 timeout, bytes32 termsHash)
        external
        nonReentrant
        returns (uint256 id)
    {
        if (token == address(0) || seller == address(0)) revert ZeroAddress();
        if (seller == msg.sender) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (timeout == 0 || timeout > MAX_TIMEOUT) revert InvalidTimeout();

        uint128 received = TokenLib.pull128(token, msg.sender, amount);
        uint64 unlockAt = uint64(block.timestamp) + timeout;

        id = nextId++;
        deals[id] = Deal({
            token: token,
            buyer: msg.sender,
            seller: seller,
            amount: received,
            unlockAt: unlockAt,
            termsHash: termsHash,
            status: Status.Funded
        });

        dealsByBuyer[msg.sender].push(id);
        dealsBySeller[seller].push(id);
        emit Created(id, token, msg.sender, seller, received, unlockAt, termsHash);
    }

    function release(uint256 id) external nonReentrant {
        Deal storage d = deals[id];
        if (msg.sender != d.buyer) revert NotBuyer();
        if (d.status != Status.Funded) revert BadStatus();

        d.status = Status.Released;
        TokenLib.push(d.token, d.seller, d.amount);
        emit Released(id, d.seller, d.amount);
    }

    /// @notice Seller can refund anytime. Buyer can refund after `unlockAt`.
    function refund(uint256 id) external nonReentrant {
        Deal storage d = deals[id];
        if (d.status != Status.Funded) revert BadStatus();

        if (msg.sender == d.seller) {
            // seller walks away
        } else if (msg.sender == d.buyer) {
            if (block.timestamp < d.unlockAt) revert TooEarly();
        } else {
            revert NotParty();
        }

        d.status = Status.Refunded;
        TokenLib.push(d.token, d.buyer, d.amount);
        emit Refunded(id, d.buyer, d.amount);
    }

    function buyerDealCount(address buyer) external view returns (uint256) {
        return dealsByBuyer[buyer].length;
    }

    function sellerDealCount(address seller) external view returns (uint256) {
        return dealsBySeller[seller].length;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /// @dev Reserved so later versions can add state without shifting existing slots.
    uint256[46] private __gap;
}
