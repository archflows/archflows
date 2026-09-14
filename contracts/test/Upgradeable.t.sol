// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ArcFlow} from "../src/ArcFlow.sol";
import {ArcFlowStream} from "../src/ArcFlowStream.sol";
import {Deployers} from "./helpers/Deployers.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

/// @dev A later version that adds behaviour and state without moving existing slots.
contract ArcFlowStreamV2 is ArcFlowStream {
    function version() external pure returns (string memory) {
        return "v2";
    }
}

contract UpgradeableTest is Test {
    ArcFlowStream stream;
    MockERC20 token;

    address owner = makeAddr("owner");
    address sender = makeAddr("sender");
    address recipient = makeAddr("recipient");
    address attacker = makeAddr("attacker");

    uint128 constant AMOUNT = 1_000e18;

    function setUp() public {
        vm.warp(1_700_000_000);
        stream = Deployers.stream(owner);
        token = new MockERC20(0);
        token.mint(sender, AMOUNT);
        vm.prank(sender);
        token.approve(address(stream), type(uint256).max);
    }

    function test_OwnerUpgradesAndStateSurvives() public {
        uint256 id = _open();
        skip(50 days);
        assertEq(stream.withdrawable(id), AMOUNT / 2);

        address v2 = address(new ArcFlowStreamV2());
        vm.prank(owner);
        stream.upgradeToAndCall(v2, "");

        // New logic is live.
        assertEq(ArcFlowStreamV2(address(stream)).version(), "v2");

        // Old positions are untouched and still claimable.
        assertEq(stream.withdrawable(id), AMOUNT / 2);
        vm.prank(recipient);
        stream.withdraw(id);
        assertEq(token.balanceOf(recipient), AMOUNT / 2);
        assertEq(stream.nextId(), 1);
    }

    function test_NonOwnerCannotUpgrade() public {
        address v2 = address(new ArcFlowStreamV2());
        vm.prank(attacker);
        vm.expectRevert();
        stream.upgradeToAndCall(v2, "");
    }

    function test_ImplementationCannotBeInitializedDirectly() public {
        ArcFlowStream impl = new ArcFlowStream();
        vm.expectRevert();
        impl.initialize(attacker);
    }

    function test_ProxyCannotBeReinitialized() public {
        vm.expectRevert();
        stream.initialize(attacker);
    }

    /// @dev The anti-dump lock is deployed raw, so it must not expose any upgrade hook.
    function test_LockContractHasNoUpgradePath() public {
        ArcFlow locks = new ArcFlow();
        (bool ok,) = address(locks).call(abi.encodeWithSignature("upgradeToAndCall(address,bytes)", address(1), ""));
        assertFalse(ok, "lock contract must not be upgradeable");

        (bool ownerCall,) = address(locks).call(abi.encodeWithSignature("owner()"));
        assertFalse(ownerCall, "lock contract must have no owner");
    }

    function _open() internal returns (uint256) {
        uint64 nowTs = uint64(block.timestamp);
        vm.prank(sender);
        return stream.create(
            ArcFlowStream.CreateParams({
                token: address(token),
                recipient: recipient,
                amount: AMOUNT,
                start: nowTs,
                cliff: nowTs,
                end: nowTs + 100 days,
                period: 1,
                cancelable: false,
                transferable: false,
                canTopup: false
            })
        );
    }
}
