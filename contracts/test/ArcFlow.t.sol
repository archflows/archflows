// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ArcFlow} from "../src/ArcFlow.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ArcFlowTest is Test {
    ArcFlow flow;
    MockERC20 token;

    address dev = makeAddr("dev");
    address stranger = makeAddr("stranger");

    uint128 constant AMOUNT = 1_000_000e18;

    function setUp() public {
        vm.warp(1_700_000_000);
        flow = new ArcFlow();
        token = new MockERC20(0);
        token.mint(dev, AMOUNT * 10);
        vm.prank(dev);
        token.approve(address(flow), type(uint256).max);
    }

    function _hardLock(uint64 duration) internal returns (uint256 id) {
        uint64 nowTs = uint64(block.timestamp);
        vm.prank(dev);
        id = flow.lock(address(token), dev, AMOUNT, nowTs, nowTs + duration, nowTs + duration);
    }

    function _vest(uint64 duration) internal returns (uint256 id) {
        uint64 nowTs = uint64(block.timestamp);
        vm.prank(dev);
        id = flow.lock(address(token), dev, AMOUNT, nowTs, nowTs, nowTs + duration);
    }

    // --- hard lock ---

    function test_HardLock_NothingClaimableBeforeEnd() public {
        uint256 id = _hardLock(30 days);
        skip(30 days - 1);
        assertEq(flow.claimable(id), 0);
        vm.prank(dev);
        vm.expectRevert(ArcFlow.NothingToClaim.selector);
        flow.claim(id);
    }

    function test_HardLock_FullAtEnd() public {
        uint256 id = _hardLock(30 days);
        skip(30 days);
        assertEq(flow.claimable(id), AMOUNT);
        vm.prank(dev);
        flow.claim(id);
        assertEq(token.balanceOf(dev), AMOUNT * 10);
        assertEq(flow.totalLocked(address(token)), 0);
    }

    // --- linear vest ---

    function test_Vest_LinearRelease() public {
        uint256 id = _vest(100 days);
        skip(25 days);
        assertEq(flow.claimable(id), AMOUNT / 4);
        skip(25 days);
        assertEq(flow.claimable(id), AMOUNT / 2);
        vm.prank(dev);
        flow.claim(id);
        assertEq(flow.claimable(id), 0);
        skip(50 days);
        assertEq(flow.claimable(id), AMOUNT / 2);
    }

    function test_Vest_CliffHoldsThenReleasesAccrued() public {
        uint64 nowTs = uint64(block.timestamp);
        vm.prank(dev);
        uint256 id = flow.lock(address(token), dev, AMOUNT, nowTs, nowTs + 30 days, nowTs + 120 days);

        skip(29 days);
        assertEq(flow.claimable(id), 0, "locked before cliff");

        skip(1 days);
        assertEq(flow.claimable(id), (AMOUNT * 30) / 120, "cliff unlocks accrued share");
    }

    function test_Vest_NeverOverReleases() public {
        uint256 id = _vest(100 days);
        skip(1000 days);
        assertEq(flow.claimable(id), AMOUNT);
        vm.prank(dev);
        assertEq(flow.claim(id), AMOUNT);
        vm.prank(dev);
        vm.expectRevert(ArcFlow.NothingToClaim.selector);
        flow.claim(id);
    }

    // --- access control and immutability ---

    function test_OnlyBeneficiaryCanClaim() public {
        uint256 id = _hardLock(1 days);
        skip(1 days);
        vm.prank(stranger);
        vm.expectRevert(ArcFlow.NotBeneficiary.selector);
        flow.claim(id);
    }

    function test_CreatorCannotWithdrawEarly() public {
        uint64 nowTs = uint64(block.timestamp);
        vm.prank(dev);
        uint256 id = flow.lock(address(token), stranger, AMOUNT, nowTs, nowTs + 1 days, nowTs + 1 days);
        skip(1 days);
        vm.prank(dev);
        vm.expectRevert(ArcFlow.NotBeneficiary.selector);
        flow.claim(id);
    }

    function test_RejectsLockThatIsAlreadyUnlocked() public {
        uint64 nowTs = uint64(block.timestamp);
        vm.prank(dev);
        vm.expectRevert(ArcFlow.InvalidSchedule.selector);
        flow.lock(address(token), dev, AMOUNT, nowTs - 10 days, nowTs - 1, nowTs - 1);
    }

    function test_RejectsCliffAfterEnd() public {
        uint64 nowTs = uint64(block.timestamp);
        vm.prank(dev);
        vm.expectRevert(ArcFlow.InvalidSchedule.selector);
        flow.lock(address(token), dev, AMOUNT, nowTs, nowTs + 10 days, nowTs + 1 days);
    }

    // --- taxed tokens ---

    function test_TaxedToken_CreditsOnlyWhatArrived() public {
        MockERC20 taxed = new MockERC20(500); // 5%
        taxed.mint(dev, AMOUNT);
        vm.startPrank(dev);
        taxed.approve(address(flow), type(uint256).max);
        uint64 nowTs = uint64(block.timestamp);
        uint256 id = flow.lock(address(taxed), dev, AMOUNT, nowTs, nowTs + 1 days, nowTs + 1 days);
        vm.stopPrank();

        (,,, uint128 credited,,,,) = flow.positions(id);
        assertEq(credited, (AMOUNT * 9500) / 10_000);

        skip(1 days);
        vm.prank(dev);
        flow.claim(id);
        assertEq(taxed.balanceOf(address(flow)), 0, "contract fully drained, no stuck dust");
    }

    function test_TaxedToken_SecondLockCannotDrainFirst() public {
        MockERC20 taxed = new MockERC20(500);
        taxed.mint(dev, AMOUNT * 2);
        taxed.mint(stranger, AMOUNT);
        uint64 nowTs = uint64(block.timestamp);

        vm.startPrank(dev);
        taxed.approve(address(flow), type(uint256).max);
        uint256 devId = flow.lock(address(taxed), dev, AMOUNT, nowTs, nowTs + 1 days, nowTs + 1 days);
        vm.stopPrank();

        vm.startPrank(stranger);
        taxed.approve(address(flow), type(uint256).max);
        uint256 strangerId = flow.lock(address(taxed), stranger, AMOUNT, nowTs, nowTs + 1 days, nowTs + 1 days);
        vm.stopPrank();

        skip(1 days);
        vm.prank(stranger);
        flow.claim(strangerId);
        vm.prank(dev);
        flow.claim(devId); // must not revert for lack of balance
    }

    // --- indexing ---

    function test_IndexesByCreatorBeneficiaryAndToken() public {
        uint64 nowTs = uint64(block.timestamp);
        vm.prank(dev);
        uint256 id = flow.lock(address(token), stranger, AMOUNT, nowTs, nowTs + 1 days, nowTs + 1 days);

        assertEq(flow.creatorLockCount(dev), 1);
        assertEq(flow.beneficiaryLockCount(stranger), 1);
        assertEq(flow.tokenLockCount(address(token)), 1);
        assertEq(flow.locksByToken(address(token), 0), id);
    }

    function testFuzz_ReleaseIsMonotonicAndBounded(uint64 duration, uint64 elapsed) public {
        duration = uint64(bound(duration, 1, 3650 days));
        elapsed = uint64(bound(elapsed, 0, 3650 days));
        uint256 id = _vest(duration);

        skip(elapsed);
        uint128 first = flow.claimable(id);
        assertLe(first, AMOUNT);

        skip(1 days);
        assertGe(flow.claimable(id), first);
        assertLe(flow.claimable(id), AMOUNT);
    }
}
