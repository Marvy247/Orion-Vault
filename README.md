# SymbioLend 🔗

> **Hackathon Galáctica · WDK Edition 1 · Lending Bot Track**

The first true agent-to-agent symbiotic lending protocol. AI agents autonomously lend to other AI agents — borrowers request capital to complete tasks, repay from on-chain revenue, and build credit history. No human ever touches the controls after deployment.

[![Sepolia](https://img.shields.io/badge/Sepolia-Deployed-6366f1?style=flat-square&logo=ethereum)](https://sepolia.etherscan.io)
[![Tests](https://img.shields.io/badge/Foundry-9%20Tests%20Passing-22c55e?style=flat-square)](./contracts)
[![WDK](https://img.shields.io/badge/Tether%20WDK-wallet--evm-f59e0b?style=flat-square)](https://docs.wdk.tether.io)
[![MCP](https://img.shields.io/badge/MCP-7%20Tools-8b5cf6?style=flat-square)](./agent/src/mcp.js)

---

## What It Does

SymbioLend is a closed-loop agent credit market:

```mermaid
graph TD
    subgraph Borrowers["🤖 Borrower Agents (WDK Wallets)"]
        N[Nexus — DeFi Yield]
        F[Flux — Trading]
        O[Orbit — Tipping]
        P[Pulse — Arbitrage]
    end

    subgraph Lender["🏦 Lender Agent (WDK Wallet)"]
        L[Lender Agent]
        CE[CreditEngine\nML Scoring]
        LLM[LLM Negotiation\nOpenRouter]
    end

    subgraph Chain["⛓ Sepolia — SymbioLend.sol"]
        SC[Loan Vault\nCredit Scores\nLiquidation]
        USDT[MockUSDT]
    end

    N & F & O & P -->|requestLoan| SC
    SC -->|pending loan| L
    L --> CE --> LLM
    LLM -->|fundLoan| SC
    SC -->|USDT disbursed| N & F & O & P
    N & F & O & P -->|repay from earnings| SC
    SC -->|creditScore++| N & F & O & P
```

---

## Lifecycle

```mermaid
sequenceDiagram
    participant B as Borrower Agent
    participant W as WDK Wallet
    participant L as Lender Agent
    participant CE as CreditEngine
    participant LLM as LLM Negotiator
    participant C as SymbioLend.sol

    B->>LLM: Generate loan rationale
    LLM-->>B: purpose, expectedReturn, repaymentPlan
    B->>W: Sign requestLoan tx
    W->>C: requestLoan(principal, interestBps, duration)
    C-->>L: LoanRequested event
    L->>CE: score(agentOnChain, amount, volatility)
    CE-->>L: pd=12%, interestBps=580, approved=true
    L->>LLM: Negotiate terms
    LLM-->>L: {interestBps:550, durationDays:7, collateralPct:0}
    L->>W: Sign fundLoan tx
    W->>C: fundLoan(loanId, duration)
    C->>B: Transfer USDT principal
    loop Every cycle
        B->>B: Simulate revenue earnings
        B->>W: Sign repay tx
        W->>C: repay(loanId, amount)
        C->>L: Transfer repayment
        C->>C: creditScore += 50 (on-time)
    end
```

---

## Credit Engine

The `CreditEngine` computes probability-of-default (PD) using 5 weighted features — mirroring a real LightGBM credit model:

| Feature | Weight | Description |
|---------|--------|-------------|
| On-chain credit score | 35% | Contract-stored score (0–1000) |
| Repayment ratio | 25% | totalRepaid / totalBorrowed |
| Active loan count | 15% | Penalty for concurrent loans |
| Amount stress | 15% | Requested vs estimated capacity |
| Market volatility | 10% | Higher vol → higher PD |

Interest rate = `300bps + PD × 2000bps` (3%–23% range)

---

## Smart Contract

`SymbioLend.sol` — full P2P lending vault:

| Feature | Implementation |
|---------|---------------|
| Agent registration | On-chain with starting credit score 500 |
| Undercollateralized loans | 0–50% collateral, rest backed by credit |
| Interest calculation | Basis points, encoded at loan creation |
| Auto credit scoring | +50 on-time, +20 late, −150 default |
| Liquidation | Collateral → lender + 5% bonus to liquidator |
| Multi-token | USDT, XAUT, BTC (any ERC-20) |

---

## LLM Negotiation

Every loan goes through a two-step LLM process:

1. **Borrower rationale** — LLM generates why the agent needs capital, expected return, and repayment plan
2. **Term negotiation** — Lender LLM receives credit score, PD, and market conditions; outputs final `{interestBps, durationDays, collateralPct, approved, reasoning}`

Falls back to CreditEngine defaults if LLM is unavailable — zero downtime.

---

## On-chain Deployments (Sepolia)

| Contract | Address |
|----------|---------|
| SymbioLend | [0xbde3971085989d183cf3108380ff73ee776ef354](https://sepolia.etherscan.io/address/0xbde3971085989d183cf3108380ff73ee776ef354) |
| MockUSDT | [0xc07a5690d43c3d9be1d369cb881bbbe17a020acc](https://sepolia.etherscan.io/address/0xc07a5690d43c3d9be1d369cb881bbbe17a020acc) |

---

## Agent Wallets (WDK HD-derived)

| Agent | Role |
|-------|------|
| Lender | Funds loans, collects repayments |
| Nexus | DeFi Yield borrower |
| Flux | Trading borrower |
| Orbit | Tipping borrower |
| Pulse | Arbitrage borrower |

---

## MCP Integration

7 tools for AI assistant integration:

| Tool | Description |
|------|-------------|
| `get_protocol_state` | Full snapshot: agents, loans, market, stats |
| `get_loans` | All loans with credit scores and tx hashes |
| `get_agents` | Agent addresses and active loan counts |
| `get_market` | Live prices and volatility |
| `trigger_cycle` | Force one autonomous lending cycle |
| `get_credit_score` | Repayment history for a borrower |
| `get_loan_stats` | Aggregate: deployed capital, default rate |

---

## Quick Start

### 1. Contracts

```bash
cd contracts
forge build
forge test   # 9 tests pass
```

### 2. Deploy

```bash
cd contracts
source .env
forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

### 3. Agent Engine

```bash
cd agent
cp .env.example .env   # fill in contract addresses + seeds
npm install
npm start              # API at http://localhost:3001
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev            # Dashboard at http://localhost:5173
```

### 5. MCP Server

```bash
cd agent && npm run mcp
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Wallets | `@tetherto/wdk` + `@tetherto/wdk-wallet-evm` |
| Smart Contracts | Solidity 0.8.29, Foundry, OpenZeppelin |
| Credit Scoring | Deterministic ML (LightGBM-style, 5 features) |
| LLM Negotiation | OpenRouter (multi-model fallback) |
| Agent Engine | Node.js ESM, Express, ethers.js |
| MCP | `@modelcontextprotocol/sdk`, stdio transport |
| Frontend | React 18, Vite, Tailwind CSS v4 |
| Network | Ethereum Sepolia testnet |

---

## License

MIT
