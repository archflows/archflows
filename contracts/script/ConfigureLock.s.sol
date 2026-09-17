// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {arcflowsLocker as ArcFlow} from "../src/arcflows.sol";

/// @notice Owner-only post-upgrade setup for the lock proxy.
/// @dev Set any of ARCFLOW_TREASURY / ARCFLOW_REFERRAL_WALLET / ARCFLOW_REFERRAL_RATE_BPS.
contract ConfigureLock is Script {
    function run() external {
        address proxy = vm.envAddress("ARCFLOW_PROXY");
        uint256 pk = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(pk);
        ArcFlow locks = ArcFlow(proxy);

        address treasury = vm.envOr("ARCFLOW_TREASURY", address(0));
        if (treasury != address(0)) {
            locks.setTreasury(treasury);
            console2.log("treasury set to", treasury);
        }

        address referralWallet = vm.envOr("ARCFLOW_REFERRAL_WALLET", address(0));
        if (referralWallet != address(0)) {
            locks.setReferralWallet(referralWallet);
            console2.log("referralWallet set to", referralWallet);
        }

        address withdrawExecutor = vm.envOr("ARCFLOW_WITHDRAW_EXECUTOR", address(0));
        if (withdrawExecutor != address(0)) {
            locks.setWithdrawExecutor(withdrawExecutor);
            console2.log("withdrawExecutor set to", withdrawExecutor);
        }

        uint256 rateBps = vm.envOr("ARCFLOW_REFERRAL_RATE_BPS", uint256(0));
        if (rateBps > 0) {
            locks.setReferralRateBps(uint16(rateBps));
            console2.log("referralRateBps set to", rateBps);
        }

        vm.stopBroadcast();
        console2.log("proxy", proxy);
    }
}
