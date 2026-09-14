// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ArcFlowStream} from "../src/ArcFlowStream.sol";
import {Deployers} from "./helpers/Deployers.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ArcFlowStreamTest is Test {
    ArcFlowStream stream;
    MockERC20 token;

    address sender = makeAddr("sender");
    address recipient = makeAddr("recipient");
    address other = makeAddr("other");

    uint128 constant AMOUNT = 1_000_000e18;

    function setUp() public {
        vm.warp(1_700_000_000);
        stream = Deployers.stream(address(this));
        token = new MockERC20(0);
        token.mint(sender, AMOUNT * 20);
        vm.prank(sender);
        token.approve(address(stream), type(uint256).max);
    }

    function _linear(uint64 duration, bool cancelable, bool transferable, bool canTopup) internal returns (uint256 id) {
        uint64 nowTs = uint64(block.timestamp);
        vm.prank(sender);
        id = stream.create(
            ArcFlowStream.CreateParams({
                token: address(token),
                recipient: recipient,
                amount: AMOUNT,
                start: nowTs,
                cliff: nowTs,
                end: nowTs + duration,
                period: 1,
                cancelable: cancelable,
                transferable: transferable,
                canTopup: canTopup
            })
        );
    }

    function test_LinearRelease() public {
        uint256 id = _linear(100 days, false, false, false);
        skip(25 days);
        assertEq(stream.withdrawable(id), AMOUNT / 4);
        vm.prank(recipient);
        stream.withdraw(id);
        assertEq(token.balanceOf(recipient), AMOUNT / 4);
        skip(75 days);
        vm.prank(recipient);
        stream.withdraw(id);
        assertEq(token.balanceOf(recipient), AMOUNT);
    }

    function test_CliffThenPeriodUnlock() public {
        uint64 nowTs = uint64(block.timestamp);
        vm.prank(sender);
        uint256 id = stream.create(
            ArcFlowStream.CreateParams({
                token: address(token),
                recipient: recipient,
                amount: AMOUNT,
                start: nowTs,
                cliff: nowTs + 30 days,
                end: nowTs + 120 days,
                period: uint32(30 days),
                cancelable: false,
                transferable: false,
                canTopup: false
            })
        );

        skip(29 days);
        assertEq(stream.withdrawable(id), 0);
        skip(1 days);
        // 30 days elapsed, period 30d → one step = 30/120
        assertEq(stream.withdrawable(id), AMOUNT / 4);
        skip(15 days);
        assertEq(stream.withdrawable(id), AMOUNT / 4, "no partial period");
        skip(15 days);
        assertEq(stream.withdrawable(id), AMOUNT / 2);
    }

    function test_CancelRefundsSenderAndLeavesRecipientToPull() public {
        uint256 id = _linear(100 days, true, false, false);
        skip(25 days);

        vm.prank(other);
        vm.expectRevert(ArcFlowStream.NotSender.selector);
        stream.cancel(id);

        vm.prank(sender);
        (uint128 claimable, uint128 toSender) = stream.cancel(id);
        assertEq(claimable, AMOUNT / 4);
        assertEq(toSender, (AMOUNT * 3) / 4);
        assertEq(token.balanceOf(sender), AMOUNT * 20 - AMOUNT + toSender);

        // Nothing is pushed to the recipient during cancel; they pull it themselves.
        assertEq(token.balanceOf(recipient), 0);
        assertEq(stream.withdrawable(id), AMOUNT / 4);

        vm.prank(recipient);
        stream.withdraw(id);
        assertEq(token.balanceOf(recipient), AMOUNT / 4);
        assertEq(stream.withdrawable(id), 0);
    }

    function test_CancelCannotRunTwice() public {
        uint256 id = _linear(100 days, true, false, false);
        skip(10 days);
        vm.prank(sender);
        stream.cancel(id);
        vm.prank(sender);
        vm.expectRevert(ArcFlowStream.NotCancelable.selector);
        stream.cancel(id);
    }

    function test_CancelRejectedWhenFlagOff() public {
        uint256 id = _linear(100 days, false, false, false);
        vm.prank(sender);
        vm.expectRevert(ArcFlowStream.NotCancelable.selector);
        stream.cancel(id);
    }

    function test_TransferRecipientRequiresSettlingFirst() public {
        uint256 id = _linear(100 days, false, true, false);
        skip(50 days);

        vm.prank(recipient);
        vm.expectRevert(ArcFlowStream.SettleFirst.selector);
        stream.transferRecipient(id, other);
    }

    function test_TransferRecipient() public {
        uint256 id = _linear(100 days, false, true, false);
        skip(50 days);

        // The outgoing recipient keeps what they already earned.
        vm.prank(recipient);
        stream.withdraw(id);
        vm.prank(recipient);
        stream.transferRecipient(id, other);

        skip(50 days);

        vm.prank(recipient);
        vm.expectRevert(ArcFlowStream.NotRecipient.selector);
        stream.withdraw(id);

        vm.prank(other);
        stream.withdraw(id);
        assertEq(token.balanceOf(recipient), AMOUNT / 2);
        assertEq(token.balanceOf(other), AMOUNT / 2);
        assertEq(stream.recipientStreamCount(other), 1);
    }

    function test_TopUpDoesNotVestNewFundsRetroactively() public {
        uint256 id = _linear(100 days, false, false, true);
        skip(90 days);
        assertEq(stream.withdrawable(id), (AMOUNT * 90) / 100);

        vm.prank(sender);
        stream.topUp(id, AMOUNT);

        (,,, uint128 amount,,,,,,,,,,) = stream.streams(id);
        assertEq(amount, AMOUNT * 2);

        // The fresh deposit starts vesting now, so the claimable figure must not jump.
        assertEq(stream.withdrawable(id), (AMOUNT * 90) / 100, "top-up must not unlock past time");

        // It vests over the remaining window instead.
        skip(5 days);
        assertEq(stream.withdrawable(id), (AMOUNT * 90) / 100 + (AMOUNT * 11) / 20);
        skip(5 days);
        assertEq(stream.withdrawable(id), AMOUNT * 2);
    }

    function test_BatchCreate() public {
        uint64 nowTs = uint64(block.timestamp);
        ArcFlowStream.CreateParams[] memory ps = new ArcFlowStream.CreateParams[](2);
        ps[0] = ArcFlowStream.CreateParams({
            token: address(token),
            recipient: recipient,
            amount: AMOUNT,
            start: nowTs,
            cliff: nowTs,
            end: nowTs + 10 days,
            period: 1,
            cancelable: false,
            transferable: false,
            canTopup: false
        });
        ps[1] = ArcFlowStream.CreateParams({
            token: address(token),
            recipient: other,
            amount: AMOUNT,
            start: nowTs,
            cliff: nowTs,
            end: nowTs + 10 days,
            period: 1,
            cancelable: false,
            transferable: false,
            canTopup: false
        });
        vm.prank(sender);
        uint256[] memory ids = stream.createBatch(ps);
        assertEq(ids.length, 2);
        assertEq(stream.senderStreamCount(sender), 2);
        assertEq(stream.tokenStreamCount(address(token)), 2);
    }

    function test_OnlyRecipientWithdraws() public {
        uint256 id = _linear(1 days, false, false, false);
        skip(1 days);
        vm.prank(sender);
        vm.expectRevert(ArcFlowStream.NotRecipient.selector);
        stream.withdraw(id);
    }
}
