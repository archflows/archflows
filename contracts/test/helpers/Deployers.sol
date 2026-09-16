// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {arcflows as ArcFlow} from "../../src/ArcFlow.sol";
import {ArcFlowDistributor} from "../../src/ArcFlowDistributor.sol";
import {ArcFlowEscrow} from "../../src/ArcFlowEscrow.sol";
import {ArcFlowStaking} from "../../src/ArcFlowStaking.sol";
import {ArcFlowStream} from "../../src/ArcFlowStream.sol";

/// @notice Deploys the proxied contracts exactly the way script/Deploy.s.sol does, so tests run
///         against the same shape as production instead of bare implementations.
library Deployers {
    function lock(address owner, address usdc, address treasury) internal returns (ArcFlow) {
        address impl = address(new ArcFlow());
        bytes memory data = abi.encodeCall(ArcFlow.initialize, (owner, usdc, treasury));
        return ArcFlow(address(new ERC1967Proxy(impl, data)));
    }

    function stream(address owner) internal returns (ArcFlowStream) {
        address impl = address(new ArcFlowStream());
        bytes memory data = abi.encodeCall(ArcFlowStream.initialize, (owner));
        return ArcFlowStream(address(new ERC1967Proxy(impl, data)));
    }

    function distributor(address owner, ArcFlowStream stream_) internal returns (ArcFlowDistributor) {
        address impl = address(new ArcFlowDistributor());
        bytes memory data = abi.encodeCall(ArcFlowDistributor.initialize, (owner, stream_));
        return ArcFlowDistributor(address(new ERC1967Proxy(impl, data)));
    }

    function escrow(address owner) internal returns (ArcFlowEscrow) {
        address impl = address(new ArcFlowEscrow());
        bytes memory data = abi.encodeCall(ArcFlowEscrow.initialize, (owner));
        return ArcFlowEscrow(address(new ERC1967Proxy(impl, data)));
    }

    function staking(address owner) internal returns (ArcFlowStaking) {
        address impl = address(new ArcFlowStaking());
        bytes memory data = abi.encodeCall(ArcFlowStaking.initialize, (owner));
        return ArcFlowStaking(address(new ERC1967Proxy(impl, data)));
    }
}
