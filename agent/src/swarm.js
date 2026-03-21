import { AgentBrain } from './agentBrain.js'

/**
 * SwarmCoordinator – orchestrates all agents, manages proposals,
 * tallies votes, executes approved allocations, tracks treasury state.
 */
export class SwarmCoordinator {
  constructor() {
    this.agents    = new Map()   // name → { name, address, reputation, wallet }
    this.brains    = new Map()   // name → AgentBrain
    this.proposals = new Map()   // id   → Proposal
    this.history   = []          // executed allocations
    this.eventLog  = []          // all swarm events
    this._nextId   = 0
    this._cycle    = 0

    // Simulated treasury (mirrors on-chain state for demo)
    this.treasury = {
      totalUSDT: 100_000,
      totalXAUT: 0,
      allocations: [],
    }

    // Simulated market data
    this.market = {
      ETH:        2450,
      BTC:        67000,
      USDT:       1.00,
      XAUT:       2650,
      volatility: 0.28,
    }
  }

  // ─── Agent Management ──────────────────────────────────────────────────────

  addAgent(name, address, wallet) {
    const agent = { name, address, reputation: 1000, wallet, joinedAt: Date.now() }
    this.agents.set(name, agent)
    this.brains.set(name, new AgentBrain(agent, this))
    this._emit('agent_joined', { name, address })
    console.log(`✅ Agent ${name} joined swarm at ${address}`)
  }

  agentIndex(name) {
    return [...this.agents.keys()].indexOf(name)
  }

  // ─── Proposals ─────────────────────────────────────────────────────────────

  submitProposal(proposerName, proposal) {
    const id = this._nextId++
    const p = {
      id,
      proposer:    proposerName,
      type:        proposal.type,
      description: proposal.description,
      amount:      proposal.amount,
      riskScore:   proposal.riskScore,
      rationale:   proposal.rationale,
      votes:       {},
      votesFor:    0,
      votesAgainst: 0,
      status:      'pending',
      createdAt:   Date.now(),
      expiresAt:   Date.now() + 30_000, // 30s voting window in demo
    }
    this.proposals.set(id, p)
    this._emit('proposal_created', { id, proposer: proposerName, description: p.description })
    return id
  }

  castVote(proposalId, voterName, support, weight) {
    const p = this.proposals.get(proposalId)
    if (!p || p.status !== 'pending') return
    if (p.votes[voterName] !== undefined) return

    p.votes[voterName] = support
    if (support) p.votesFor    += weight
    else         p.votesAgainst += weight

    this._emit('vote_cast', { proposalId, voter: voterName, support, weight })
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
    // Simulate on-chain execution (in production: call OrionVault contract)
    const allocation = {
      proposalId:  p.id,
      description: p.description,
      amount:      p.amount,
      type:        p.type,
      executedAt:  Date.now(),
      txHash:      '0x' + Math.random().toString(16).slice(2).padEnd(64, '0'),
    }

    if (p.type === 'Transfer' || p.type === 'Rebalance') {
      const moved = Math.min(p.amount, this.treasury.totalUSDT)
      this.treasury.totalUSDT -= moved
      this.treasury.allocations.push({ ...allocation, moved })
    }

    this.history.push(allocation)
    this._emit('proposal_executed', allocation)

    // Reward proposer
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
      // Sync reputation into brain's agent ref
      brain.agent.reputation = agent.reputation
      const events = await brain.tick(this.market, this.treasury)
      allEvents.push(...events)
    }

    this._emit('cycle_complete', {
      cycle:     this._cycle,
      agents:    this.agents.size,
      proposals: this.proposals.size,
      treasury:  this.treasury.totalUSDT,
    })

    return allEvents
  }

  _updateMarket() {
    // Simulate realistic price drift
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
      cycle:     this._cycle,
      agents:    [...this.agents.values()].map(a => ({
        name:       a.name,
        address:    a.address,
        reputation: a.reputation,
        joinedAt:   a.joinedAt,
      })),
      proposals: [...this.proposals.values()].map(p => ({
        id:          p.id,
        proposer:    p.proposer,
        type:        p.type,
        description: p.description,
        amount:      p.amount,
        riskScore:   p.riskScore,
        rationale:   p.rationale,
        votesFor:    p.votesFor,
        votesAgainst: p.votesAgainst,
        status:      p.status,
        createdAt:   p.createdAt,
        expiresAt:   p.expiresAt,
      })),
      treasury:  this.treasury,
      market:    this.market,
      history:   this.history.slice(-20),
      eventLog:  this.eventLog.slice(-50),
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

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
