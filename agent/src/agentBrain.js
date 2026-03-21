/**
 * AgentBrain – autonomous reasoning loop for one swarm agent.
 * Each agent has a distinct personality that shapes its strategy
 * and voting behaviour, making the swarm visibly diverse.
 */

const PERSONALITIES = {
  Alpha: {
    label:      'Aggressive Growth',
    emoji:      '🚀',
    riskTolerance: 0.8,   // high — will propose large allocations
    strategies: [
      'Deploy 25% to high-yield DeFi positions for maximum returns',
      'Allocate 30% to leveraged ETH exposure via Aave',
      'Concentrate 20% into emerging yield opportunities',
      'Aggressive rebalance: move 35% from idle USDT to yield farms',
    ],
  },
  Beta: {
    label:      'Yield Optimizer',
    emoji:      '📈',
    riskTolerance: 0.5,
    strategies: [
      'Deploy 15% to Aave lending for steady yield generation',
      'Optimize 10% into stablecoin yield strategies',
      'Rebalance 12% to highest-APY lending pools',
      'Allocate 8% to diversified yield positions',
    ],
  },
  Gamma: {
    label:      'Risk Manager',
    emoji:      '🛡️',
    riskTolerance: 0.3,
    strategies: [
      'Hedge 20% into XAU₮ for volatility protection',
      'Reduce exposure: move 15% to stable reserves',
      'Defensive rebalance: increase USDT buffer by 10%',
      'Allocate 5% to XAU₮ as inflation hedge',
    ],
  },
  Delta: {
    label:      'Diversifier',
    emoji:      '⚖️',
    riskTolerance: 0.5,
    strategies: [
      'Diversify 10% across three lending protocols',
      'Rebalance portfolio: equal-weight across ETH, BTC, USDT',
      'Spread 15% across multiple yield strategies',
      'Allocate 8% to cross-chain opportunities via bridge',
    ],
  },
  Epsilon: {
    label:      'Conservative',
    emoji:      '🏦',
    riskTolerance: 0.2,
    strategies: [
      'Preserve capital: keep 90% in USDT, deploy only 5%',
      'Low-risk allocation: 8% to Aave stable lending only',
      'Minimal exposure: 5% to blue-chip yield, rest in reserve',
      'Safety-first: consolidate positions, reduce risk by 10%',
    ],
  },
}

export class AgentBrain {
  constructor(agent, swarm) {
    this.agent       = agent
    this.swarm       = swarm
    this.personality = PERSONALITIES[agent.name] || PERSONALITIES.Beta
    this.log         = []
    this._cycle      = 0
  }

  async tick(marketData, treasuryState) {
    this._cycle++
    const events = []

    const analysis = this._analyse(marketData, treasuryState)
    events.push({ type: 'analysis', agent: this.agent.name, data: analysis })

    // Stagger proposals by agent index so they don't all propose at once
    const agentIdx = this.swarm.agentIndex(this.agent.name)
    if (this._cycle % 3 === agentIdx % 3) {
      const proposal = this._generateProposal(analysis, treasuryState)
      const id = this.swarm.submitProposal(this.agent.name, proposal)
      events.push({ type: 'proposal', agent: this.agent.name, proposalId: id, proposal })
      this._log(`Proposed: ${proposal.description}`)
    }

    // Vote on open proposals
    for (const p of this.swarm.getOpenProposals()) {
      if (p.proposer === this.agent.name) continue
      if (p.votes[this.agent.name] !== undefined) continue

      const support = this._shouldSupport(p, analysis)
      this.swarm.castVote(p.id, this.agent.name, support, this.agent.reputation)
      events.push({ type: 'vote', agent: this.agent.name, proposalId: p.id, support })
      this._log(`Voted ${support ? '✅' : '❌'} on proposal #${p.id}`)
    }

    return events
  }

  _analyse(market, treasury) {
    const volatility = market.volatility || 0.3
    const riskScore  = volatility > 0.5 ? 'HIGH' : volatility > 0.25 ? 'MEDIUM' : 'LOW'
    return {
      ethPrice:   market.ETH,
      btcPrice:   market.BTC,
      xautPrice:  market.XAUT,
      volatility,
      riskScore,
      tvl:        treasury.totalUSDT,
      personality: this.personality.label,
    }
  }

  _generateProposal(analysis, treasury) {
    const strategies = this.personality.strategies
    const strategy   = strategies[this._cycle % strategies.length]

    // Risk-adjusted allocation size based on personality
    const basePct = Math.round(this.personality.riskTolerance * 30)
    const pct     = Math.max(5, basePct + (Math.floor(Math.random() * 10) - 5))
    const amount  = Math.floor((treasury.totalUSDT || 100000) * pct / 100)

    const riskScore = analysis.riskScore === 'HIGH' && this.personality.riskTolerance < 0.4
      ? 'LOW'   // conservative agents downgrade risk in volatile markets
      : analysis.riskScore

    return {
      type:        'Rebalance',
      description: `[${this.agent.name} ${this.personality.emoji}] ${strategy} (~${pct}% = $${amount.toLocaleString()} USDT)`,
      amount,
      riskScore,
      rationale:   `${this.personality.label} | ETH=$${analysis.ethPrice}, vol=${(analysis.volatility * 100).toFixed(0)}%, risk=${analysis.riskScore}`,
    }
  }

  _shouldSupport(proposal, myAnalysis) {
    const amount      = proposal.amount || 0
    const maxAllowed  = myAnalysis.tvl * (this.personality.riskTolerance * 0.5)
    const isAffordable = amount <= maxAllowed

    // Conservative agents reject high-risk proposals in volatile markets
    if (this.personality.riskTolerance < 0.35 && proposal.riskScore === 'HIGH') return false

    // Aggressive agents support most proposals
    if (this.personality.riskTolerance > 0.7) return isAffordable

    return isAffordable && proposal.riskScore !== 'HIGH'
  }

  _log(msg) {
    const entry = { ts: Date.now(), agent: this.agent.name, msg }
    this.log.push(entry)
    if (this.log.length > 50) this.log.shift()
    console.log(`[${this.agent.name} ${this.personality.emoji}] ${msg}`)
  }
}
