// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
}

/// @notice One-time: referral pool wallet approves the lock proxy to pull USDC on claims.
/// @dev Run with the pool wallet key:
///   ARCFLOW_PROXY=<lock proxy> ARCFLOW_REFERRAL_WALLET=<pool> \
///   forge script script/ApproveReferralPool.s.sol:ApproveReferralPool \
///     --rpc-url $ARC_MAINNET_RPC_URL --private-key $ARCFLOW_REFERRAL_POOL_KEY --broadcast
contract ApproveReferralPool is Script {
    function run() external {
        address proxy = vm.envAddress("ARCFLOW_PROXY");
        address pool = vm.envAddress("ARCFLOW_REFERRAL_WALLET");
        address usdc = vm.envAddress("USDC_ADDRESS");
        vm.startBroadcast();
        IERC20(usdc).approve(proxy, type(uint256).max);
        vm.stopBroadcast();

        console2.log("pool", pool);
        console2.log("approved lock proxy", proxy);
    }
}
