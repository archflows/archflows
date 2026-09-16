// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {arcflows as ArcFlow} from "../src/ArcFlow.sol";

/// @notice Deploys only the UUPS lock vault. Stream/escrow/staking proxies stay as they are.
contract DeployLock is Script {
    function run() external returns (address locks) {
        address owner = vm.envOr("ARCFLOW_OWNER", msg.sender);
        address treasury = vm.envOr("ARCFLOW_TREASURY", owner);
        address usdc = 0x3600000000000000000000000000000000000000;

        vm.startBroadcast();
        address impl = address(new ArcFlow());
        locks = address(new ERC1967Proxy(impl, abi.encodeCall(ArcFlow.initialize, (owner, usdc, treasury))));
        vm.stopBroadcast();

        console2.log("owner                       ", owner);
        console2.log("treasury                    ", treasury);
        console2.log("usdc (ERC-20, 6 decimals)   ", usdc);
        console2.log("arcflows locker (proxy)     ", locks);
        console2.log("implementation              ", impl);
    }
}
