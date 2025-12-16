// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/BirthdaySongs.sol";

contract DeployMainnet is Script {
    function run() external {
        // Base mainnet USDC address
        address USDC_ADDRESS = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
        
        // Platform wallet (dev/you) - receives $0.50 USDC per order
        address PLATFORM_ADDRESS = 0x9db1afA33E74111F80fc2A7cc458006F55AC76f4;
        
        // Creator wallet (Jose) - would normally receive sales minus fees
        // But since you're deploying, you'll be the owner and control withdrawals
        address CREATOR_ADDRESS = 0xD31C0C3BdDAcc482Aa5fE64d27cDDBaB72864733;
        
        // TEST SETTINGS FOR INITIAL DEPLOYMENT
        uint256 BIRTHDAY_PRICE = 0.01 * 1e6; // $0.01 in USDC (6 decimals)
        uint256 NATAL_PRICE = 0.01 * 1e6;    // $0.01 in USDC (6 decimals)
        uint256 PLATFORM_FEE = 0.005 * 1e6;  // $0.005 USDC platform fee for testing
        
        // Supply limits
        uint256 BIRTHDAY_SUPPLY = 25;
        uint256 NATAL_SUPPLY = 25;
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        BirthdaySongs birthdaySongs = new BirthdaySongs(
            USDC_ADDRESS,
            PLATFORM_ADDRESS
        );
        
        // Set prices (owner can call this)
        birthdaySongs.setPrices(BIRTHDAY_PRICE, NATAL_PRICE);
        
        // Set platform fee (only platform wallet can call this)
        // Since deployer IS the platform wallet, we can set it now
        birthdaySongs.setPlatformFee(PLATFORM_FEE);
        
        vm.stopBroadcast();
        
        console.log("====================================");
        console.log("BirthdaySongs deployed to Base mainnet!");
        console.log("====================================");
        console.log("Contract address:", address(birthdaySongs));
        console.log("USDC address:", USDC_ADDRESS);
        console.log("Platform address:", PLATFORM_ADDRESS);
        console.log("Creator address:", CREATOR_ADDRESS);
        console.log("");
        console.log("TEST PRICES:");
        console.log("Birthday Song: $0.01");
        console.log("Natal Chart Song: $0.01");
        console.log("");
        console.log("Supply Limits:");
        console.log("Birthday Songs: 25");
        console.log("Natal Chart Songs: 25");
        console.log("====================================");
        console.log("");
        console.log("IMPORTANT: These are TEST PRICES!");
        console.log("After testing, redeploy with real prices:");
        console.log("- Birthday Song: $25");
        console.log("- Natal Chart Song: $250");
        console.log("====================================");
    }
}