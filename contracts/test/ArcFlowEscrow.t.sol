// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ArcFlowEscrow} from "../src/ArcFlowEscrow.sol";
import {Deployers} from "./helpers/Deployers.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ArcFlowEscrowTest is Test {
    ArcFlowEscrow escrow;
    MockERC20 token;

    address buyer = makeAddr("buyer");
    address seller = makeAddr("seller");
    address other = makeAddr("other");

    uint128 constant AMOUNT = 500e18;

    function setUp() public {
        vm.warp(1_700_000_000);
        escrow = Deployers.escrow(address(this));
        token = new MockERC20(0);
        token.mint(buyer, AMOUNT * 3);
        vm.prank(buyer);
        token.approve(address(escrow), type(uint256).max);
    }

    function test_ReleasePaysSeller() public {
        uint256 id = _deal(3 days);
        vm.prank(buyer);
        escrow.release(id);
        assertEq(token.balanceOf(seller), AMOUNT);
        assertEq(token.balanceOf(buyer), AMOUNT * 2);
    }

    function test_SellerCanRefundAnytime() public {
        uint256 id = _deal(30 days);
        vm.prank(seller);
        escrow.refund(id);
        assertEq(token.balanceOf(buyer), AMOUNT * 3);
    }

    function test_BuyerRefundOnlyAfterTimeout() public {
        uint256 id = _deal(3 days);

        vm.prank(buyer);
        vm.expectRevert(ArcFlowEscrow.TooEarly.selector);
        escrow.refund(id);

        skip(3 days);
        vm.prank(buyer);
        escrow.refund(id);
        assertEq(token.balanceOf(buyer), AMOUNT * 3);
    }

    function test_StrangerCannotReleaseOrRefund() public {
        uint256 id = _deal(1 days);
        vm.prank(other);
        vm.expectRevert(ArcFlowEscrow.NotBuyer.selector);
        escrow.release(id);

        vm.prank(other);
        vm.expectRevert(ArcFlowEscrow.NotParty.selector);
        escrow.refund(id);
    }

    function test_CannotReleaseTwice() public {
        uint256 id = _deal(1 days);
        vm.prank(buyer);
        escrow.release(id);
        vm.prank(buyer);
        vm.expectRevert(ArcFlowEscrow.BadStatus.selector);
        escrow.release(id);
    }

    function _deal(uint64 timeout) internal returns (uint256 id) {
        vm.prank(buyer);
        id = escrow.create(address(token), seller, AMOUNT, timeout, keccak256("po-1"));
    }
}
