// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title QUSDToken - Qualia USD Stablecoin
/// @notice ERC20 token used for X402 micropayments
/// @dev Mintable token with owner controls
contract QUSDToken is ERC20, Ownable {
    /// @notice Creates the QUSD token
    /// @param initialOwner Address that will own the contract and receive initial supply
    constructor(address initialOwner)
        ERC20("Qualia USD", "QUSD")
        Ownable(initialOwner)
    {
        // Mint initial supply of 1,000,000 QUSD to owner
        _mint(initialOwner, 1_000_000 * 10**decimals());
    }

    /// @notice Mints new QUSD tokens
    /// @param to Address to receive the minted tokens
    /// @param amount Amount of tokens to mint (in wei)
    /// @dev Only the contract owner can mint new tokens
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Returns the number of decimals for the token
    /// @return The number of decimals (18)
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
