import { execFile } from 'child_process'

const MODELS = [
  'google/gemma-3-27b-it:free',
  'google/gemma-3-12b-it:free',
  'google/gemma-3-4b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
]

function callLLM(system, user, modelIdx = 0) {
  return new Promise((resolve) => {
    if (modelIdx >= MODELS.length || !process.env.OPENROUTER_API_KEY) return resolve(null)
    const body = JSON.stringify({
      model: MODELS[modelIdx],
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: 300,
      temperature: 0.6,
    })
    execFile('curl', [
      '-4', '-s', '--max-time', '12',
      'https://openrouter.ai/api/v1/chat/completions',
      '-H', 'Content-Type: application/json',
      '-H', `Authorization: Bearer ${process.env.OPENROUTER_API_KEY}`,
      '-d', body,
    ], { timeout: 14000 }, (err, stdout) => {
      if (err) return resolve(callLLM(system, user, modelIdx + 1))
      try {
        const json    = JSON.parse(stdout)
        const content = json.choices?.[0]?.message?.content
        if (!content || json.error) return resolve(callLLM(system, user, modelIdx + 1))
        resolve(content)
      } catch { resolve(callLLM(system, user, modelIdx + 1)) }
    })
  })
}

/**
 * LLM negotiates loan terms between lender and borrower agents.
 * Returns structured terms or null (fallback to credit engine defaults).
 */
export async function negotiateLoanTerms({ lenderName, borrowerName, requestedAmount, creditScore, pd, marketVolatility, suggestedInterestBps }) {
  const system = `You are a neutral DeFi loan negotiation engine. Given a loan request between two AI agents, output ONLY JSON with negotiated terms: {"interestBps":number,"durationDays":number,"collateralPct":number,"approved":true/false,"reasoning":"one sentence"}. interestBps range 200-3000, durationDays 1-30, collateralPct 0-50.`
  const user   = `Lender: ${lenderName}. Borrower: ${borrowerName}. Requested: $${requestedAmount.toLocaleString()} USDT. Credit score: ${creditScore}/1000. Default probability: ${(pd*100).toFixed(1)}%. Market volatility: ${(marketVolatility*100).toFixed(0)}%. Suggested rate: ${(suggestedInterestBps/100).toFixed(1)}%. Negotiate final terms.`

  const raw = await callLLM(system, user)
  if (!raw) return null
  try {
    const match = raw.match(/\{[\s\S]*?\}/)
    if (!match) return null
    return JSON.parse(match[0])
  } catch { return null }
}

/**
 * LLM generates a borrower agent's loan request rationale.
 */
export async function generateLoanRequest({ agentName, agentType, amount, purpose, marketData }) {
  const system = `You are ${agentName}, a ${agentType} AI agent. Output ONLY JSON: {"purpose":"one sentence why you need capital","expectedReturn":"e.g. 8% APY","repaymentPlan":"one sentence"}`
  const user   = `You need $${amount.toLocaleString()} USDT. Market: ETH=$${marketData.ETH}, volatility=${(marketData.volatility*100).toFixed(0)}%. Describe your loan request.`

  const raw = await callLLM(system, user)
  if (!raw) return { purpose: `${agentType} capital deployment`, expectedReturn: '5-10% APY', repaymentPlan: 'Repay from task earnings' }
  try {
    const match = raw.match(/\{[\s\S]*?\}/)
    return match ? JSON.parse(match[0]) : null
  } catch { return null }
}
