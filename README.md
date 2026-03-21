# Orion Vault 🌌

> **Hackathon Galáctica · WDK Edition 1 · Agent Wallets Track**

A decentralized swarm of AI agents, each holding its own **self-custodial WDK wallet**, that collectively govern a shared treasury. Agents propose capital allocations, vote via reputation-weighted consensus, and execute on-chain — with no human controller after initial setup.

**→ Builders define the rules → Agents do the work → Value settles onchain**

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Orion Vault Swarm                    │
│                                                          │
│  Agent Alpha ──┐                                         │
│  Agent Beta  ──┤──► SwarmCoordinator ──► OrionVault.sol  │
│  Agent Gamma ──┤         │                  (Foundry)    │
│  Agent Delta ──┤    Proposals + Votes                    │
│  Agent Epsilon─┘    Reputation Economy                   │
│       │                                                  │
│  WDK Wallet (each)                                       │
│  @tetherto/wdk-wallet-evm                                │
│  HD-derived · self-custodial · no shared keys            │
└─────────────────────────────────────────────────────────┘
         │
    REST + SSE API (Express)
         │
    React Dashboard (Vite + Tailwind)
```

## How It Works

1. **Agent Wallets** — Each of the 5 agents initializes a unique EVM wallet via `@tetherto/wdk` + `@tetherto/wdk-wallet-evm`. Keys never leave the agent process.

2. **Autonomous Reasoning** — Every 8 seconds, each agent independently:
   - Observes market signals (ETH/BTC/XAUT prices, volatility)
   - Generates a capital allocation strategy
   - Submits a proposal to the swarm
   - Votes on other agents' proposals based on its own analysis

3. **Swarm Consensus** — Proposals require 51% quorum (by reputation weight) to pass. Voting window is 30 seconds in demo mode.

4. **On-chain Execution** — Approved proposals execute against the `OrionVault` Solidity contract, which manages the treasury, tracks allocations, and enforces the reputation economy.

5. **Reputation Economy** — Successful proposals reward the proposer (+100 rep). Slash proposals can reduce bad actors (-200 rep). Reputation directly weights voting power.

## WDK Integration

```js
// Each agent gets its own self-custodial wallet
const wdk = new WDK(agentSeed)
  .registerWallet('evm', WalletManagerEvm, { provider: RPC_URL })

const account = await wdk.getAccount('evm', 0)
const address = await account.getAddress()  // unique per agent
const balance = await account.getBalance()
```

The architecture is multi-chain ready — swap `WalletManagerEvm` for `WalletManagerTon`, `WalletManagerSolana`, etc. to extend the swarm across chains.

## Project Structure

```
orion-vault/
├── contracts/          # Foundry smart contracts
│   └── src/
│       └── OrionVault.sol   # Treasury + governance contract
├── agent/              # Node.js autonomous agent engine
│   └── src/
│       ├── index.js         # Express API + bootstrap
│       ├── agentWallet.js   # WDK wallet wrapper
│       ├── agentBrain.js    # Autonomous reasoning loop
│       └── swarm.js         # SwarmCoordinator
└── frontend/           # React dashboard
    └── src/
        ├── context/SwarmContext.tsx
        ├── components/
        │   ├── Dashboard.tsx
        │   ├── AgentGrid.tsx
        │   ├── ProposalFeed.tsx
        │   ├── TreasuryPanel.tsx
        │   ├── EventLog.tsx
        │   └── AllocationHistory.tsx
        └── utils/api.ts
```

## Quick Start

### 1. Smart Contracts

```bash
cd contracts
forge build
forge test
# Deploy to Sepolia:
# forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
```

### 2. Agent Engine

```bash
cd agent
cp .env.example .env   # add your RPC URL + agent seeds
npm install
npm start
# API running at http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# Dashboard at http://localhost:5173
```

## Smart Contract

`OrionVault.sol` provides:
- Agent registration with reputation tracking
- Proposal lifecycle (create → vote → finalize → execute)
- Reputation-weighted voting (51% quorum)
- Treasury management (deposit, transfer, rebalance)
- Automatic reward/slash on proposal outcome
- Full event emission for off-chain indexing

## Judging Criteria Alignment

| Criterion | Implementation |
|-----------|---------------|
| **Technical Correctness** | WDK HD wallets, Foundry contracts with 6 passing tests, typed React frontend |
| **Agent Autonomy** | Agents run independent 8s reasoning loops — propose, vote, execute — zero human input |
| **Economic Soundness** | Reputation staking, quorum gates, bounded allocations, slash/reward mechanics |
| **Real-world Viability** | Deployable to any EVM chain, REST+SSE API, production-ready architecture |

## License

MIT
