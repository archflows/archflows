// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ArcFlowStaking} from "../src/ArcFlowStaking.sol";
import {Deployers} from "./helpers/Deployers.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

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

    function _pool(uint64 minLock) internal returns (uint256 id) {
        vm.prank(owner);
        id = staking.createPool(address(stakeToken), address(rewardToken), minLock);
        vm.prank(owner);
        staking.fund(id, REWARD, 100 days);
    }
}
