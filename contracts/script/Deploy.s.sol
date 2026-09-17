// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {arcflowsLocker as ArcFlow} from "../src/arcflows.sol";
import {ArcFlowStream} from "../src/ArcFlowStream.sol";
import {ArcFlowDistributor} from "../src/ArcFlowDistributor.sol";
import {ArcFlowEscrow} from "../src/ArcFlowEscrow.sol";
import {ArcFlowStaking} from "../src/ArcFlowStaking.sol";

/// @notice Deploys arcflows. Every module, including the locker, sits behind a UUPS proxy.
contract Deploy is Script {
    struct Deployment {
        address locks;
        address stream;
        address distributor;
        address escrow;
        address staking;
    }

    function run() external returns (Deployment memory d) {
        address owner = vm.envOr("ARCFLOW_OWNER", msg.sender);
        address treasury = vm.envOr("ARCFLOW_TREASURY", owner);
        // Arc USDC ERC-20 view (6 decimals). Same asset as gas — never send native value as the lock fee.
        address usdc = 0x3600000000000000000000000000000000000000;

        vm.startBroadcast();

        d.locks = _proxy(address(new ArcFlow()), abi.encodeCall(ArcFlow.initialize, (owner, usdc, treasury)));

        d.stream = _proxy(address(new ArcFlowStream()), abi.encodeCall(ArcFlowStream.initialize, (owner)));
        d.distributor = _proxy(
            address(new ArcFlowDistributor()),
            abi.encodeCall(ArcFlowDistributor.initialize, (owner, ArcFlowStream(d.stream)))
        );
        d.escrow = _proxy(address(new ArcFlowEscrow()), abi.encodeCall(ArcFlowEscrow.initialize, (owner)));
        d.staking = _proxy(address(new ArcFlowStaking()), abi.encodeCall(ArcFlowStaking.initialize, (owner)));

        vm.stopBroadcast();

        console2.log("owner                       ", owner);
        console2.log("treasury                    ", treasury);
        console2.log("arcflows locker (proxy)     ", d.locks);
        console2.log("ArcFlowStream (proxy)       ", d.stream);
        console2.log("ArcFlowDistributor (proxy)  ", d.distributor);
        console2.log("ArcFlowEscrow (proxy)       ", d.escrow);
        console2.log("ArcFlowStaking (proxy)      ", d.staking);
    }

    function _proxy(address implementation, bytes memory initData) internal returns (address) {
        return address(new ERC1967Proxy(implementation, initData));
    }
}
