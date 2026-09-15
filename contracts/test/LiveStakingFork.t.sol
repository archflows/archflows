// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ArcFlowStaking} from "../src/ArcFlowStaking.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

/// @notice Exercises the live Arc Testnet proxy bytecode on a local fork (no broadcast).
contract LiveStakingForkTest is Test {
    ArcFlowStaking constant staking = ArcFlowStaking(0x2627e3f07574F47b2B5bc3EfD774576357658063);
    address constant OWNER = 0x63B2614f9AE9eAe20483aD24718B419891A2657D;
    bytes32 constant IMPL_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    address constant EXPECTED_IMPL = 0xB620276470dE35cC83484fAf2432aB887f4A87bE;

    function setUp() public {
        vm.createSelectFork("https://rpc.testnet.arc.network");
    }

    function test_LiveImplementationAndCaps() public view {
        address impl = address(uint160(uint256(vm.load(address(staking), IMPL_SLOT))));
        assertEq(impl, EXPECTED_IMPL);
        assertEq(staking.owner(), OWNER);
        assertEq(staking.MAX_MIN_LOCK(), 730 days);
        assertEq(staking.MAX_FUND_DURATION(), 3650 days);
        assertEq(staking.MAX_LOTS(), 16);
        assertFalse(staking.protocolPaused());
    }

    function test_LiveMinLockCapReverts() public {
        uint64 tooLong = staking.MAX_MIN_LOCK() + 1;
        vm.expectRevert(ArcFlowStaking.InvalidLock.selector);
        staking.createPool(address(1), address(2), tooLong);
    }

    function test_LiveCreateFundStakeUnstakeRecover() public {
        MockERC20 stakeTok = new MockERC20(0);
        MockERC20 rewardTok = new MockERC20(0);
        address alice = makeAddr("alice");
        address funder = makeAddr("funder");

        stakeTok.mint(alice, 10e18);
        rewardTok.mint(funder, 100e18);

        vm.prank(funder);
        uint256 id = staking.createPool(address(stakeTok), address(rewardTok), 0);
        vm.prank(funder);
        rewardTok.approve(address(staking), type(uint256).max);
        vm.prank(funder);
        staking.fund(id, 100e18, 100 days);

        vm.prank(alice);
        stakeTok.approve(address(staking), type(uint256).max);
        vm.prank(alice);
        staking.stake(id, 10e18);
        assertEq(staking.unlockedOf(id, alice), 10e18);
        assertEq(staking.lotCount(id, alice), 1);

        skip(1 days);
        assertGt(staking.earned(id, alice), 0);

        vm.prank(alice);
        staking.unstake(id, 10e18);
        assertEq(stakeTok.balanceOf(alice), 10e18);
        assertGt(rewardTok.balanceOf(alice), 0);

        vm.prank(funder);
        uint256 recovered = staking.recoverRewards(id);
        assertGt(recovered, 0);
        assertEq(rewardTok.balanceOf(funder) + rewardTok.balanceOf(alice), 100e18);
    }

    function test_LiveNonOwnerCannotUpgrade() public {
        address impl = address(new ArcFlowStaking());
        vm.prank(makeAddr("stranger"));
        vm.expectRevert();
        staking.upgradeToAndCall(impl, "");
    }
}
