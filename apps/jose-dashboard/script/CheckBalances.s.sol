// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CheckBalances is Script {
    function run() external view {
        address usdc = 0x5FbDB2315678afecb367f032d93F642f64180aa3;
        address account1 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        address account2 = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
        
        console.log("USDC Balances:");
        console.log("Account1 (%s): %d USDC", account1, IERC20(usdc).balanceOf(account1) / 1e6);
        console.log("Account2 (%s): %d USDC", account2, IERC20(usdc).balanceOf(account2) / 1e6);
    }
}