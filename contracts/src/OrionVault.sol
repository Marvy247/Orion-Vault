// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title OrionVault
 * @notice Autonomous agent swarm treasury with collective governance.
 *         Agents register with WDK wallets, propose capital allocations,
 *         vote via reputation-weighted consensus, and execute on-chain.
 */
contract OrionVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Types ────────────────────────────────────────────────────────────────

    enum ProposalStatus { Pending, Approved, Rejected, Executed, Cancelled }
    enum ProposalType   { Transfer, Rebalance, AgentSlash, ParamChange }

    struct Agent {
        address wallet;
        string  name;
        uint256 reputation;   // 0–10000 basis points
        uint256 totalProposed;
        uint256 successfulProps;
        bool    active;
        uint256 joinedAt;
    }

    struct Proposal {
        uint256      id;
        address      proposer;
        ProposalType pType;
        string       description;
        address      target;
        address      token;
        uint256      amount;
        uint256      votesFor;
        uint256      votesAgainst;
        uint256      createdAt;
        uint256      expiresAt;
        ProposalStatus status;
        bytes        callData;
        mapping(address => bool) hasVoted;
    }

    struct AllocationRecord {
        address token;
        address destination;
        uint256 amount;
        uint256 timestamp;
        string  reason;
    }

    // ─── State ────────────────────────────────────────────────────────────────

    string  public constant NAME    = "Orion Vault";
    string  public constant VERSION = "1.0.0";

    address public immutable deployer;
    uint256 public constant  QUORUM_BPS        = 5100;  // 51%
    uint256 public constant  VOTING_PERIOD      = 1 hours;
    uint256 public constant  BASE_REPUTATION    = 1000;
    uint256 public constant  SLASH_AMOUNT       = 200;
    uint256 public constant  REWARD_AMOUNT      = 100;
    uint256 public constant  MAX_AGENTS         = 20;

    mapping(address => Agent)    public agents;
    address[]                    public agentList;
    mapping(uint256 => Proposal) public proposals;
    uint256                      public proposalCount;
    AllocationRecord[]           public allocationHistory;

    // Supported tokens (USDT, XAUT, etc.)
    mapping(address => bool)     public supportedTokens;
    address[]                    public tokenList;

    // Treasury balances tracked per token
    mapping(address => uint256)  public treasuryBalance;

    // ─── Events ───────────────────────────────────────────────────────────────

    event AgentRegistered(address indexed wallet, string name, uint256 reputation);
    event AgentSlashed(address indexed wallet, uint256 slashAmount, string reason);
    event AgentRewarded(address indexed wallet, uint256 rewardAmount);
    event ProposalCreated(uint256 indexed id, address indexed proposer, ProposalType pType, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed id, bool success);
    event ProposalRejected(uint256 indexed id);
    event Deposited(address indexed token, address indexed from, uint256 amount);
    event Withdrawn(address indexed token, address indexed to, uint256 amount);
    event TokenAdded(address indexed token);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyAgent() {
        require(agents[msg.sender].active, "Not an active agent");
        _;
    }

    modifier onlyDeployer() {
        require(msg.sender == deployer, "Not deployer");
        _;
    }

    modifier proposalExists(uint256 id) {
        require(id < proposalCount, "Proposal not found");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() {
        deployer = msg.sender;
    }

    // ─── Agent Management ─────────────────────────────────────────────────────

    /**
     * @notice Register a new agent (called by the agent's WDK wallet address).
     */
    function registerAgent(string calldata name) external {
        require(!agents[msg.sender].active, "Already registered");
        require(agentList.length < MAX_AGENTS, "Swarm full");
        require(bytes(name).length > 0 && bytes(name).length <= 32, "Invalid name");

        agents[msg.sender] = Agent({
            wallet:          msg.sender,
            name:            name,
            reputation:      BASE_REPUTATION,
            totalProposed:   0,
            successfulProps: 0,
            active:          true,
            joinedAt:        block.timestamp
        });
        agentList.push(msg.sender);

        emit AgentRegistered(msg.sender, name, BASE_REPUTATION);
    }

    /**
     * @notice Deployer can bootstrap agents (for demo / initial swarm setup).
     */
    function bootstrapAgent(address wallet, string calldata name) external onlyDeployer {
        require(!agents[wallet].active, "Already registered");
        require(agentList.length < MAX_AGENTS, "Swarm full");

        agents[wallet] = Agent({
            wallet:          wallet,
            name:            name,
            reputation:      BASE_REPUTATION,
            totalProposed:   0,
            successfulProps: 0,
            active:          true,
            joinedAt:        block.timestamp
        });
        agentList.push(wallet);

        emit AgentRegistered(wallet, name, BASE_REPUTATION);
    }

    // ─── Token Management ─────────────────────────────────────────────────────

    function addSupportedToken(address token) external onlyDeployer {
        require(!supportedTokens[token], "Already supported");
        supportedTokens[token] = true;
        tokenList.push(token);
        emit TokenAdded(token);
    }

    // ─── Treasury ─────────────────────────────────────────────────────────────

    function deposit(address token, uint256 amount) external nonReentrant {
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Zero amount");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        treasuryBalance[token] += amount;
        emit Deposited(token, msg.sender, amount);
    }

    // ─── Proposals ────────────────────────────────────────────────────────────

    function propose(
        ProposalType pType,
        string calldata description,
        address target,
        address token,
        uint256 amount,
        bytes calldata callData
    ) external onlyAgent returns (uint256 id) {
        require(bytes(description).length > 0, "Empty description");
        if (pType == ProposalType.Transfer) {
            require(token != address(0) && amount > 0, "Invalid transfer params");
            require(supportedTokens[token], "Token not supported");
            require(treasuryBalance[token] >= amount, "Insufficient treasury");
        }

        id = proposalCount++;
        Proposal storage p = proposals[id];
        p.id          = id;
        p.proposer    = msg.sender;
        p.pType       = pType;
        p.description = description;
        p.target      = target;
        p.token       = token;
        p.amount      = amount;
        p.callData    = callData;
        p.createdAt   = block.timestamp;
        p.expiresAt   = block.timestamp + VOTING_PERIOD;
        p.status      = ProposalStatus.Pending;

        agents[msg.sender].totalProposed++;

        emit ProposalCreated(id, msg.sender, pType, description);
    }

    function vote(uint256 id, bool support) external onlyAgent proposalExists(id) {
        Proposal storage p = proposals[id];
        require(p.status == ProposalStatus.Pending, "Not pending");
        require(block.timestamp <= p.expiresAt, "Voting ended");
        require(!p.hasVoted[msg.sender], "Already voted");

        p.hasVoted[msg.sender] = true;
        uint256 weight = agents[msg.sender].reputation;

        if (support) {
            p.votesFor += weight;
        } else {
            p.votesAgainst += weight;
        }

        emit VoteCast(id, msg.sender, support, weight);
    }

    function finalizeProposal(uint256 id) external proposalExists(id) nonReentrant {
        Proposal storage p = proposals[id];
        require(p.status == ProposalStatus.Pending, "Not pending");
        require(block.timestamp > p.expiresAt, "Voting still active");

        uint256 totalVotes = p.votesFor + p.votesAgainst;
        uint256 totalRep   = _totalReputation();

        // Need quorum (51% of total reputation participated) AND majority
        bool quorumMet  = totalRep == 0 ? false : (totalVotes * 10000 / totalRep >= QUORUM_BPS);
        bool majorityFor = totalVotes == 0 ? false : (p.votesFor * 10000 / totalVotes >= QUORUM_BPS);

        if (quorumMet && majorityFor) {
            p.status = ProposalStatus.Approved;
            _executeProposal(id);
        } else {
            p.status = ProposalStatus.Rejected;
            emit ProposalRejected(id);
        }
    }

    function _executeProposal(uint256 id) internal {
        Proposal storage p = proposals[id];

        if (p.pType == ProposalType.Transfer) {
            require(treasuryBalance[p.token] >= p.amount, "Insufficient balance");
            treasuryBalance[p.token] -= p.amount;
            IERC20(p.token).safeTransfer(p.target, p.amount);

            allocationHistory.push(AllocationRecord({
                token:       p.token,
                destination: p.target,
                amount:      p.amount,
                timestamp:   block.timestamp,
                reason:      p.description
            }));

            emit Withdrawn(p.token, p.target, p.amount);
        } else if (p.pType == ProposalType.AgentSlash) {
            _slashAgent(p.target, p.description);
        } else if (p.pType == ProposalType.Rebalance) {
            // Rebalance: callData encodes (address token, address dest, uint256 amount)
            if (p.callData.length > 0) {
                (address token, address dest, uint256 amt) = abi.decode(p.callData, (address, address, uint256));
                if (treasuryBalance[token] >= amt) {
                    treasuryBalance[token] -= amt;
                    IERC20(token).safeTransfer(dest, amt);
                    allocationHistory.push(AllocationRecord({
                        token:       token,
                        destination: dest,
                        amount:      amt,
                        timestamp:   block.timestamp,
                        reason:      p.description
                    }));
                }
            }
        }

        p.status = ProposalStatus.Executed;
        // Reward proposer
        _rewardAgent(p.proposer);
        emit ProposalExecuted(id, true);
    }

    function _slashAgent(address wallet, string memory reason) internal {
        Agent storage a = agents[wallet];
        if (!a.active) return;
        if (a.reputation > SLASH_AMOUNT) {
            a.reputation -= SLASH_AMOUNT;
        } else {
            a.reputation = 0;
            a.active = false;
        }
        emit AgentSlashed(wallet, SLASH_AMOUNT, reason);
    }

    function _rewardAgent(address wallet) internal {
        Agent storage a = agents[wallet];
        if (!a.active) return;
        a.reputation += REWARD_AMOUNT;
        if (a.reputation > 10000) a.reputation = 10000;
        a.successfulProps++;
        emit AgentRewarded(wallet, REWARD_AMOUNT);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getAgentCount() external view returns (uint256) {
        return agentList.length;
    }

    function getActiveAgents() external view returns (address[] memory) {
        uint256 count;
        for (uint256 i; i < agentList.length; i++) {
            if (agents[agentList[i]].active) count++;
        }
        address[] memory active = new address[](count);
        uint256 j;
        for (uint256 i; i < agentList.length; i++) {
            if (agents[agentList[i]].active) active[j++] = agentList[i];
        }
        return active;
    }

    function getProposalVotes(uint256 id) external view proposalExists(id) returns (uint256 votesFor, uint256 votesAgainst) {
        return (proposals[id].votesFor, proposals[id].votesAgainst);
    }

    function getProposalStatus(uint256 id) external view proposalExists(id) returns (ProposalStatus) {
        return proposals[id].status;
    }

    function getProposalInfo(uint256 id) external view proposalExists(id) returns (
        address proposer,
        ProposalType pType,
        string memory description,
        address target,
        address token,
        uint256 amount,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 expiresAt,
        ProposalStatus status
    ) {
        Proposal storage p = proposals[id];
        return (p.proposer, p.pType, p.description, p.target, p.token,
                p.amount, p.votesFor, p.votesAgainst, p.expiresAt, p.status);
    }

    function hasVoted(uint256 id, address agent) external view proposalExists(id) returns (bool) {
        return proposals[id].hasVoted[agent];
    }

    function getAllocationHistoryLength() external view returns (uint256) {
        return allocationHistory.length;
    }

    function getTokenList() external view returns (address[] memory) {
        return tokenList;
    }

    function _totalReputation() internal view returns (uint256 total) {
        for (uint256 i; i < agentList.length; i++) {
            if (agents[agentList[i]].active) {
                total += agents[agentList[i]].reputation;
            }
        }
    }

    function totalReputation() external view returns (uint256) {
        return _totalReputation();
    }
}
