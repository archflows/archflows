// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {arcflowsLocker as ArcFlow} from "../src/arcflows.sol";
import {ArcFlowStream} from "../src/ArcFlowStream.sol";
import {Deployers} from "./helpers/Deployers.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

/// @dev A later version that adds behaviour and state without moving existing slots.
contract ArcFlowStreamV2 is ArcFlowStream {
    function version() external pure returns (string memory) {
        return "v2";
    }
}

contract ArcFlowLockV2 is ArcFlow {
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

    /// @dev Locker is UUPS now. Implementation cannot be initialized directly.
    function test_LockImplementationCannotBeInitializedDirectly() public {
        ArcFlow impl = new ArcFlow();
        vm.expectRevert();
        impl.initialize(attacker, address(1), address(2));
    }

    function test_LockProxyCannotBeReinitialized() public {
        ArcFlow locks = Deployers.lock(owner, address(1), address(2));
        vm.expectRevert();
        locks.initialize(attacker, address(1), address(2));
    }

    function test_LockOwnerUpgradesAndStateSurvives() public {
        ArcFlow locks = Deployers.lock(owner, address(1), address(2));
        address referralWallet = makeAddr("referralWallet");
        address v2 = address(new ArcFlowLockV2());
        vm.prank(owner);
        locks.upgradeToAndCall(v2, abi.encodeCall(ArcFlow.initializeV2, (referralWallet)));
        assertEq(ArcFlowLockV2(address(locks)).version(), "v2");
        assertEq(locks.usdc(), address(1));
        assertEq(locks.treasury(), address(2));
        assertEq(locks.referralWallet(), referralWallet);
        assertEq(locks.referralRateBps(), locks.DEFAULT_REFERRAL_RATE_BPS());
        assertEq(locks.owner(), owner);
    }

    function test_LockNonOwnerCannotUpgrade() public {
        ArcFlow locks = Deployers.lock(owner, address(1), address(2));
        address v2 = address(new ArcFlowLockV2());
        vm.prank(attacker);
        vm.expectRevert();
        locks.upgradeToAndCall(v2, "");
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
