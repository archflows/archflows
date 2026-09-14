// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ArcFlow} from "../src/ArcFlow.sol";
import {ArcFlowStream} from "../src/ArcFlowStream.sol";
import {ArcFlowDistributor} from "../src/ArcFlowDistributor.sol";
import {ArcFlowEscrow} from "../src/ArcFlowEscrow.sol";
import {ArcFlowStaking} from "../src/ArcFlowStaking.sol";

/// @notice Deploys ArcFlow. Everything except the anti-dump lock sits behind a UUPS proxy.
/// @dev ArcFlow.sol is deployed raw on purpose: a lock that an owner could upgrade would not
///      prove anything to holders.
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

        vm.startBroadcast();

        d.locks = address(new ArcFlow());

        d.stream = _proxy(address(new ArcFlowStream()), abi.encodeCall(ArcFlowStream.initialize, (owner)));
        d.distributor = _proxy(
            address(new ArcFlowDistributor()),
            abi.encodeCall(ArcFlowDistributor.initialize, (owner, ArcFlowStream(d.stream)))
        );
        d.escrow = _proxy(address(new ArcFlowEscrow()), abi.encodeCall(ArcFlowEscrow.initialize, (owner)));
        d.staking = _proxy(address(new ArcFlowStaking()), abi.encodeCall(ArcFlowStaking.initialize, (owner)));

        vm.stopBroadcast();

        console2.log("owner                       ", owner);
        console2.log("ArcFlow (locks, immutable)  ", d.locks);
        console2.log("ArcFlowStream (proxy)       ", d.stream);
        console2.log("ArcFlowDistributor (proxy)  ", d.distributor);
        console2.log("ArcFlowEscrow (proxy)       ", d.escrow);
        console2.log("ArcFlowStaking (proxy)      ", d.staking);
    }

    function _proxy(address implementation, bytes memory initData) internal returns (address) {
        return address(new ERC1967Proxy(implementation, initData));
    }
}
