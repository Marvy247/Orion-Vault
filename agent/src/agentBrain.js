/**
 * AgentBrain – autonomous reasoning loop for one swarm agent.
 *
 * Each agent independently:
 *   1. Observes market signals (price, volatility, treasury state)
 *   2. Generates a capital allocation strategy
 *   3. Proposes it to the swarm
 *   4. Votes on other agents' proposals based on its own analysis
 *
 * No LLM dependency – uses deterministic heuristics so the demo
 * runs fully offline. The architecture is LLM-ready (swap the
 * strategy() method for an OpenAI/Anthropic call).
 */

const STRATEGIES = [
  { type: 'Rebalance',  desc: 'Rebalance 30% treasury to yield-bearing positions' },
  { type: 'Transfer',   desc: 'Allocate 10% to liquidity reserve wallet' },
  { type: 'Rebalance',  desc: 'Hedge 20% into XAU₮ for volatility protection' },
  { type: 'Transfer',   desc: 'Deploy 15% to Aave lending for yield generation' },
  { type: 'Rebalance',  desc: 'Consolidate dust positions, rebalance to USDT' },
  { type: 'Transfer',   desc: 'Distribute 5% performance bonus to top agents' },
]

export class AgentBrain {
  constructor(agent, swarm) {
    this.agent  = agent   // { name, address, reputation }
    this.swarm  = swarm   // SwarmCoordinator reference
    this.log    = []
    this._cycle = 0
  }

  /**
   * One autonomous reasoning cycle.
   * Returns an event object describing what the agent decided.
   */
  async tick(marketData, treasuryState) {
    this._cycle++
    const events = []

    // 1. Analyse market
    const analysis = this._analyse(marketData, treasuryState)
    events.push({ type: 'analysis', agent: this.agent.name, data: analysis })

    // 2. Maybe propose (every 3rd cycle, staggered by agent index)
    const agentIdx = this.swarm.agentIndex(this.agent.name)
    if (this._cycle % 3 === agentIdx % 3) {
      const proposal = this._generateProposal(analysis, treasuryState)
      const id = this.swarm.submitProposal(this.agent.name, proposal)
      events.push({ type: 'proposal', agent: this.agent.name, proposalId: id, proposal })
      this._log(`Proposed: ${proposal.description}`)
    }

    // 3. Vote on open proposals
    const open = this.swarm.getOpenProposals()
    for (const p of open) {
      if (p.proposer === this.agent.name) continue
      if (p.votes[this.agent.name] !== undefined) continue

      const support = this._shouldSupport(p, analysis)
      this.swarm.castVote(p.id, this.agent.name, support, this.agent.reputation)
      events.push({ type: 'vote', agent: this.agent.name, proposalId: p.id, support })
      this._log(`Voted ${support ? '✅' : '❌'} on proposal #${p.id}: ${p.description}`)
    }

    return events
  }

  _analyse(market, treasury) {
    const ethPrice   = market.ETH  || 2000
    const btcPrice   = market.BTC  || 60000
    const volatility = market.volatility || 0.3
    const tvl        = treasury.totalUSDT || 100000

    const riskScore = volatility > 0.5 ? 'HIGH' : volatility > 0.25 ? 'MEDIUM' : 'LOW'
    const hedgeRec  = riskScore === 'HIGH' ? 'increase_xaut' : 'hold'
    const yieldRec  = tvl > 50000 ? 'deploy_aave' : 'hold'

    return { ethPrice, btcPrice, volatility, riskScore, hedgeRec, yieldRec, tvl }
  }

  _generateProposal(analysis, treasury) {
    // Pick strategy based on analysis
    let strategy
    if (analysis.riskScore === 'HIGH') {
      strategy = STRATEGIES[2] // hedge XAU₮
    } else if (analysis.yieldRec === 'deploy_aave') {
      strategy = STRATEGIES[3] // Aave lending
    } else {
      strategy = STRATEGIES[this._cycle % STRATEGIES.length]
    }

    const pct    = [5, 10, 15, 20][Math.floor(Math.random() * 4)]
    const amount = Math.floor((treasury.totalUSDT || 100000) * pct / 100)

    return {
      type:        strategy.type,
      description: `[${this.agent.name}] ${strategy.desc} (~${pct}% = $${amount.toLocaleString()} USDT)`,
      amount,
      riskScore:   analysis.riskScore,
      rationale:   `ETH=$${analysis.ethPrice}, vol=${(analysis.volatility * 100).toFixed(0)}%, risk=${analysis.riskScore}`,
    }
  }

  _shouldSupport(proposal, myAnalysis) {
    // Support if risk alignment matches and amount is reasonable
    const isRisky    = proposal.riskScore === 'HIGH'
    const myRisky    = myAnalysis.riskScore === 'HIGH'
    const reasonable = proposal.amount <= myAnalysis.tvl * 0.3

    // Agents with high reputation are more conservative
    const conservative = this.agent.reputation > 1500

    if (!reasonable) return false
    if (conservative && isRisky && !myRisky) return false
    return true
  }

  _log(msg) {
    const entry = { ts: Date.now(), agent: this.agent.name, msg }
    this.log.push(entry)
    if (this.log.length > 50) this.log.shift()
    console.log(`[${this.agent.name}] ${msg}`)
  }
}
