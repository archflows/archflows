// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Mintable ERC-20 for Arc Testnet demos (lock / vest / stake / airdrop).
/// @dev Anyone can mint — testnet faucet style. Do not deploy to mainnet.
contract MockToken is ERC20 {
    uint8 private immutable _decimals;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /// @notice Faucet mint. Cap per call keeps accidental spam bounded.
    function mint(address to, uint256 amount) external {
        if (amount > 1_000_000 * 10 ** uint256(_decimals)) revert();
        _mint(to, amount);
    }
}
