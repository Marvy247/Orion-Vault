// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/OrionVault.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {
        _mint(msg.sender, 1_000_000 * 1e6);
    }
    function decimals() public pure override returns (uint8) { return 6; }
}

contract OrionVaultTest is Test {
    OrionVault vault;
    MockUSDT   usdt;

    address agent1    = address(0x1);
    address agent2    = address(0x2);
    address agent3    = address(0x3);
    address recipient = address(0x99);

    function setUp() public {
        vault = new OrionVault();
        usdt  = new MockUSDT();

        vault.addSupportedToken(address(usdt));
        vault.bootstrapAgent(agent1, "Alpha");
        vault.bootstrapAgent(agent2, "Beta");
        vault.bootstrapAgent(agent3, "Gamma");

        usdt.approve(address(vault), 100_000 * 1e6);
        vault.deposit(address(usdt), 100_000 * 1e6);
    }

    function test_AgentsRegistered() public view {
        assertEq(vault.getAgentCount(), 3);
        (address w,,,,,, ) = vault.agents(agent1);
        assertEq(w, agent1);
    }

    function test_TreasuryDeposit() public view {
        assertEq(vault.treasuryBalance(address(usdt)), 100_000 * 1e6);
    }

    function test_ProposeAndVoteAndExecute() public {
        vm.prank(agent1);
        uint256 pid = vault.propose(
            OrionVault.ProposalType.Transfer,
            "Send 1000 USDT to recipient",
            recipient, address(usdt), 1000 * 1e6, ""
        );

        vm.prank(agent1); vault.vote(pid, true);
        vm.prank(agent2); vault.vote(pid, true);
        vm.prank(agent3); vault.vote(pid, true);

        vm.warp(block.timestamp + 2 hours);
        vault.finalizeProposal(pid);

        OrionVault.ProposalStatus status = vault.getProposalStatus(pid);
        assertEq(uint8(status), uint8(OrionVault.ProposalStatus.Executed));
        assertEq(usdt.balanceOf(recipient), 1000 * 1e6);
    }

    function test_ProposalRejectedWithoutQuorum() public {
        vm.prank(agent1);
        uint256 pid = vault.propose(
            OrionVault.ProposalType.Transfer,
            "Rejected proposal",
            recipient, address(usdt), 500 * 1e6, ""
        );

        vm.prank(agent1); vault.vote(pid, true);
        vm.warp(block.timestamp + 2 hours);
        vault.finalizeProposal(pid);

        OrionVault.ProposalStatus status = vault.getProposalStatus(pid);
        assertEq(uint8(status), uint8(OrionVault.ProposalStatus.Rejected));
    }

    function test_ReputationRewardOnSuccess() public {
        (,, uint256 repBefore,,,,) = vault.agents(agent1);

        vm.prank(agent1);
        uint256 pid = vault.propose(
            OrionVault.ProposalType.Transfer, "Reward test",
            recipient, address(usdt), 100 * 1e6, ""
        );
        vm.prank(agent1); vault.vote(pid, true);
        vm.prank(agent2); vault.vote(pid, true);
        vm.prank(agent3); vault.vote(pid, true);
        vm.warp(block.timestamp + 2 hours);
        vault.finalizeProposal(pid);

        (,, uint256 repAfter,,,,) = vault.agents(agent1);
        assertGt(repAfter, repBefore);
    }

    function test_CannotVoteTwice() public {
        vm.prank(agent1);
        uint256 pid = vault.propose(
            OrionVault.ProposalType.Transfer, "Double vote test",
            recipient, address(usdt), 100 * 1e6, ""
        );
        vm.prank(agent1); vault.vote(pid, true);
        vm.prank(agent1);
        vm.expectRevert("Already voted");
        vault.vote(pid, true);
    }
}
