// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ArcFlowDistributor} from "../src/ArcFlowDistributor.sol";
import {ArcFlowStream} from "../src/ArcFlowStream.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

/// @notice Exercises the live Arc Testnet distributor proxy on a local fork (no broadcast).
contract LiveDistributorForkTest is Test {
    ArcFlowDistributor constant dist = ArcFlowDistributor(0xd826aC6cCA47Bb7f4C66DbFDB4a76131De0450c8);
    address constant STREAM = 0x15f148de4c29C4af03d7d77CC75418669521Adb0;
    address constant OWNER = 0x63B2614f9AE9eAe20483aD24718B419891A2657D;
    bytes32 constant IMPL_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    address constant EXPECTED_IMPL = 0x4C0A2292DABeBfF959c3F3F7A7d7942E7Ff292b1;

    uint128 constant ALICE_AMT = 100e18;
    uint128 constant BOB_AMT = 200e18;
    uint128 constant TOTAL = 300e18;

    function setUp() public {
        vm.createSelectFork("https://rpc.testnet.arc.network");
    }

    function test_LiveImplementationAndCaps() public view {
        address impl = address(uint160(uint256(vm.load(address(dist), IMPL_SLOT))));
        assertEq(impl, EXPECTED_IMPL);
        assertEq(dist.owner(), OWNER);
        assertEq(address(dist.stream()), STREAM);
        assertEq(dist.MIN_WINDOW(), 1 hours);
        assertEq(dist.MAX_WINDOW(), 3650 days);
        assertEq(dist.MAX_VEST_DURATION(), 3650 days);
        assertFalse(dist.protocolPaused());
    }

    function test_LiveShortWindowReverts() public {
        uint64 nowTs = uint64(block.timestamp);
        vm.expectRevert(ArcFlowDistributor.InvalidWindow.selector);
        dist.createCampaign(address(1), bytes32(uint256(1)), 1, nowTs, nowTs + 30 minutes, 0, 0);
    }

    function test_LiveCreateClaimClawback() public {
        (MockERC20 token, address funder, address alice,, bytes32 root, bytes32 bobLeaf) = _tree();

        uint64 nowTs = uint64(block.timestamp);
        vm.prank(funder);
        uint256 id = dist.createCampaign(address(token), root, TOTAL, nowTs, nowTs + 7 days, 0, 0);

        bytes32[] memory proof = new bytes32[](1);
        proof[0] = bobLeaf;
        vm.prank(alice);
        dist.claim(id, 0, alice, ALICE_AMT, proof);
        assertEq(token.balanceOf(alice), ALICE_AMT);
        assertTrue(dist.isClaimed(id, 0));

        vm.prank(funder);
        vm.expectRevert(ArcFlowDistributor.TooEarly.selector);
        dist.clawback(id);

        skip(7 days);
        vm.prank(funder);
        assertEq(dist.clawback(id), BOB_AMT);
        assertEq(token.balanceOf(funder), TOTAL * 4 + BOB_AMT);
    }

    function test_LiveClaimToAndVest() public {
        (MockERC20 token, address funder, address alice, address bob, bytes32 root, bytes32 bobLeaf) = _tree();
        address wallet = makeAddr("wallet");
        ArcFlowStream stream = dist.stream();
        uint256 nextStreamId = stream.nextId();

        uint64 nowTs = uint64(block.timestamp);
        vm.prank(funder);
        uint256 id = dist.createCampaign(address(token), root, TOTAL, nowTs, nowTs + 7 days, 30 days, 0);

        bytes32[] memory proof = new bytes32[](1);
        proof[0] = bobLeaf;
        vm.prank(alice);
        uint256 streamId = dist.claimTo(id, 0, alice, ALICE_AMT, proof, wallet);
        assertEq(streamId, nextStreamId);
        assertEq(stream.nextId(), nextStreamId + 1);
        assertEq(token.balanceOf(alice), 0);
        assertEq(token.balanceOf(wallet), 0);

        skip(15 days);
        assertEq(stream.withdrawable(streamId), ALICE_AMT / 2);
        vm.prank(wallet);
        stream.withdraw(streamId);
        assertEq(token.balanceOf(wallet), ALICE_AMT / 2);

        vm.prank(bob);
        vm.expectRevert(ArcFlowDistributor.NotRecipient.selector);
        dist.claimTo(id, 0, alice, ALICE_AMT, proof, bob);
    }

    function test_LiveCancelBeforeStart() public {
        (MockERC20 token, address funder,,, bytes32 root,) = _tree();
        uint64 nowTs = uint64(block.timestamp);
        vm.prank(funder);
        uint256 id = dist.createCampaign(address(token), root, TOTAL, nowTs + 1 days, nowTs + 8 days, 0, 0);

        vm.prank(funder);
        assertEq(dist.cancel(id), TOTAL);
        assertEq(token.balanceOf(funder), TOTAL * 5);
    }

    function test_LiveNonOwnerCannotUpgrade() public {
        address impl = address(new ArcFlowDistributor());
        vm.prank(makeAddr("stranger"));
        vm.expectRevert();
        dist.upgradeToAndCall(impl, "");
    }

    function _tree()
        internal
        returns (MockERC20 token, address funder, address alice, address bob, bytes32 root, bytes32 bobLeaf)
    {
        token = new MockERC20(0);
        funder = makeAddr("funder");
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        token.mint(funder, TOTAL * 5);
        vm.prank(funder);
        token.approve(address(dist), type(uint256).max);

        bytes32 aliceLeaf = keccak256(bytes.concat(keccak256(abi.encode(uint256(0), alice, ALICE_AMT))));
        bobLeaf = keccak256(bytes.concat(keccak256(abi.encode(uint256(1), bob, BOB_AMT))));
        root = aliceLeaf < bobLeaf
            ? keccak256(abi.encodePacked(aliceLeaf, bobLeaf))
            : keccak256(abi.encodePacked(bobLeaf, aliceLeaf));
    }
}
