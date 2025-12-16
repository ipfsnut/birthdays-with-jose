// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/BirthdaySongs.sol";

contract DeployOneContract is Script {
    function run() external {
        // Base mainnet addresses
        address USDC_ADDRESS = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
        address PLATFORM_WALLET = 0x9db1afA33E74111F80fc2A7cc458006F55AC76f4;  // Your dev wallet
        
        // Deploy with test prices initially
        uint256 TEST_BIRTHDAY_PRICE = 0.01 * 1e6;  // $0.01 for testing
        uint256 TEST_NATAL_PRICE = 0.01 * 1e6;     // $0.01 for testing
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy contract
        BirthdaySongs birthdaySongs = new BirthdaySongs(
            USDC_ADDRESS,
            PLATFORM_WALLET
        );
        
        // Set initial test prices
        birthdaySongs.setPrices(TEST_BIRTHDAY_PRICE, TEST_NATAL_PRICE);
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("====================================");
        console.log("BirthdaySongs deployed to Base mainnet!");
        console.log("====================================");
        console.log("Contract address:", address(birthdaySongs));
        console.log("Owner:", msg.sender);
        console.log("Platform wallet:", PLATFORM_WALLET);
        console.log("");
        console.log("Current prices (TEST MODE):");
        console.log("- Birthday Song: $0.01");
        console.log("- Natal Chart Song: $0.01");
        console.log("- Platform fee: $0.50 per order");
        console.log("");
        console.log("TEST MODE - Low prices for testing");
        console.log("====================================");
        console.log("");
        console.log("Next steps:");
        console.log("1. Test with a few orders at $0.01");
        console.log("2. Update prices to production ($25/$250):");
        console.log("   cast send <CONTRACT> \"setPrices(uint256,uint256)\" 25000000 250000000");
        console.log("3. Transfer ownership to Jose:");
        console.log("   cast send <CONTRACT> \"transferOwnership(address)\" 0xD31C0C3BdDAcc482Aa5fE64d27cDDBaB72864733");
        console.log("====================================");
    }
}