// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {arcflowsLocker as ArcFlow} from "../src/arcflows.sol";
import {ArcFlowStream} from "../src/ArcFlowStream.sol";
import {ArcFlowDistributor} from "../src/ArcFlowDistributor.sol";
import {ArcFlowEscrow} from "../src/ArcFlowEscrow.sol";
import {ArcFlowStaking} from "../src/ArcFlowStaking.sol";

/// @notice Points an existing proxy at a freshly deployed implementation.
/// @dev Run with ARCFLOW_TARGET set to one of: lock, stream, distributor, escrow, staking.
///      Example: ARCFLOW_PROXY=0x... ARCFLOW_TARGET=lock forge script script/Upgrade.s.sol ...
contract Upgrade is Script {
    error UnknownTarget(string target);

    function run() external returns (address implementation) {
        address proxy = vm.envAddress("ARCFLOW_PROXY");
        string memory target = vm.envString("ARCFLOW_TARGET");
        bytes32 key = keccak256(bytes(target));

        vm.startBroadcast();

        if (key == keccak256("lock")) {
            implementation = address(new ArcFlow());
            bytes memory initData;
            if (vm.envOr("ARCFLOW_LOCK_INIT_V3", false)) {
                address withdrawExecutor = vm.envOr("ARCFLOW_WITHDRAW_EXECUTOR", address(0));
                initData = abi.encodeCall(ArcFlow.initializeV3, (withdrawExecutor));
            }
            UUPSUpgradeable(proxy).upgradeToAndCall(implementation, initData);
        } else if (key == keccak256("stream")) {
            implementation = address(new ArcFlowStream());
        } else if (key == keccak256("distributor")) {
            implementation = address(new ArcFlowDistributor());
        } else if (key == keccak256("escrow")) {
            implementation = address(new ArcFlowEscrow());
        } else if (key == keccak256("staking")) {
            implementation = address(new ArcFlowStaking());
        } else {
            revert UnknownTarget(target);
        }

        if (key != keccak256("lock")) {
            UUPSUpgradeable(proxy).upgradeToAndCall(implementation, "");
        }

        vm.stopBroadcast();

        console2.log("proxy         ", proxy);
        console2.log("new implementation", implementation);
    }
}
