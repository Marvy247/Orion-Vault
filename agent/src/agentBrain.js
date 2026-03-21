import { execFile } from 'child_process'

const OPENROUTER_MODELS = [
  'google/gemma-3-27b-it:free',
  'google/gemma-3-12b-it:free',
  'google/gemma-3-4b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
]

const PERSONALITIES = {
  Alpha:   { label: 'Aggressive Growth',  emoji: '🚀', riskTolerance: 0.8, strategies: ['Deploy 25% to high-yield DeFi','Allocate 30% to leveraged ETH via Aave','Concentrate 20% into emerging yield','Aggressive rebalance: 35% from idle USDT to yield farms'] },
  Beta:    { label: 'Yield Optimizer',    emoji: '📈', riskTolerance: 0.5, strategies: ['Deploy 15% to Aave lending','Optimize 10% into stablecoin yield','Rebalance 12% to highest-APY pools','Allocate 8% to diversified yield'] },
  Gamma:   { label: 'Risk Manager',       emoji: '🛡️', riskTolerance: 0.3, strategies: ['Hedge 20% into XAU₮','Reduce exposure: 15% to stable reserves','Defensive rebalance: increase USDT buffer 10%','Allocate 5% to XAU₮ as inflation hedge'] },
  Delta:   { label: 'Diversifier',        emoji: '⚖️', riskTolerance: 0.5, strategies: ['Diversify 10% across three protocols','Equal-weight ETH/BTC/USDT rebalance','Spread 15% across yield strategies','8% to cross-chain opportunities'] },
  Epsilon: { label: 'Conservative',       emoji: '🏦', riskTolerance: 0.2, strategies: ['Keep 90% USDT, deploy only 5%','8% to Aave stable lending only','5% to blue-chip yield, rest in reserve','Consolidate positions, reduce risk 10%'] },
}

function askLLM(systemPrompt, userPrompt, modelIdx = 0) {
  return new Promise((resolve) => {
    if (modelIdx >= OPENROUTER_MODELS.length) return resolve('')
    const body = JSON.stringify({
      model: OPENROUTER_MODELS[modelIdx],
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      max_tokens: 200,
      temperature: 0.7,
    })
    execFile('curl', [
      '-4', '-s', '--max-time', '12',
      'https://openrouter.ai/api/v1/chat/completions',
      '-H', 'Content-Type: application/json',
      '-H', `Authorization: Bearer ${process.env.OPENROUTER_API_KEY}`,
      '-d', body,
    ], { timeout: 14000 }, (err, stdout) => {
      if (err) return resolve(askLLM(systemPrompt, userPrompt, modelIdx + 1))
      try {
        const json = JSON.parse(stdout)
        const content = json.choices?.[0]?.message?.content
        if (!content || json.error) return resolve(askLLM(systemPrompt, userPrompt, modelIdx + 1))
        resolve(content)
      } catch { resolve(askLLM(systemPrompt, userPrompt, modelIdx + 1)) }
    })
  })
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
    const events   = []
    const analysis = this._analyse(marketData, treasuryState)
    events.push({ type: 'analysis', agent: this.agent.name, data: analysis })

    const agentIdx = this.swarm.agentIndex(this.agent.name)
    if (this._cycle % 3 === agentIdx % 3) {
      const proposal = await this._generateProposal(analysis, treasuryState)
      const id = this.swarm.submitProposal(this.agent.name, proposal)
      events.push({ type: 'proposal', agent: this.agent.name, proposalId: id, proposal })
      this._log(`Proposed: ${proposal.description}`)
    }

    for (const p of this.swarm.getOpenProposals()) {
      if (p.proposer === this.agent.name) continue
      if (p.votes[this.agent.name] !== undefined) continue
      const support = await this._shouldSupport(p, analysis)
      this.swarm.castVote(p.id, this.agent.name, support, this.agent.reputation)
      events.push({ type: 'vote', agent: this.agent.name, proposalId: p.id, support })
      this._log(`Voted ${support ? '✅' : '❌'} on proposal #${p.id}`)
    }

    return events
  }

  _analyse(market, treasury) {
    const volatility = market.volatility || 0.3
    return {
      ethPrice: market.ETH, btcPrice: market.BTC, xautPrice: market.XAUT,
      volatility, riskScore: volatility > 0.5 ? 'HIGH' : volatility > 0.25 ? 'MEDIUM' : 'LOW',
      tvl: treasury.totalUSDT, personality: this.personality.label,
    }
  }

  async _generateProposal(analysis, treasury) {
    if (!process.env.OPENROUTER_API_KEY) return this._heuristicProposal(analysis, treasury)
    try {
      const p      = this.personality
      const system = `You are ${this.agent.name}, a ${p.label} DeFi treasury agent with risk tolerance ${p.riskTolerance}. Respond with ONLY a JSON object, no markdown: {"description":"one sentence action under 80 chars","pct":number between 5-35,"rationale":"one sentence"}`
      const user   = `Market: ETH=$${analysis.ethPrice}, BTC=$${analysis.btcPrice}, XAUT=$${analysis.xautPrice}, volatility=${(analysis.volatility*100).toFixed(0)}%, risk=${analysis.riskScore}. Treasury: $${(treasury.totalUSDT||100000).toLocaleString()} USDT. Propose one capital allocation.`
      const raw    = await askLLM(system, user)
      const match  = raw.match(/\{[\s\S]*?\}/)
      if (!match) return this._heuristicProposal(analysis, treasury)
      const parsed = JSON.parse(match[0])
      const pct    = Math.min(40, Math.max(5, Number(parsed.pct) || Math.round(p.riskTolerance * 20)))
      const amount = Math.floor((treasury.totalUSDT || 100000) * pct / 100)
      return { type: 'Rebalance', description: `[${this.agent.name} ${p.emoji}] ${parsed.description} (~${pct}% = $${amount.toLocaleString()} USDT)`, amount, riskScore: analysis.riskScore, rationale: parsed.rationale }
    } catch { return this._heuristicProposal(analysis, treasury) }
  }

  async _shouldSupport(proposal, myAnalysis) {
    if (!process.env.OPENROUTER_API_KEY) return this._heuristicVote(proposal, myAnalysis)
    try {
      const p      = this.personality
      const system = `You are ${this.agent.name}, a ${p.label} DeFi agent with risk tolerance ${p.riskTolerance}. Respond with ONLY JSON, no markdown: {"support":true or false,"reason":"one sentence"}`
      const user   = `Proposal: "${proposal.description}". Amount: $${(proposal.amount||0).toLocaleString()} USDT. Market risk: ${myAnalysis.riskScore}. Treasury: $${(myAnalysis.tvl||100000).toLocaleString()}. Vote to support?`
      const raw    = await askLLM(system, user)
      const match  = raw.match(/\{[\s\S]*?\}/)
      if (!match) return this._heuristicVote(proposal, myAnalysis)
      return JSON.parse(match[0]).support === true
    } catch { return this._heuristicVote(proposal, myAnalysis) }
  }

  _heuristicProposal(analysis, treasury) {
    const p        = this.personality
    const strategy = p.strategies[this._cycle % p.strategies.length]
    const pct      = Math.max(5, Math.round(p.riskTolerance * 30) + (Math.floor(Math.random() * 10) - 5))
    const amount   = Math.floor((treasury.totalUSDT || 100000) * pct / 100)
    return { type: 'Rebalance', description: `[${this.agent.name} ${p.emoji}] ${strategy} (~${pct}% = $${amount.toLocaleString()} USDT)`, amount, riskScore: analysis.riskScore, rationale: `${p.label} | ETH=$${analysis.ethPrice}, vol=${(analysis.volatility*100).toFixed(0)}%` }
  }

  _heuristicVote(proposal, myAnalysis) {
    const amount     = proposal.amount || 0
    const maxAllowed = myAnalysis.tvl * (this.personality.riskTolerance * 0.5)
    if (this.personality.riskTolerance < 0.35 && proposal.riskScore === 'HIGH') return false
    if (this.personality.riskTolerance > 0.7) return amount <= maxAllowed
    return amount <= maxAllowed && proposal.riskScore !== 'HIGH'
  }

  _log(msg) {
    const entry = { ts: Date.now(), agent: this.agent.name, msg }
    this.log.push(entry)
    if (this.log.length > 50) this.log.shift()
    console.log(`[${this.agent.name} ${this.personality.emoji}] ${msg}`)
  }
}
