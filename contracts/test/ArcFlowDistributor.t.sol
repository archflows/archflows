// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ArcFlowDistributor} from "../src/ArcFlowDistributor.sol";
import {ArcFlowStream} from "../src/ArcFlowStream.sol";
import {Deployers} from "./helpers/Deployers.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ArcFlowDistributorTest is Test {
    ArcFlowStream stream;
    ArcFlowDistributor dist;
    MockERC20 token;

    address funder = makeAddr("funder");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    uint128 constant ALICE_AMT = 100e18;
    uint128 constant BOB_AMT = 200e18;
    uint128 constant TOTAL = 300e18;

    bytes32 root;
    bytes32 aliceLeaf;
    bytes32 bobLeaf;

    function setUp() public {
        vm.warp(1_700_000_000);
        stream = Deployers.stream(address(this));
        dist = Deployers.distributor(address(this), stream);
        token = new MockERC20(0);
        token.mint(funder, TOTAL * 5);
        vm.prank(funder);
        token.approve(address(dist), type(uint256).max);

        aliceLeaf = _leaf(0, alice, ALICE_AMT);
        bobLeaf = _leaf(1, bob, BOB_AMT);
        root = _hashPair(aliceLeaf, bobLeaf);
    }

    function test_InstantClaim() public {
        uint256 id = _campaign(0, 0);
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = bobLeaf;

        vm.prank(alice);
        dist.claim(id, 0, alice, ALICE_AMT, proof);
        assertEq(token.balanceOf(alice), ALICE_AMT);
        assertTrue(dist.isClaimed(id, 0));

        vm.expectRevert(ArcFlowDistributor.AlreadyClaimed.selector);
        dist.claim(id, 0, alice, ALICE_AMT, proof);
    }

    function test_RejectsBadProof() public {
        uint256 id = _campaign(0, 0);
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = aliceLeaf; // wrong sibling for alice
        vm.expectRevert(ArcFlowDistributor.InvalidProof.selector);
        dist.claim(id, 0, alice, ALICE_AMT, proof);
    }

    function test_ClaimIntoVestingStream() public {
        uint256 id = _campaign(30 days, 0);
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = bobLeaf;

        uint256 streamId = dist.claim(id, 0, alice, ALICE_AMT, proof);
        assertEq(token.balanceOf(alice), 0);
        assertEq(stream.withdrawable(streamId), 0);

        skip(15 days);
        assertEq(stream.withdrawable(streamId), ALICE_AMT / 2);
        vm.prank(alice);
        stream.withdraw(streamId);
        assertEq(token.balanceOf(alice), ALICE_AMT / 2);
    }

    function test_ClawbackUnclaimedAfterWindow() public {
        uint256 id = _campaign(0, 0);
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = bobLeaf;
        dist.claim(id, 0, alice, ALICE_AMT, proof);

        skip(8 days);
        vm.prank(funder);
        uint128 back = dist.clawback(id);
        assertEq(back, BOB_AMT);
        assertEq(token.balanceOf(funder), TOTAL * 5 - ALICE_AMT);
    }

    function test_AnyoneCanClaimForRecipient() public {
        uint256 id = _campaign(0, 0);
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = aliceLeaf;
        dist.claim(id, 1, bob, BOB_AMT, proof);
        assertEq(token.balanceOf(bob), BOB_AMT);
    }

    function test_CancelBeforeStartRefundsFunder() public {
        uint64 nowTs = uint64(block.timestamp);
        vm.prank(funder);
        uint256 id = dist.createCampaign(address(token), root, TOTAL, nowTs + 1 days, nowTs + 8 days, 0, 0);

        vm.prank(alice);
        vm.expectRevert(ArcFlowDistributor.TooEarly.selector);
        dist.claim(id, 0, alice, ALICE_AMT, _aliceProof());

        vm.prank(funder);
        assertEq(dist.cancel(id), TOTAL);
        assertEq(token.balanceOf(funder), TOTAL * 5);

        vm.prank(funder);
        vm.expectRevert(ArcFlowDistributor.Canceled.selector);
        dist.cancel(id);
    }

    function test_CannotCancelAfterWindowOpens() public {
        uint256 id = _campaign(0, 0);
        vm.prank(funder);
        vm.expectRevert(ArcFlowDistributor.TooLate.selector);
        dist.cancel(id);
    }

    function test_TopUpLetsRemainingClaimsThrough() public {
        uint64 nowTs = uint64(block.timestamp);
        vm.prank(funder);
        uint256 id = dist.createCampaign(address(token), root, ALICE_AMT, nowTs, nowTs + 7 days, 0, 0);

        dist.claim(id, 0, alice, ALICE_AMT, _aliceProof());

        vm.prank(bob);
        vm.expectRevert(ArcFlowDistributor.ExceedsDeposit.selector);
        dist.claim(id, 1, bob, BOB_AMT, _bobProof());

        vm.prank(funder);
        dist.topUp(id, BOB_AMT);
        dist.claim(id, 1, bob, BOB_AMT, _bobProof());
        assertEq(token.balanceOf(bob), BOB_AMT);
    }

    function test_ClaimToRedirectsOnlyByAccount() public {
        uint256 id = _campaign(0, 0);
        address wallet = makeAddr("newWallet");

        vm.expectRevert(ArcFlowDistributor.NotRecipient.selector);
        dist.claimTo(id, 0, alice, ALICE_AMT, _aliceProof(), wallet);

        vm.prank(alice);
        dist.claimTo(id, 0, alice, ALICE_AMT, _aliceProof(), wallet);
        assertEq(token.balanceOf(alice), 0);
        assertEq(token.balanceOf(wallet), ALICE_AMT);
    }

    function test_RejectsShortAndLongWindows() public {
        uint64 nowTs = uint64(block.timestamp);
        uint64 tooLong = dist.MAX_WINDOW() + 1;
        vm.startPrank(funder);
        vm.expectRevert(ArcFlowDistributor.InvalidWindow.selector);
        dist.createCampaign(address(token), root, TOTAL, nowTs, nowTs + 30 minutes, 0, 0);
        vm.expectRevert(ArcFlowDistributor.InvalidWindow.selector);
        dist.createCampaign(address(token), root, TOTAL, nowTs, nowTs + tooLong, 0, 0);
        vm.expectRevert(ArcFlowDistributor.InvalidWindow.selector);
        dist.createCampaign(address(token), root, TOTAL, nowTs - 1, nowTs + 7 days, 0, 0);
        vm.stopPrank();
    }

    function test_PauseBlocksCreateNotClaim() public {
        uint256 id = _campaign(0, 0);
        dist.setProtocolPaused(true);

        uint64 nowTs = uint64(block.timestamp);
        vm.prank(funder);
        vm.expectRevert(ArcFlowDistributor.Paused.selector);
        dist.createCampaign(address(token), root, TOTAL, nowTs, nowTs + 7 days, 0, 0);

        dist.claim(id, 0, alice, ALICE_AMT, _aliceProof());
        assertEq(token.balanceOf(alice), ALICE_AMT);
    }

    function _aliceProof() internal view returns (bytes32[] memory proof) {
        proof = new bytes32[](1);
        proof[0] = bobLeaf;
    }

    function _bobProof() internal view returns (bytes32[] memory proof) {
        proof = new bytes32[](1);
        proof[0] = aliceLeaf;
    }

    function _campaign(uint64 vestDuration, uint64 vestCliffDelay) internal returns (uint256 id) {
        uint64 nowTs = uint64(block.timestamp);
        vm.prank(funder);
        id = dist.createCampaign(address(token), root, TOTAL, nowTs, nowTs + 7 days, vestDuration, vestCliffDelay);
    }

    function _leaf(uint256 index, address account, uint128 amount) internal pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(index, account, amount))));
    }

    function _hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }
}
