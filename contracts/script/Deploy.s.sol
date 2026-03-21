// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/OrionVault.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        OrionVault vault = new OrionVault();
        console.log("OrionVault deployed at:", address(vault));
        vm.stopBroadcast();
    }
}
