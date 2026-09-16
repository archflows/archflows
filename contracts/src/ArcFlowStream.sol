// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {TokenLib} from "./lib/TokenLib.sol";

/// @title arcflows stream
/// @notice Streamflow-style vesting: linear/cliff/period unlock, cancel, transfer, top-up, batch.
/// @dev Immutable anti-dump locks stay in ArcFlow.sol. This contract is for allocations and payroll.
///      Deployed behind a UUPS proxy: the owner can change the logic, so treat the owner key as
///      able to reach every balance held here. ArcFlow.sol deliberately has no such switch.
contract ArcFlowStream is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    struct Stream {
        address token;
        address sender;
        address recipient;
        uint128 amount;
        uint128 withdrawn;
        /// @dev Amount already vested at the last rebase. Only `amount - vestedBase` accrues from `start`.
        uint128 vestedBase;
        /// @dev Accrual origin. Moves forward on top-up so new funds never vest retroactively.
        uint64 start;
        uint64 cliff;
        uint64 end;
        uint32 period;
        bool cancelable;
        bool transferable;
        bool canTopup;
        bool canceled;
    }

    struct CreateParams {
        address token;
        address recipient;
        uint128 amount;
        uint64 start;
        uint64 cliff;
        uint64 end;
        uint32 period;
        bool cancelable;
        bool transferable;
        bool canTopup;
    }

    uint256 public constant MAX_BATCH = 200;

    uint256 public nextId;
    mapping(uint256 => Stream) public streams;
    mapping(address => uint256[]) public streamsBySender;
    mapping(address => uint256[]) public streamsByRecipient;
    mapping(address => uint256[]) public streamsByToken;
    mapping(address => uint256) public totalLocked;

    error ZeroAddress();
    error ZeroAmount();
    error InvalidSchedule();
    error NotRecipient();
    error NotSender();
    error NothingToWithdraw();
    error NotCancelable();
    error NotTransferable();
    error NotTopupable();
    error SettleFirst();
    error BatchTooLarge();
    error AmountTooLarge();

    event Created(
        uint256 indexed id,
        address indexed token,
        address indexed recipient,
        address sender,
        uint128 amount,
        uint64 start,
        uint64 cliff,
        uint64 end,
        uint32 period,
        bool cancelable,
        bool transferable,
        bool canTopup
    );
    event Withdrawn(uint256 indexed id, address indexed recipient, uint128 amount);
    /// @param recipientClaimable Vested but not yet withdrawn. The recipient pulls it with `withdraw`.
    event CanceledStream(uint256 indexed id, uint128 recipientClaimable, uint128 refundedToSender);
    event Transferred(uint256 indexed id, address indexed from, address indexed to);
    event ToppedUp(uint256 indexed id, uint128 added, uint128 newAmount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address owner_) external initializer {
        __Ownable_init(owner_);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
    }

    function create(CreateParams calldata p) external nonReentrant returns (uint256 id) {
        id = _create(p, msg.sender);
    }

    function createBatch(CreateParams[] calldata ps) external nonReentrant returns (uint256[] memory ids) {
        uint256 n = ps.length;
        if (n == 0) revert ZeroAmount();
        if (n > MAX_BATCH) revert BatchTooLarge();
        ids = new uint256[](n);
        for (uint256 i; i < n; i++) {
            ids[i] = _create(ps[i], msg.sender);
        }
    }

    function withdraw(uint256 id) external nonReentrant returns (uint128 amount) {
        Stream storage s = streams[id];
        if (msg.sender != s.recipient) revert NotRecipient();

        uint128 vested = _streamed(s, uint64(block.timestamp));
        if (vested <= s.withdrawn) revert NothingToWithdraw();

        amount = vested - s.withdrawn;
        s.withdrawn = vested;
        totalLocked[s.token] -= amount;

        TokenLib.push(s.token, s.recipient, amount);
        emit Withdrawn(id, s.recipient, amount);
    }

    /// @notice Ends the stream and refunds the unvested remainder to the sender.
    /// @dev Only the sender is paid here. The recipient's vested share stays claimable through
    ///      `withdraw`, so a recipient that cannot receive tokens (for example a blocked USDC
    ///      address) can never trap the sender's refund.
    function cancel(uint256 id) external nonReentrant returns (uint128 recipientClaimable, uint128 refundedToSender) {
        Stream storage s = streams[id];
        if (msg.sender != s.sender) revert NotSender();
        if (!s.cancelable || s.canceled) revert NotCancelable();

        uint64 nowTs = uint64(block.timestamp);
        uint128 vested = _streamed(s, nowTs);
        refundedToSender = s.amount - vested;
        recipientClaimable = vested - s.withdrawn;

        s.canceled = true;
        s.amount = vested;
        s.end = nowTs;
        if (s.cliff > nowTs) s.cliff = nowTs;
        if (s.start > nowTs) s.start = nowTs;
        if (s.vestedBase > vested) s.vestedBase = vested;

        totalLocked[s.token] -= refundedToSender;
        TokenLib.push(s.token, s.sender, refundedToSender);
        emit CanceledStream(id, recipientClaimable, refundedToSender);
    }

    /// @dev The recipient must withdraw everything vested first, otherwise the transfer would
    ///      hand their already-earned balance to someone else.
    function transferRecipient(uint256 id, address newRecipient) external {
        if (newRecipient == address(0)) revert ZeroAddress();
        Stream storage s = streams[id];
        if (msg.sender != s.recipient) revert NotRecipient();
        if (!s.transferable || s.canceled) revert NotTransferable();
        if (newRecipient == s.recipient) revert NotTransferable();
        if (_streamed(s, uint64(block.timestamp)) > s.withdrawn) revert SettleFirst();

        address from = s.recipient;
        s.recipient = newRecipient;
        streamsByRecipient[newRecipient].push(id);
        emit Transferred(id, from, newRecipient);
    }

    /// @notice Adds funds to a live stream. The new amount vests from now to `end`.
    /// @dev Vesting is rebased so topping up never makes past time unlock the fresh deposit.
    function topUp(uint256 id, uint128 amount) external nonReentrant returns (uint128 added) {
        Stream storage s = streams[id];
        if (msg.sender != s.sender) revert NotSender();
        if (!s.canTopup || s.canceled) revert NotTopupable();
        if (amount == 0) revert ZeroAmount();

        uint64 nowTs = uint64(block.timestamp);
        if (nowTs >= s.end) revert InvalidSchedule();

        uint128 vested = _streamed(s, nowTs);
        added = TokenLib.pull128(s.token, msg.sender, amount);

        uint256 next = uint256(s.amount) + uint256(added);
        if (next > type(uint128).max) revert AmountTooLarge();

        s.vestedBase = vested;
        if (s.start < nowTs) s.start = nowTs;
        // forge-lint: disable-next-line(unsafe-typecast)
        s.amount = uint128(next);
        totalLocked[s.token] += added;
        emit ToppedUp(id, added, s.amount);
    }

    function withdrawable(uint256 id) external view returns (uint128) {
        Stream storage s = streams[id];
        uint128 vested = _streamed(s, uint64(block.timestamp));
        if (vested <= s.withdrawn) return 0;
        return vested - s.withdrawn;
    }

    function streamed(uint256 id) external view returns (uint128) {
        return _streamed(streams[id], uint64(block.timestamp));
    }

    function senderStreamCount(address sender) external view returns (uint256) {
        return streamsBySender[sender].length;
    }

    function recipientStreamCount(address recipient) external view returns (uint256) {
        return streamsByRecipient[recipient].length;
    }

    function tokenStreamCount(address token) external view returns (uint256) {
        return streamsByToken[token].length;
    }

    /// @dev `start` may be backdated so an allocation can begin partly vested. `end` must still be
    ///      in the future, so a stream can never be created fully unlocked.
    function _create(CreateParams calldata p, address sender) internal returns (uint256 id) {
        if (p.token == address(0) || p.recipient == address(0)) revert ZeroAddress();
        if (p.amount == 0) revert ZeroAmount();

        uint64 start = p.start == 0 ? uint64(block.timestamp) : p.start;
        uint64 cliff = p.cliff == 0 ? start : p.cliff;
        uint32 period = p.period == 0 ? 1 : p.period;
        if (cliff < start || p.end < cliff) revert InvalidSchedule();
        if (p.end <= block.timestamp) revert InvalidSchedule();

        uint128 received = TokenLib.pull128(p.token, sender, p.amount);

        id = nextId++;
        streams[id] = Stream({
            token: p.token,
            sender: sender,
            recipient: p.recipient,
            amount: received,
            withdrawn: 0,
            vestedBase: 0,
            start: start,
            cliff: cliff,
            end: p.end,
            period: period,
            cancelable: p.cancelable,
            transferable: p.transferable,
            canTopup: p.canTopup,
            canceled: false
        });

        streamsBySender[sender].push(id);
        streamsByRecipient[p.recipient].push(id);
        streamsByToken[p.token].push(id);
        totalLocked[p.token] += received;

        emit Created(
            id,
            p.token,
            p.recipient,
            sender,
            received,
            start,
            cliff,
            p.end,
            period,
            p.cancelable,
            p.transferable,
            p.canTopup
        );
    }

    function _streamed(Stream storage s, uint64 timestamp) internal view returns (uint128) {
        if (s.amount == 0 || timestamp < s.cliff) return 0;
        if (timestamp >= s.end) return s.amount;

        uint128 base = s.vestedBase;
        uint256 accruing = uint256(s.amount) - uint256(base);
        if (accruing == 0) return base;

        uint256 duration = uint256(s.end) - uint256(s.start);
        if (duration == 0) return s.amount;

        uint256 elapsed = uint256(timestamp) - uint256(s.start);
        if (s.period > 1) {
            // Flooring to whole periods is the point: unlocks land on schedule, not per second.
            // forge-lint: disable-next-line(divide-before-multiply)
            elapsed = (elapsed / uint256(s.period)) * uint256(s.period);
        }
        if (elapsed == 0) return base;

        // Elapsed is strictly below duration here, so the product stays under `accruing`.
        // forge-lint: disable-next-line(unsafe-typecast)
        return base + uint128((accruing * elapsed) / duration);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /// @dev Reserved so later versions can add state without shifting existing slots.
    uint256[45] private __gap;
}
