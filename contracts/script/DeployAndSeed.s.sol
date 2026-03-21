// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockUSDT.sol";
import "../src/OrionVault.sol";

contract DeployAndSeed is Script {
    // Deployed OrionVault on Sepolia
    address constant VAULT = 0xeB7e65Ba425DFCeEb8ccF3e4BE5196e33A91bc66;

    // Agent wallet addresses (WDK HD-derived)
    address constant ALPHA   = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address constant BETA    = 0x9858EfFD232B4033E47d90003D41EC34EcaEda94;
    address constant GAMMA   = 0xfc2077CA7F403cBECA41B1B0F62D91B5EA631B5E;
    address constant DELTA   = 0x58A57ed9d8d624cBD12e2C467D34787555bB1b25;
    address constant EPSILON = 0x3061750d3dF69ef7B8d4407CB7f3F879Fd9d2398;

    function run() external {
        vm.startBroadcast();

        address deployer = msg.sender;

        // 1. Deploy MockUSDT
        MockUSDT usdt = new MockUSDT(deployer);
        console.log("MockUSDT deployed at:", address(usdt));

        // 2. Add token to vault
        OrionVault vault = OrionVault(VAULT);
        vault.addSupportedToken(address(usdt));
        console.log("Token added to vault");

        // 3. Bootstrap all 5 agents on-chain
        vault.bootstrapAgent(ALPHA,   "Alpha");
        vault.bootstrapAgent(BETA,    "Beta");
        vault.bootstrapAgent(GAMMA,   "Gamma");
        vault.bootstrapAgent(DELTA,   "Delta");
        vault.bootstrapAgent(EPSILON, "Epsilon");
        console.log("All 5 agents bootstrapped on-chain");

        // 4. Deposit 100,000 USDT into treasury
        usdt.approve(VAULT, 100_000 * 1e6);
        vault.deposit(address(usdt), 100_000 * 1e6);
        console.log("Deposited 100,000 USDT into OrionVault treasury");

        // 5. Log summary
        console.log("---");
        console.log("USDT_ADDRESS=", address(usdt));
        console.log("VAULT_ADDRESS=", VAULT);
        console.log("Treasury balance:", vault.treasuryBalance(address(usdt)));

        vm.stopBroadcast();
    }
}
