// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ArcFlowStaking} from "../src/ArcFlowStaking.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";

/// @notice Live smoke test against the upgraded Arc Testnet staking proxy.
contract SmokeStaking is Script {
    address constant PROXY = 0x2627e3f07574F47b2B5bc3EfD774576357658063;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address me = vm.addr(pk);
        ArcFlowStaking staking = ArcFlowStaking(PROXY);

        require(staking.owner() == me, "not protocol owner");
        require(staking.MAX_MIN_LOCK() == 730 days, "lock cap");
        require(staking.MAX_LOTS() == 16, "lot cap");

        uint256 beforeId = staking.nextId();
        uint128 stakeAmt = 10e18;
        uint256 rewardAmt = 100e18;

        vm.startBroadcast(pk);

        MockERC20 stakeTok = new MockERC20(0);
        MockERC20 rewardTok = new MockERC20(0);
        stakeTok.mint(me, stakeAmt);
        rewardTok.mint(me, rewardAmt);
        stakeTok.approve(address(staking), type(uint256).max);
        rewardTok.approve(address(staking), type(uint256).max);

        uint256 id = staking.createPool(address(stakeTok), address(rewardTok), 0);
        staking.fund(id, rewardAmt, 100 days);
        staking.stake(id, stakeAmt);

        require(staking.unlockedOf(id, me) == stakeAmt, "minLock 0 must unlock now");
        require(staking.lotCount(id, me) == 1, "one lot");

        staking.unstake(id, stakeAmt);
        require(stakeTok.balanceOf(me) == stakeAmt, "principal returned");

        uint256 recovered = staking.recoverRewards(id);
        require(recovered > 0, "unused rewards recoverable");
        require(rewardTok.balanceOf(me) == rewardAmt, "rewards fully back to owner");

        vm.stopBroadcast();

        console2.log("proxy        ", PROXY);
        console2.log("pool id      ", id);
        console2.log("nextId before", beforeId);
        console2.log("stake token  ", address(stakeTok));
        console2.log("reward token ", address(rewardTok));
        console2.log("recovered    ", recovered);
        console2.log("SMOKE_OK");
    }
}
