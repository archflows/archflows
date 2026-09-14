// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./IERC20.sol";

/// @notice ERC-20 helpers that credit the actual balance received (fee-on-transfer safe).
library TokenLib {
    error TransferFailed();
    error ZeroAmount();
    error AmountTooLarge();

    function pull(address token, address from, uint256 amount) internal returns (uint256 received) {
        uint256 before = IERC20(token).balanceOf(address(this));
        call(token, abi.encodeCall(IERC20.transferFrom, (from, address(this), amount)));
        received = IERC20(token).balanceOf(address(this)) - before;
        if (received == 0) revert ZeroAmount();
    }

    function pull128(address token, address from, uint256 amount) internal returns (uint128 received) {
        uint256 delta = pull(token, from, amount);
        if (delta > type(uint128).max) revert AmountTooLarge();
        // forge-lint: disable-next-line(unsafe-typecast)
        received = uint128(delta);
    }

    function push(address token, address to, uint256 amount) internal {
        if (amount == 0) return;
        call(token, abi.encodeCall(IERC20.transfer, (to, amount)));
    }

    function approve(address token, address spender, uint256 amount) internal {
        call(token, abi.encodeCall(IERC20.approve, (spender, amount)));
    }

    function call(address token, bytes memory payload) internal {
        (bool ok, bytes memory data) = token.call(payload);
        if (!ok) revert TransferFailed();
        if (data.length != 0 && (data.length < 32 || !abi.decode(data, (bool)))) revert TransferFailed();
    }
}
