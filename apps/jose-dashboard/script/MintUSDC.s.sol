// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

interface IERC20Mint {
    function mint(address to, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

contract MintUSDC is Script {
    function run() external {
        address usdc = 0x5FbDB2315678afecb367f032d93F642f64180aa3;
        
        // Your MetaMask address
        address yourAddress = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
        
        vm.startBroadcast();
        
        // Mint 10,000 USDC (10,000 * 10^6)
        IERC20Mint(usdc).mint(yourAddress, 10000 * 1e6);
        
        vm.stopBroadcast();
        
        // Check balance
        uint256 balance = IERC20Mint(usdc).balanceOf(yourAddress);
        console.log("New USDC balance for %s: %d USDC", yourAddress, balance / 1e6);
    }
}