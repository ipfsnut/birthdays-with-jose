// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BirthdaySongs} from "../contracts/BirthdaySongs.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock USDC contract for local testing
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {
        // Mint 1 million USDC to deployer for testing
        _mint(msg.sender, 1_000_000 * 10**6);
    }
    
    function decimals() public pure override returns (uint8) {
        return 6; // USDC has 6 decimals
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Mock USDC
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));
        
        // Deploy BirthdaySongs contract
        address platformWallet = vm.addr(deployerPrivateKey); // Use deployer as platform wallet
        BirthdaySongs birthdaySongs = new BirthdaySongs(
            address(usdc),
            platformWallet
        );
        console.log("BirthdaySongs deployed at:", address(birthdaySongs));
        console.log("Platform wallet:", platformWallet);
        
        // Mint some USDC to test accounts
        address account1 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8; // Second anvil account
        address account2 = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC; // Third anvil account
        
        usdc.mint(account1, 10_000 * 10**6); // 10,000 USDC
        usdc.mint(account2, 10_000 * 10**6); // 10,000 USDC
        
        console.log("Minted 10,000 USDC to account1:", account1);
        console.log("Minted 10,000 USDC to account2:", account2);
        
        vm.stopBroadcast();
    }
}