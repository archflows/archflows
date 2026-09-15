// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockToken} from "../src/mocks/MockToken.sol";

/// @notice Deploys ArcFlow Mock Token on Arc Testnet and seeds the deployer.
contract DeployMockToken is Script {
    function run() external returns (address token) {
        string memory name_ = vm.envOr("MOCK_TOKEN_NAME", string("ArcFlow Mock"));
        string memory symbol_ = vm.envOr("MOCK_TOKEN_SYMBOL", string("AFMOCK"));
        uint8 decimals_ = uint8(vm.envOr("MOCK_TOKEN_DECIMALS", uint256(18)));
        uint256 seed = vm.envOr("MOCK_TOKEN_SEED", uint256(1_000_000 ether));

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);
        MockToken t = new MockToken(name_, symbol_, decimals_);
        t.mint(deployer, seed);
        vm.stopBroadcast();

        token = address(t);
        console2.log("MockToken                   ", token);
        console2.log("name                        ", name_);
        console2.log("symbol                      ", symbol_);
        console2.log("decimals                    ", decimals_);
        console2.log("seeded to deployer          ", seed);
    }
}
