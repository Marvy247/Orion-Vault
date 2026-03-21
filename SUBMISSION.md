# Orion Vault — Submission Description
## Hackathon Galáctica · WDK Edition 1 · Agent Wallets Track

---

## What We Built

Orion Vault is a decentralized swarm of 5 AI agents, each holding its own **self-custodial WDK wallet**, that collectively govern a shared on-chain treasury of 100,000 USDT. Agents propose capital allocation strategies, vote via reputation-weighted consensus, and execute on-chain — with zero human intervention after initial setup.

> **Builders define the rules → Agents do the work → Value settles onchain**

---

## WDK Integration (Technical Correctness)

Every agent wallet is created using `@tetherto/wdk` + `@tetherto/wdk-wallet-evm`:

```js
const wdk = new WDK(agentSeed)
  .registerWallet('evm', WalletManagerEvm, { provider: RPC_URL })
const account = await wdk.getAccount('evm', 0)
const address = await account.getAddress() // unique per agent, HD-derived
```

- **5 agents, 5 unique HD-derived EVM wallets** — no shared keys, fully self-custodial
- Each agent signs its own on-chain transactions (propose, vote, finalize) via WDK-extracted private keys
- Architecture is multi-chain ready: swap `WalletManagerEvm` for `WalletManagerTon`, `WalletManagerSolana`, etc.
- **MCP server** exposes 8 tools (swarm_state, get_agent_wallets, get_treasury, get_proposals, submit_proposal, cast_vote, get_allocation_history, trigger_cycle) — works with Claude, Cursor, Copilot, OpenClaw

---

## Agent Autonomy

Each agent runs an independent 8-second reasoning cycle:

1. **Observe** — reads live market signals (ETH/BTC/XAUT prices, volatility)
2. **Strategize** — generates a capital allocation proposal based on its personality
3. **Propose** — submits to the swarm (fires on-chain tx to OrionVault contract)
4. **Vote** — evaluates other agents' proposals and votes based on its own risk model

Five distinct agent personalities create genuine swarm diversity:
- **Alpha 🚀** — Aggressive Growth (high risk tolerance, large allocations)
- **Beta 📈** — Yield Optimizer (steady APY focus)
- **Gamma 🛡️** — Risk Manager (hedges with XAU₮ in volatile markets)
- **Delta ⚖️** — Diversifier (cross-protocol spreading)
- **Epsilon 🏦** — Conservative (capital preservation first)

No human triggers any of this. The swarm runs indefinitely.

---

## Economic Soundness

The `OrionVault.sol` contract enforces a full reputation economy:

- **Quorum gate**: proposals require 51% of total reputation to pass
- **Reputation weighting**: each vote is weighted by the agent's reputation score
- **Reward**: successful proposals earn the proposer +100 reputation
- **Slash**: `AgentSlash` proposals can reduce bad actors by -200 reputation
- **Treasury bounds**: Transfer proposals are validated against actual on-chain balance

On-chain state (Sepolia):
- OrionVault: `0xeB7e65Ba425DFCeEb8ccF3e4BE5196e33A91bc66`
- MockUSDT: `0x15e6d94AD51bC813d74e034FC067778F85D26936`
- Treasury: 100,000 USDT deposited on-chain
- All 5 agents registered and funded on Sepolia

---

## Real-World Viability

- **Deployable to any EVM chain** — swap the RPC URL, redeploy the contract
- **REST + SSE API** — production-ready Express server, real-time event streaming
- **MCP integration** — any AI assistant can query and interact with the swarm
- **React dashboard** — live view of swarm state, treasury, proposals, Etherscan links
- **Foundry test suite** — 8 passing tests covering all contract logic
- **Open source** — full codebase, clean README, one-command setup

---

## How to Run

```bash
# 1. Agent engine
cd agent && npm install && npm start

# 2. Frontend
cd frontend && npm install && npm run dev

# 3. MCP server (for AI assistants)
cd agent && npm run mcp
```

---

## Links

- OrionVault contract: https://sepolia.etherscan.io/address/0xeB7e65Ba425DFCeEb8ccF3e4BE5196e33A91bc66
- MockUSDT contract: https://sepolia.etherscan.io/address/0x15e6d94AD51bC813d74e034FC067778F85D26936
