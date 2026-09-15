// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ArcFlowStaking} from "../src/ArcFlowStaking.sol";
import {Deployers} from "./helpers/Deployers.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ArcFlowStakingV2 is ArcFlowStaking {
    function version() external pure returns (string memory) {
        return "v2";
    }
}

contract ArcFlowStakingTest is Test {
    ArcFlowStaking staking;
    MockERC20 stakeToken;
    MockERC20 rewardToken;

    address owner = makeAddr("owner");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    uint128 constant STAKE = 100e18;
    uint256 constant REWARD = 1_000e18;

    function setUp() public {
        vm.warp(1_700_000_000);
        staking = Deployers.staking(address(this));
        stakeToken = new MockERC20(0);
        rewardToken = new MockERC20(0);

        stakeToken.mint(alice, STAKE);
        stakeToken.mint(bob, STAKE);
        rewardToken.mint(owner, REWARD * 2);

        vm.prank(alice);
        stakeToken.approve(address(staking), type(uint256).max);
        vm.prank(bob);
        stakeToken.approve(address(staking), type(uint256).max);
        vm.prank(owner);
        rewardToken.approve(address(staking), type(uint256).max);
    }

    function test_EarnsProRataThenClaim() public {
        uint256 id = _pool(0);

        vm.prank(alice);
        staking.stake(id, STAKE);

        skip(50 days);
        uint256 aliceEarned = staking.earned(id, alice);
        assertApproxEqAbs(aliceEarned, REWARD / 2, 1e10);

        vm.prank(alice);
        staking.getReward(id);
        assertApproxEqAbs(rewardToken.balanceOf(alice), REWARD / 2, 1e10);

        skip(50 days);
        vm.prank(alice);
        staking.getReward(id);
        assertApproxEqAbs(rewardToken.balanceOf(alice), REWARD, 1e10);
    }

    function test_TwoStakersSplitRewards() public {
        uint256 id = _pool(0);
        vm.prank(alice);
        staking.stake(id, STAKE);
        vm.prank(bob);
        staking.stake(id, STAKE);

        skip(100 days);
        assertApproxEqAbs(staking.earned(id, alice), REWARD / 2, 1e10);
        assertApproxEqAbs(staking.earned(id, bob), REWARD / 2, 1e10);
    }

    function test_MinLockBlocksUnstake() public {
        uint256 id = _pool(7 days);
        vm.prank(alice);
        staking.stake(id, STAKE);

        vm.prank(alice);
        vm.expectRevert(ArcFlowStaking.Locked.selector);
        staking.unstake(id, STAKE);

        skip(7 days);
        vm.prank(alice);
        staking.unstake(id, STAKE);
        assertEq(stakeToken.balanceOf(alice), STAKE);
    }

    function test_OnlyOwnerFunds() public {
        uint256 id = _pool(0);
        vm.prank(alice);
        vm.expectRevert(ArcFlowStaking.NotOwner.selector);
        staking.fund(id, REWARD, 10 days);
    }

    function test_SameTokenDoesNotEatStake() public {
        MockERC20 both = new MockERC20(0);
        both.mint(alice, STAKE);
        both.mint(owner, REWARD);
        vm.prank(alice);
        both.approve(address(staking), type(uint256).max);
        vm.prank(owner);
        both.approve(address(staking), type(uint256).max);

        vm.prank(owner);
        uint256 id = staking.createPool(address(both), address(both), 0);
        vm.prank(owner);
        staking.fund(id, REWARD, 100 days);
        vm.prank(alice);
        staking.stake(id, STAKE);

        skip(100 days);
        vm.prank(alice);
        staking.getReward(id);
        vm.prank(alice);
        staking.unstake(id, STAKE);
        assertGe(both.balanceOf(alice), STAKE);
        assertApproxEqAbs(both.balanceOf(alice), STAKE + REWARD, 1e10);
    }

    function test_UnstakeAutoClaimsRewards() public {
        uint256 id = _pool(0);
        vm.prank(alice);
        staking.stake(id, STAKE);

        skip(100 days);
        vm.prank(alice);
        staking.unstake(id, STAKE);

        assertEq(stakeToken.balanceOf(alice), STAKE);
        assertApproxEqAbs(rewardToken.balanceOf(alice), REWARD, 1e10);
    }

    function test_UnstakeOnlyLeavesRewards() public {
        uint256 id = _pool(0);
        vm.prank(alice);
        staking.stake(id, STAKE);

        skip(100 days);
        vm.prank(alice);
        staking.unstakeOnly(id, STAKE);

        assertEq(stakeToken.balanceOf(alice), STAKE);
        assertEq(rewardToken.balanceOf(alice), 0);
        assertApproxEqAbs(staking.earned(id, alice), REWARD, 1e10);

        vm.prank(alice);
        staking.getReward(id);
        assertApproxEqAbs(rewardToken.balanceOf(alice), REWARD, 1e10);
    }

    function test_MinLockCap() public {
        uint64 tooLong = staking.MAX_MIN_LOCK() + 1;
        vm.prank(owner);
        vm.expectRevert(ArcFlowStaking.InvalidLock.selector);
        staking.createPool(address(stakeToken), address(rewardToken), tooLong);

        vm.prank(owner);
        uint256 id = staking.createPool(address(stakeToken), address(rewardToken), staking.MAX_MIN_LOCK());
        assertEq(id, 0);
    }

    function test_FundDurationCap() public {
        uint256 id = _pool(0);
        uint64 tooLong = staking.MAX_FUND_DURATION() + 1;
        vm.prank(owner);
        vm.expectRevert(ArcFlowStaking.InvalidDuration.selector);
        staking.fund(id, REWARD, tooLong);
    }

    function test_RecoverIdlePoolDoesNotStealFutureClaims() public {
        uint256 id = _pool(0);

        vm.prank(owner);
        uint256 recovered = staking.recoverRewards(id);
        assertApproxEqAbs(recovered, REWARD, 1e10);
        assertEq(rewardToken.balanceOf(owner), REWARD + recovered);

        vm.prank(alice);
        staking.stake(id, STAKE);
        skip(10 days);
        assertEq(staking.earned(id, alice), 0);
    }

    function test_RecoverLeavesUnclaimedRewards() public {
        uint256 id = _pool(0);
        vm.prank(alice);
        staking.stake(id, STAKE);
        skip(50 days);

        vm.prank(alice);
        staking.unstakeOnly(id, STAKE);
        uint256 owed = staking.earned(id, alice);

        vm.prank(owner);
        uint256 recovered = staking.recoverRewards(id);
        assertGt(recovered, 0);
        assertLt(recovered, REWARD);

        vm.prank(alice);
        staking.getReward(id);
        assertApproxEqAbs(rewardToken.balanceOf(alice), owed, 1);
        assertApproxEqAbs(rewardToken.balanceOf(alice) + recovered, REWARD, 1e10);
    }

    function test_RecoverBlockedWhileStaked() public {
        uint256 id = _pool(0);
        vm.prank(alice);
        staking.stake(id, STAKE);

        vm.prank(owner);
        vm.expectRevert(ArcFlowStaking.Locked.selector);
        staking.recoverRewards(id);
    }

    function test_PoolPauseBlocksStakeNotUnstake() public {
        uint256 id = _pool(0);
        vm.prank(alice);
        staking.stake(id, STAKE);

        vm.prank(owner);
        staking.setPaused(id, true);

        vm.prank(alice);
        vm.expectRevert(ArcFlowStaking.Paused.selector);
        staking.stake(id, 1);

        vm.prank(alice);
        staking.unstake(id, STAKE);
        assertEq(stakeToken.balanceOf(alice), STAKE);
    }

    function test_ProtocolPause() public {
        uint256 id = _pool(0);
        staking.setProtocolPaused(true);

        vm.prank(alice);
        vm.expectRevert(ArcFlowStaking.Paused.selector);
        staking.stake(id, STAKE);

        staking.setProtocolPaused(false);
        vm.prank(alice);
        staking.stake(id, STAKE);
        assertEq(staking.stakerPoolCount(alice), 1);
    }

    function test_CapAndExpiry() public {
        vm.prank(owner);
        uint256 id = staking.createPool(address(stakeToken), address(rewardToken), 0);
        vm.prank(owner);
        staking.setCap(id, STAKE);
        vm.prank(owner);
        staking.setExpiry(id, uint64(block.timestamp + 10 days));
        vm.prank(owner);
        staking.fund(id, REWARD, 100 days);

        vm.prank(alice);
        staking.stake(id, STAKE);

        vm.prank(bob);
        vm.expectRevert(ArcFlowStaking.CapExceeded.selector);
        staking.stake(id, STAKE);

        vm.prank(owner);
        vm.expectRevert(ArcFlowStaking.Locked.selector);
        staking.setExpiry(id, uint64(block.timestamp + 20 days));

        vm.prank(alice);
        staking.unstake(id, STAKE);

        skip(10 days);
        vm.prank(owner);
        staking.setExpiry(id, uint64(block.timestamp + 1 days));
        skip(1 days);
        vm.prank(alice);
        vm.expectRevert(ArcFlowStaking.PoolExpired.selector);
        staking.stake(id, STAKE);
    }

    function test_TransferPool() public {
        uint256 id = _pool(0);
        address nextOwner = makeAddr("nextOwner");

        vm.prank(owner);
        staking.transferPool(id, nextOwner);

        // Until the new owner accepts, the current owner still controls the pool.
        vm.prank(owner);
        staking.fund(id, REWARD, 10 days);

        vm.prank(alice);
        vm.expectRevert(ArcFlowStaking.NotOwner.selector);
        staking.acceptPool(id);

        vm.prank(nextOwner);
        staking.acceptPool(id);

        vm.prank(owner);
        vm.expectRevert(ArcFlowStaking.NotOwner.selector);
        staking.fund(id, REWARD, 10 days);

        rewardToken.mint(nextOwner, REWARD);
        vm.prank(nextOwner);
        rewardToken.approve(address(staking), type(uint256).max);
        vm.prank(nextOwner);
        staking.fund(id, REWARD, 10 days);
        assertEq(staking.creatorPoolCount(nextOwner), 1);
    }

    function test_CompoundSameToken() public {
        MockERC20 both = new MockERC20(0);
        both.mint(alice, STAKE);
        both.mint(owner, REWARD);
        vm.prank(alice);
        both.approve(address(staking), type(uint256).max);
        vm.prank(owner);
        both.approve(address(staking), type(uint256).max);

        vm.prank(owner);
        uint256 id = staking.createPool(address(both), address(both), 0);
        vm.prank(owner);
        staking.fund(id, REWARD, 100 days);
        vm.prank(alice);
        staking.stake(id, STAKE);

        skip(100 days);
        uint256 before = both.balanceOf(alice);
        vm.prank(alice);
        uint256 compounded = staking.compound(id);
        assertGt(compounded, 0);
        assertEq(both.balanceOf(alice), before, "compound must not send tokens out");

        vm.prank(alice);
        staking.unstake(id, STAKE + uint128(compounded));
        assertApproxEqAbs(both.balanceOf(alice), STAKE + REWARD, 1e10);
    }

    function test_RestakeDoesNotRelockUnlockedLots() public {
        uint256 id = _pool(7 days);
        vm.prank(alice);
        staking.stake(id, STAKE / 2);

        skip(6 days);
        vm.prank(alice);
        staking.stake(id, STAKE / 2);
        assertEq(staking.unlockedOf(id, alice), 0);
        assertEq(staking.lotCount(id, alice), 2);

        vm.prank(alice);
        vm.expectRevert(ArcFlowStaking.Locked.selector);
        staking.unstake(id, STAKE / 2);

        skip(1 days);
        assertEq(staking.unlockedOf(id, alice), STAKE / 2);
        vm.prank(alice);
        staking.unstake(id, STAKE / 2);
        assertEq(stakeToken.balanceOf(alice), STAKE / 2);

        vm.prank(alice);
        vm.expectRevert(ArcFlowStaking.Locked.selector);
        staking.unstake(id, STAKE / 2);

        skip(6 days);
        vm.prank(alice);
        staking.unstake(id, STAKE / 2);
        assertEq(stakeToken.balanceOf(alice), STAKE);
    }

    function test_ExitWithdrawsUnlockedOnly() public {
        uint256 id = _pool(7 days);
        vm.prank(alice);
        staking.stake(id, STAKE / 2);
        skip(7 days);
        vm.prank(alice);
        staking.stake(id, STAKE / 2);

        vm.prank(alice);
        staking.exit(id);
        assertEq(stakeToken.balanceOf(alice), STAKE / 2);
        assertEq(staking.unlockedOf(id, alice), 0);
        (uint128 left,,,) = staking.stakes(id, alice);
        assertEq(left, STAKE / 2);
    }

    function test_TwoStepProtocolOwnership() public {
        address next = makeAddr("protocol");
        staking.transferOwnership(next);
        assertEq(staking.owner(), address(this));

        vm.expectRevert(ArcFlowStaking.NotOwner.selector);
        staking.acceptOwnership();

        vm.prank(next);
        staking.acceptOwnership();
        assertEq(staking.owner(), next);

        vm.expectRevert();
        staking.setProtocolPaused(true);
    }

    function test_OwnerCanUpgradeAndStateSurvives() public {
        uint256 id = _pool(0);
        vm.prank(alice);
        staking.stake(id, STAKE);

        staking.upgradeToAndCall(address(new ArcFlowStakingV2()), "");
        assertEq(ArcFlowStakingV2(address(staking)).version(), "v2");
        assertEq(staking.unlockedOf(id, alice), STAKE);
        assertApproxEqAbs(staking.earned(id, alice), 0, 1);
    }

    function test_NonOwnerCannotUpgrade() public {
        address impl = address(new ArcFlowStakingV2());
        vm.prank(alice);
        vm.expectRevert();
        staking.upgradeToAndCall(impl, "");
    }

    function test_MaxLotsMergesIntoLatest() public {
        uint256 id = _pool(1 days);
        uint128 piece = 1e18;
        stakeToken.mint(alice, piece * 17);

        for (uint256 i; i < 16; ++i) {
            vm.prank(alice);
            staking.stake(id, piece);
            skip(1);
        }
        assertEq(staking.lotCount(id, alice), 16);

        (uint128 lastAmt, uint64 lastUnlock) = staking.lotAt(id, alice, 15);
        vm.prank(alice);
        staking.stake(id, piece);
        assertEq(staking.lotCount(id, alice), 16);

        (uint128 mergedAmt, uint64 mergedUnlock) = staking.lotAt(id, alice, 15);
        assertEq(mergedAmt, lastAmt + piece);
        assertGe(mergedUnlock, lastUnlock);
    }

    function test_InsufficientStake() public {
        uint256 id = _pool(0);
        vm.prank(alice);
        staking.stake(id, STAKE);
        vm.prank(alice);
        vm.expectRevert(ArcFlowStaking.InsufficientStake.selector);
        staking.unstake(id, STAKE + 1);
    }

    function _pool(uint64 minLock) internal returns (uint256 id) {
        vm.prank(owner);
        id = staking.createPool(address(stakeToken), address(rewardToken), minLock);
        vm.prank(owner);
        staking.fund(id, REWARD, 100 days);
    }
}
