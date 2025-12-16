// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/BirthdaySongs.sol";

contract DeployMainnetProduction is Script {
    function run() external {
        // Base mainnet USDC address
        address USDC_ADDRESS = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
        
        // Platform wallet (dev/you) - receives $0.50 USDC per order
        address PLATFORM_ADDRESS = 0x9db1afA33E74111F80fc2A7cc458006F55AC76f4;
        
        // Jose's wallet - will be the owner after transfer
        address JOSE_ADDRESS = 0xD31C0C3BdDAcc482Aa5fE64d27cDDBaB72864733;
        
        // PRODUCTION SETTINGS
        uint256 BIRTHDAY_PRICE = 25 * 1e6;   // $25 in USDC (6 decimals)
        uint256 NATAL_PRICE = 250 * 1e6;     // $250 in USDC (6 decimals)
        uint256 PLATFORM_FEE = 0.5 * 1e6;    // $0.50 USDC platform fee
        
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
        
        // Set platform fee (platform wallet can call this)
        birthdaySongs.setPlatformFee(PLATFORM_FEE);
        
        // Transfer ownership to Jose so he controls withdrawals
        birthdaySongs.transferOwnership(JOSE_ADDRESS);
        
        vm.stopBroadcast();
        
        console.log("====================================");
        console.log("BirthdaySongs PRODUCTION deployed to Base mainnet!");
        console.log("====================================");
        console.log("Contract address:", address(birthdaySongs));
        console.log("USDC address:", USDC_ADDRESS);
        console.log("Platform address:", PLATFORM_ADDRESS);
        console.log("Creator address:", CREATOR_ADDRESS);
        console.log("");
        console.log("PRODUCTION PRICES:");
        console.log("Birthday Song: $25");
        console.log("Natal Chart Song: $250");
        console.log("");
        console.log("Supply Limits:");
        console.log("Birthday Songs: 25");
        console.log("Natal Chart Songs: 25");
        console.log("====================================");
    }
}