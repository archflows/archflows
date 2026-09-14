// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ArcFlowDistributor} from "../src/ArcFlowDistributor.sol";
import {ArcFlowEscrow} from "../src/ArcFlowEscrow.sol";
import {ArcFlowStaking} from "../src/ArcFlowStaking.sol";
import {ArcFlowStream} from "../src/ArcFlowStream.sol";
import {Deployers} from "./helpers/Deployers.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

/// @dev Rejects transfers to a denylisted address, the way Arc USDC blocks addresses.
contract BlocklistERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public blocked;

    function setBlocked(address who, bool value) external {
        blocked[who] = value;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(!blocked[to], "blocked");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(!blocked[to], "blocked");
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// @notice Regression tests for the findings fixed after the first audit pass.
contract SecurityTest is Test {
    ArcFlowStream stream;
    ArcFlowDistributor dist;
    ArcFlowEscrow escrow;
    ArcFlowStaking staking;
    MockERC20 token;

    address funder = makeAddr("funder");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        vm.warp(1_700_000_000);
        stream = Deployers.stream(address(this));
        dist = Deployers.distributor(address(this), stream);
        escrow = Deployers.escrow(address(this));
        staking = Deployers.staking(address(this));
        token = new MockERC20(0);
    }

    // --- H-1: the funder must not be able to pull an airdrop back mid-window ---

    function test_FunderCannotClawbackBeforeWindowCloses() public {
        (uint256 id, bytes32 siblingOfAlice) = _campaign(0);

        skip(1 days);
        vm.prank(funder);
        vm.expectRevert(ArcFlowDistributor.TooEarly.selector);
        dist.clawback(id);

        // Claims still work for the whole window.
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = siblingOfAlice;
        dist.claim(id, 0, alice, 100e18, proof);
        assertEq(token.balanceOf(alice), 100e18);
    }

    function test_ClawbackOnlyTakesTheUnclaimedRemainder() public {
        (uint256 id, bytes32 siblingOfAlice) = _campaign(0);
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = siblingOfAlice;
        dist.claim(id, 0, alice, 100e18, proof);

        skip(8 days);
        vm.prank(funder);
        assertEq(dist.clawback(id), 200e18);

        vm.prank(funder);
        vm.expectRevert(ArcFlowDistributor.NothingToClawback.selector);
        dist.clawback(id);
    }

    // --- H-2: a recipient that cannot receive tokens must not trap the sender's refund ---

    function test_BlockedRecipientCannotTrapSenderRefund() public {
        BlocklistERC20 usdc = new BlocklistERC20();
        usdc.mint(alice, 1_000e18);

        vm.startPrank(alice);
        usdc.approve(address(stream), type(uint256).max);
        uint256 id = _open(address(usdc), 1_000e18, true, false);
        vm.stopPrank();

        skip(10 days);
        usdc.setBlocked(bob, true);

        vm.prank(alice);
        (uint128 claimable, uint128 refunded) = stream.cancel(id);
        assertEq(refunded, 900e18);
        assertEq(claimable, 100e18);
        assertEq(usdc.balanceOf(alice), 900e18, "sender gets the unvested part back");

        // Bob's own withdrawal is the only thing his blocklist status can break.
        vm.prank(bob);
        vm.expectRevert();
        stream.withdraw(id);

        usdc.setBlocked(bob, false);
        vm.prank(bob);
        stream.withdraw(id);
        assertEq(usdc.balanceOf(bob), 100e18);
    }

    // --- H-3: topping up must not unlock time that already passed ---

    function test_TopUpCannotBeDrainedImmediately() public {
        token.mint(alice, 2_000e18);
        vm.startPrank(alice);
        token.approve(address(stream), type(uint256).max);
        uint256 id = _open(address(token), 1_000e18, false, true);
        vm.stopPrank();

        skip(90 days);
        vm.prank(alice);
        stream.topUp(id, 1_000e18);

        assertEq(stream.withdrawable(id), 900e18, "fresh funds must not be instantly claimable");

        vm.prank(bob);
        stream.withdraw(id);
        assertEq(token.balanceOf(bob), 900e18);
        assertEq(token.balanceOf(address(stream)), 1_100e18);
    }

    // --- M-1: a shortfall must stay owed instead of being wiped ---

    function test_RewardShortfallStaysOwed() public {
        MockERC20 stakeTok = new MockERC20(0);
        MockERC20 rewardTok = new MockERC20(0);
        stakeTok.mint(alice, 100e18);
        rewardTok.mint(funder, 100e18);

        vm.prank(alice);
        stakeTok.approve(address(staking), type(uint256).max);
        vm.prank(funder);
        rewardTok.approve(address(staking), type(uint256).max);

        vm.prank(funder);
        uint256 id = staking.createPool(address(stakeTok), address(rewardTok), 0);
        vm.prank(funder);
        staking.fund(id, 100e18, 100 days);
        vm.prank(alice);
        staking.stake(id, 100e18);

        skip(100 days);
        uint256 owed = staking.earned(id, alice);
        vm.prank(alice);
        assertEq(staking.getReward(id), owed);
        assertEq(staking.earned(id, alice), 0);
    }

    // --- M-2: an empty pool must not burn the reward schedule ---

    function test_IdlePoolDoesNotLoseRewards() public {
        MockERC20 stakeTok = new MockERC20(0);
        MockERC20 rewardTok = new MockERC20(0);
        stakeTok.mint(alice, 100e18);
        rewardTok.mint(funder, 100e18);

        vm.prank(alice);
        stakeTok.approve(address(staking), type(uint256).max);
        vm.prank(funder);
        rewardTok.approve(address(staking), type(uint256).max);

        vm.prank(funder);
        uint256 id = staking.createPool(address(stakeTok), address(rewardTok), 0);
        vm.prank(funder);
        staking.fund(id, 100e18, 100 days);

        // Nobody stakes for the first half of the schedule.
        skip(50 days);
        vm.prank(alice);
        staking.stake(id, 100e18);

        skip(100 days);
        vm.prank(alice);
        uint256 paid = staking.getReward(id);
        assertApproxEqAbs(paid, 100e18, 1e10, "idle time is pushed out, not burned");
    }

    // --- S-I3: a blocked reward token must not trap the staked principal ---

    function test_BlockedRewardDoesNotTrapStake() public {
        MockERC20 stakeTok = new MockERC20(0);
        BlocklistERC20 rewardTok = new BlocklistERC20();
        stakeTok.mint(alice, 100e18);
        rewardTok.mint(funder, 100e18);

        vm.prank(alice);
        stakeTok.approve(address(staking), type(uint256).max);
        vm.prank(funder);
        rewardTok.approve(address(staking), type(uint256).max);

        vm.prank(funder);
        uint256 id = staking.createPool(address(stakeTok), address(rewardTok), 0);
        vm.prank(funder);
        staking.fund(id, 100e18, 100 days);
        vm.prank(alice);
        staking.stake(id, 100e18);

        skip(10 days);
        rewardTok.setBlocked(alice, true);

        vm.prank(alice);
        vm.expectRevert();
        staking.unstake(id, 100e18);

        vm.prank(alice);
        staking.unstakeOnly(id, 100e18);
        assertEq(stakeTok.balanceOf(alice), 100e18);

        rewardTok.setBlocked(alice, false);
        vm.prank(alice);
        staking.getReward(id);
        assertGt(rewardTok.balanceOf(alice), 0);
    }

    // --- M-4: the buyer must always keep a way out ---

    function test_EscrowRejectsMissingTimeout() public {
        uint64 tooLong = escrow.MAX_TIMEOUT() + 1;
        token.mint(alice, 500e18);

        vm.startPrank(alice);
        token.approve(address(escrow), type(uint256).max);
        vm.expectRevert(ArcFlowEscrow.InvalidTimeout.selector);
        escrow.create(address(token), bob, 500e18, 0, bytes32(0));
        vm.expectRevert(ArcFlowEscrow.InvalidTimeout.selector);
        escrow.create(address(token), bob, 500e18, tooLong, bytes32(0));
        vm.stopPrank();
    }

    function test_EscrowBuyerAlwaysGetsARefundDate() public {
        token.mint(alice, 500e18);
        vm.startPrank(alice);
        token.approve(address(escrow), type(uint256).max);
        uint256 id = escrow.create(address(token), bob, 500e18, 3 days, bytes32(0));
        vm.stopPrank();

        skip(3 days);
        vm.prank(alice);
        escrow.refund(id);
        assertEq(token.balanceOf(alice), 500e18);
    }

    /// @dev Opens a 100-day linear stream from the current prank to `bob`.
    function _open(address tok, uint128 amount, bool cancelable, bool canTopup) internal returns (uint256) {
        uint64 nowTs = uint64(block.timestamp);
        return stream.create(
            ArcFlowStream.CreateParams({
                token: tok,
                recipient: bob,
                amount: amount,
                start: nowTs,
                cliff: nowTs,
                end: nowTs + 100 days,
                period: 1,
                cancelable: cancelable,
                transferable: false,
                canTopup: canTopup
            })
        );
    }

    function _campaign(uint64 vestDuration) internal returns (uint256 id, bytes32 siblingOfAlice) {
        token.mint(funder, 300e18);
        vm.prank(funder);
        token.approve(address(dist), type(uint256).max);

        bytes32 leafA = keccak256(bytes.concat(keccak256(abi.encode(uint256(0), alice, uint128(100e18)))));
        bytes32 leafB = keccak256(bytes.concat(keccak256(abi.encode(uint256(1), bob, uint128(200e18)))));
        bytes32 root =
            leafA < leafB ? keccak256(abi.encodePacked(leafA, leafB)) : keccak256(abi.encodePacked(leafB, leafA));

        uint64 nowTs = uint64(block.timestamp);
        vm.prank(funder);
        id = dist.createCampaign(address(token), root, 300e18, nowTs, nowTs + 7 days, vestDuration, 0);
        siblingOfAlice = leafB;
    }
}
