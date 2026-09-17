// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {arcflowsLocker as ArcFlow} from "../src/arcflows.sol";
import {Deployers} from "./helpers/Deployers.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ArcFlowTest is Test {
    ArcFlow flow;
    MockERC20 token;
    MockERC20 usdc;

    address owner = makeAddr("owner");
    address dev = makeAddr("dev");
    address stranger = makeAddr("stranger");
    address treasury = makeAddr("treasury");
    address referralWallet = makeAddr("referralWallet");
    address withdrawExecutor = makeAddr("withdrawExecutor");
    address referrer = makeAddr("referrer");

    uint128 constant AMOUNT = 1_000_000e18;

    function setUp() public {
        vm.warp(1_700_000_000);
        usdc = new MockERC20(0);
        flow = Deployers.lock(owner, address(usdc), treasury);
        vm.prank(owner);
        flow.initializeV2(referralWallet);
        vm.prank(owner);
        flow.initializeV3(withdrawExecutor);
        token = new MockERC20(0);
        token.mint(dev, AMOUNT * 10);
        vm.prank(dev);
        token.approve(address(flow), type(uint256).max);
        _fundFee(dev, 400);
    }

    function _fundFee(address who, uint256 locks) internal {
        usdc.mint(who, uint256(flow.LOCK_FEE()) * locks);
        vm.prank(who);
        usdc.approve(address(flow), type(uint256).max);
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

    /// @dev Same calldata the create form sends for Linear vest: start=0, cliff=0.
    function test_Vest_UiPath_StartCliffZeroPartialThenFinalClaim() public {
        uint256 walletBefore = token.balanceOf(dev);

        vm.prank(dev);
        uint256 id = flow.lock(address(token), dev, AMOUNT, 0, 0, uint64(block.timestamp) + 100 days);

        (,,,,, uint64 start, uint64 cliff, uint64 end) = flow.positions(id);
        assertEq(start, block.timestamp);
        assertEq(cliff, start);
        assertEq(end - start, 100 days);
        assertEq(usdc.balanceOf(treasury), flow.LOCK_FEE());
        assertEq(flow.claimable(id), 0, "nothing vested at t0");

        skip(25 days);
        assertEq(flow.claimable(id), AMOUNT / 4);

        vm.prank(dev);
        assertEq(flow.claim(id), AMOUNT / 4);
        assertEq(token.balanceOf(dev), walletBefore - AMOUNT + AMOUNT / 4);
        assertEq(flow.claimable(id), 0);

        skip(75 days);
        assertEq(flow.claimable(id), (AMOUNT * 3) / 4);
        vm.prank(dev);
        assertEq(flow.claim(id), (AMOUNT * 3) / 4);
        assertEq(token.balanceOf(dev), walletBefore);
        assertEq(flow.totalLocked(address(token)), 0);
    }

    function test_Vest_CustomDuration_17Days8Hours() public {
        uint64 duration = uint64(17 days + 8 hours);
        uint256 id = _vest(duration);

        skip(duration / 2);
        assertEq(flow.claimable(id), AMOUNT / 2);

        skip(duration - duration / 2);
        assertEq(flow.claimable(id), AMOUNT);
        vm.prank(dev);
        assertEq(flow.claim(id), AMOUNT);
    }

    function test_Vest_OnlyBeneficiaryCanClaimMidStream() public {
        uint256 id = _vest(40 days);
        skip(10 days);
        assertGt(flow.claimable(id), 0);
        vm.prank(stranger);
        vm.expectRevert(ArcFlow.NotBeneficiary.selector);
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

    function test_RejectsBackdatedStart() public {
        uint64 nowTs = uint64(block.timestamp);
        // Looks like a 90-day vest, but 89 days already elapsed — instantly ~99% claimable.
        vm.prank(dev);
        vm.expectRevert(ArcFlow.InvalidSchedule.selector);
        flow.lock(address(token), dev, AMOUNT, nowTs - 89 days, nowTs - 89 days, nowTs + 1 days);
        assertEq(flow.claimable(0), 0);
        assertEq(token.balanceOf(dev), AMOUNT * 10);
    }

    function test_RejectsDurationBelowMinimum() public {
        uint64 nowTs = uint64(block.timestamp);
        uint64 tooShort = nowTs + flow.MIN_DURATION() - 1;
        vm.prank(dev);
        vm.expectRevert(ArcFlow.InvalidSchedule.selector);
        flow.lock(address(token), dev, AMOUNT, nowTs, nowTs, tooShort);
    }

    function test_StartZeroUsesBlockTimestamp() public {
        vm.prank(dev);
        uint256 id = flow.lock(address(token), dev, AMOUNT, 0, 0, uint64(block.timestamp) + 30 days);
        (,,,,, uint64 start, uint64 cliff, uint64 end) = flow.positions(id);
        assertEq(start, block.timestamp);
        assertEq(cliff, start);
        assertEq(end, start + 30 days);
        assertEq(flow.claimable(id), 0);
    }

    // --- lock fee ---

    function test_LockChargesFlatTenUsdc() public {
        _hardLock(30 days);
        assertEq(usdc.balanceOf(treasury), flow.LOCK_FEE());
        assertEq(usdc.balanceOf(referralWallet), 0);
        assertEq(flow.totalLocked(address(usdc)), 0, "fee must not be counted as locked");
        assertEq(usdc.balanceOf(address(flow)), 0);
        assertEq(usdc.balanceOf(dev), uint256(flow.LOCK_FEE()) * 399);
    }

    function test_LockWithReferral_CreditsReferrerBalanceInContract() public {
        uint128 gross = uint128((uint256(flow.LOCK_FEE()) * flow.DEFAULT_REFERRAL_RATE_BPS()) / 10_000);
        uint128 net = uint128((uint256(gross) * 8000) / 10_000);
        uint128 treasuryAmount = flow.LOCK_FEE() - net;

        uint64 nowTs = uint64(block.timestamp);
        vm.prank(dev);
        flow.lockWithReferral(address(token), dev, AMOUNT, nowTs, nowTs + 30 days, nowTs + 30 days, referrer);

        assertEq(flow.referralRateBps(), flow.DEFAULT_REFERRAL_RATE_BPS());
        assertEq(flow.referralBalances(referrer), net);
        assertEq(usdc.balanceOf(address(flow)), net);
        assertEq(usdc.balanceOf(treasury), treasuryAmount);
    }

    function test_LockWithReferral_IgnoresSelfReferral() public {
        uint64 nowTs = uint64(block.timestamp);
        vm.prank(dev);
        flow.lockWithReferral(address(token), dev, AMOUNT, nowTs, nowTs + 30 days, nowTs + 30 days, dev);

        assertEq(flow.referralBalances(dev), 0);
        assertEq(usdc.balanceOf(address(flow)), 0);
        assertEq(usdc.balanceOf(treasury), flow.LOCK_FEE());
    }

    function test_ClaimReferral_CallerPaysGas() public {
        uint64 nowTs = uint64(block.timestamp);
        vm.prank(dev);
        flow.lockWithReferral(address(token), dev, AMOUNT, nowTs, nowTs + 30 days, nowTs + 30 days, referrer);

        uint128 net = uint128(flow.referralBalances(referrer));
        assertGt(net, 0);

        vm.prank(referrer);
        flow.claimReferral(net);

        assertEq(flow.referralBalances(referrer), 0);
        assertEq(usdc.balanceOf(referrer), net);
        assertEq(usdc.balanceOf(address(flow)), 0);
    }

    function test_WithdrawReferral_OnlyExecutorCanPayOut() public {
        uint64 nowTs = uint64(block.timestamp);
        vm.prank(dev);
        flow.lockWithReferral(address(token), dev, AMOUNT, nowTs, nowTs + 30 days, nowTs + 30 days, referrer);

        uint128 net = uint128(flow.referralBalances(referrer));
        assertGt(net, 0);

        vm.prank(stranger);
        vm.expectRevert(ArcFlow.NotAuthorized.selector);
        flow.withdrawReferral(referrer, net);

        vm.prank(withdrawExecutor);
        flow.withdrawReferral(referrer, net);

        assertEq(flow.referralBalances(referrer), 0);
        assertEq(usdc.balanceOf(referrer), net);
        assertEq(usdc.balanceOf(address(flow)), 0);
    }

    function test_OwnerCanUpdateReferralRateAndTreasury() public {
        address newTreasury = makeAddr("newTreasury");

        vm.startPrank(owner);
        flow.setReferralRateBps(2000);
        flow.setTreasury(newTreasury);
        vm.stopPrank();

        assertEq(flow.referralRateBps(), 2000);
        assertEq(flow.treasury(), newTreasury);
    }

    function test_RejectsReferralRateAboveMax() public {
        vm.prank(owner);
        vm.expectRevert(ArcFlow.InvalidReferralRate.selector);
        flow.setReferralRateBps(10_001);
    }

    function test_RejectsLockWithoutUsdcFee() public {
        vm.prank(dev);
        usdc.approve(address(flow), 0);
        uint64 nowTs = uint64(block.timestamp);
        vm.prank(dev);
        vm.expectRevert(ArcFlow.TransferFailed.selector);
        flow.lock(address(token), dev, AMOUNT, nowTs, nowTs + 30 days, nowTs + 30 days);
        assertEq(token.balanceOf(address(flow)), 0);
        assertEq(usdc.balanceOf(treasury), 0);
    }

    function test_LockingUsdcDoesNotMixFeeIntoPosition() public {
        uint128 lockAmount = 100e6;
        usdc.mint(dev, lockAmount);
        uint64 nowTs = uint64(block.timestamp);
        vm.prank(dev);
        uint256 id = flow.lock(address(usdc), dev, lockAmount, nowTs, nowTs + 30 days, nowTs + 30 days);

        (,,, uint128 credited,,,,) = flow.positions(id);
        assertEq(credited, lockAmount);
        assertEq(flow.totalLocked(address(usdc)), lockAmount);
        assertEq(usdc.balanceOf(treasury), flow.LOCK_FEE());
        assertEq(usdc.balanceOf(address(flow)), lockAmount);
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
        _fundFee(stranger, 1);
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
        duration = uint64(bound(duration, flow.MIN_DURATION(), 3650 days));
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
