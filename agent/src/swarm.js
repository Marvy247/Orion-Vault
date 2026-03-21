import { AgentBrain } from './agentBrain.js'
import { VaultContract } from './vaultContract.js'

export class SwarmCoordinator {
  constructor() {
    this.agents    = new Map()
    this.brains    = new Map()
    this.proposals = new Map()
    this.history   = []
    this.eventLog  = []
    this._nextId   = 0
    this._cycle    = 0
    this.vault     = null   // VaultContract instance (set after bootstrap)

    this.treasury = { totalUSDT: 100_000, totalXAUT: 0, allocations: [] }
    this.market   = { ETH: 2450, BTC: 67000, USDT: 1.00, XAUT: 2650, volatility: 0.28 }

    // On-chain metadata
    this.contractAddress = process.env.VAULT_CONTRACT_ADDRESS || null
    this.network         = 'Sepolia'
    this.chainId         = 11155111
  }

  // ─── Setup ─────────────────────────────────────────────────────────────────

  setVaultContract(vault) {
    this.vault = vault
  }

  addAgent(name, address, wallet) {
    const PERSONALITY_LABELS = {
      Alpha: { label: 'Aggressive Growth', emoji: '🚀' },
      Beta:  { label: 'Yield Optimizer',   emoji: '📈' },
      Gamma: { label: 'Risk Manager',      emoji: '🛡️' },
      Delta: { label: 'Diversifier',       emoji: '⚖️' },
      Epsilon:{ label: 'Conservative',     emoji: '🏦' },
    }
    const p = PERSONALITY_LABELS[name] || { label: 'Agent', emoji: '🤖' }
    const agent = { name, address, reputation: 1000, wallet, joinedAt: Date.now(), ...p }
    this.agents.set(name, agent)
    this.brains.set(name, new AgentBrain(agent, this))
    this._emit('agent_joined', { name, address })
    console.log(`✅ Agent ${name} (${p.label}) joined swarm at ${address}`)
  }

  agentIndex(name) {
    return [...this.agents.keys()].indexOf(name)
  }

  // ─── Proposals ─────────────────────────────────────────────────────────────

  submitProposal(proposerName, proposal) {
    const id = this._nextId++
    const p = {
      id,
      proposer:     proposerName,
      type:         proposal.type,
      description:  proposal.description,
      amount:       proposal.amount,
      riskScore:    proposal.riskScore,
      rationale:    proposal.rationale,
      votes:        {},
      votesFor:     0,
      votesAgainst: 0,
      status:       'pending',
      createdAt:    Date.now(),
      expiresAt:    Date.now() + 30_000,
      onChainId:    null,
      txHash:       null,
    }
    this.proposals.set(id, p)
    this._emit('proposal_created', { id, proposer: proposerName, description: p.description })

    // Fire on-chain propose (non-blocking)
    this._onChainPropose(p, proposerName)

    return id
  }

  async _onChainPropose(p, proposerName) {
    if (!this.vault) return
    const writer = this.vault.writer(proposerName)
    if (!writer) return
    try {
      // Always use Rebalance (type 1) for on-chain record — no token validation required
      const tx = await writer.propose(
        1, // Rebalance
        p.description,
        '0x0000000000000000000000000000000000000000',
        '0x0000000000000000000000000000000000000000',
        0,
        '0x'
      )
      const receipt = await tx.wait()
      p.txHash = receipt.hash
      // Parse ProposalCreated event to get on-chain ID
      const log = receipt.logs?.find(l => l.topics?.[0]?.startsWith('0x'))
      p.onChainId = log ? Number(BigInt(log.topics[1] ?? '0x0')) : null
      this._emit('proposal_onchain', { id: p.id, txHash: p.txHash, onChainId: p.onChainId })
      console.log(`📜 Proposal #${p.id} on-chain: ${receipt.hash}`)
    } catch (err) {
      console.warn(`[onChainPropose] ${err.shortMessage || err.message?.slice(0, 80)}`)
    }
  }

  castVote(proposalId, voterName, support, weight) {
    const p = this.proposals.get(proposalId)
    if (!p || p.status !== 'pending') return
    if (p.votes[voterName] !== undefined) return

    p.votes[voterName] = support
    if (support) p.votesFor    += weight
    else         p.votesAgainst += weight

    this._emit('vote_cast', { proposalId, voter: voterName, support, weight })

    // Fire on-chain vote (non-blocking)
    this._onChainVote(p, voterName, support)
  }

  async _onChainVote(p, voterName, support) {
    if (!this.vault || p.onChainId === null) return
    const writer = this.vault.writer(voterName)
    if (!writer) return
    try {
      const tx = await writer.vote(p.onChainId, support)
      await tx.wait()
      console.log(`🗳️  ${voterName} voted on-chain for proposal #${p.onChainId}`)
    } catch (err) {
      console.warn(`[onChainVote] ${err.message?.slice(0, 80)}`)
    }
  }

  getOpenProposals() {
    return [...this.proposals.values()].filter(p => p.status === 'pending')
  }

  // ─── Finalization ──────────────────────────────────────────────────────────

  finalizeExpiredProposals() {
    const now = Date.now()
    for (const p of this.proposals.values()) {
      if (p.status !== 'pending') continue
      if (now < p.expiresAt) continue

      const totalRep   = this._totalReputation()
      const totalVotes = p.votesFor + p.votesAgainst
      const quorumMet  = totalRep > 0 && (totalVotes / totalRep) >= 0.51
      const majority   = totalVotes > 0 && (p.votesFor / totalVotes) >= 0.51

      if (quorumMet && majority) {
        p.status = 'approved'
        this._executeProposal(p)
      } else {
        p.status = 'rejected'
        this._emit('proposal_rejected', { id: p.id, votesFor: p.votesFor, votesAgainst: p.votesAgainst })
      }
    }
  }

  _executeProposal(p) {
    const allocation = {
      proposalId:  p.id,
      description: p.description,
      amount:      p.amount,
      type:        p.type,
      executedAt:  Date.now(),
      txHash:      p.txHash || ('0x' + Math.random().toString(16).slice(2).padEnd(64, '0')),
      onChain:     !!p.txHash,
    }

    if (p.type === 'Transfer' || p.type === 'Rebalance') {
      const moved = Math.min(p.amount, this.treasury.totalUSDT)
      this.treasury.totalUSDT -= moved
      this.treasury.allocations.push({ ...allocation, moved })
    }

    this.history.push(allocation)
    this._emit('proposal_executed', allocation)

    const proposer = this.agents.get(p.proposer)
    if (proposer) {
      proposer.reputation = Math.min(10000, proposer.reputation + 100)
      this._emit('agent_rewarded', { name: p.proposer, reputation: proposer.reputation })
    }

    p.status = 'executed'
    console.log(`⚡ Executed proposal #${p.id}: ${p.description}`)
  }

  // ─── Main Tick ─────────────────────────────────────────────────────────────

  async tick() {
    this._cycle++
    this._updateMarket()
    this.finalizeExpiredProposals()

    const allEvents = []
    for (const [name, brain] of this.brains) {
      const agent = this.agents.get(name)
      brain.agent.reputation = agent.reputation
      const events = await brain.tick(this.market, this.treasury)
      allEvents.push(...events)
    }

    this._emit('cycle_complete', {
      cycle:    this._cycle,
      agents:   this.agents.size,
      proposals: this.proposals.size,
      treasury: this.treasury.totalUSDT,
    })

    return allEvents
  }

  _updateMarket() {
    const drift = () => 1 + (Math.random() - 0.5) * 0.04
    this.market.ETH        = +(this.market.ETH  * drift()).toFixed(2)
    this.market.BTC        = +(this.market.BTC  * drift()).toFixed(2)
    this.market.XAUT       = +(this.market.XAUT * drift()).toFixed(2)
    this.market.volatility = +Math.max(0.05, Math.min(0.9,
      this.market.volatility + (Math.random() - 0.5) * 0.05
    )).toFixed(3)
  }

  // ─── State Snapshot ────────────────────────────────────────────────────────

  getState() {
    return {
      cycle:           this._cycle,
      contractAddress: this.contractAddress,
      network:         this.network,
      chainId:         this.chainId,
      agents:    [...this.agents.values()].map(a => ({
        name: a.name, address: a.address, reputation: a.reputation,
        joinedAt: a.joinedAt, label: a.label, emoji: a.emoji,
      })),
      proposals: [...this.proposals.values()].map(p => ({
        id: p.id, proposer: p.proposer, type: p.type, description: p.description,
        amount: p.amount, riskScore: p.riskScore, rationale: p.rationale,
        votesFor: p.votesFor, votesAgainst: p.votesAgainst, status: p.status,
        createdAt: p.createdAt, expiresAt: p.expiresAt,
        txHash: p.txHash, onChainId: p.onChainId,
      })),
      treasury:  this.treasury,
      market:    this.market,
      history:   this.history.slice(-20),
      eventLog:  this.eventLog.slice(-50),
    }
  }

  _totalReputation() {
    let total = 0
    for (const a of this.agents.values()) total += a.reputation
    return total
  }

  _emit(type, data) {
    const event = { type, data, ts: Date.now() }
    this.eventLog.push(event)
    if (this.eventLog.length > 200) this.eventLog.shift()
  }
}
