import 'dotenv/config'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'

const API = `http://localhost:${process.env.PORT || 3001}`

async function api(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${API}${path}`, opts)
  return res.json()
}

const TOOLS = [
  { name: 'get_protocol_state',   description: 'Full SymbioLend snapshot: agents, loans, market, stats', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_loans',            description: 'All loans with status, terms, credit scores, tx hashes', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_agents',           description: 'Lender and borrower agents with addresses and active loan counts', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_market',           description: 'Live market prices and volatility', inputSchema: { type: 'object', properties: {} } },
  { name: 'trigger_cycle',        description: 'Force one autonomous lending cycle', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_credit_score',     description: 'Get credit score and loan history for a borrower agent', inputSchema: { type: 'object', properties: { agent: { type: 'string' } }, required: ['agent'] } },
  { name: 'get_loan_stats',       description: 'Aggregate stats: total deployed, repayment rate, default rate', inputSchema: { type: 'object', properties: {} } },
]

const server = new Server({ name: 'symbiolend-mcp', version: '1.0.0' }, { capabilities: { tools: {} } })

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params
  try {
    let result

    if (name === 'get_protocol_state') result = await api('/api/state')
    else if (name === 'get_loans')     result = await api('/api/loans')
    else if (name === 'get_agents')    result = await api('/api/agents')
    else if (name === 'get_market')    result = await api('/api/market')
    else if (name === 'trigger_cycle') result = await api('/api/tick', 'POST')
    else if (name === 'get_loan_stats') {
      const state = await api('/api/state')
      result = state.stats
    }
    else if (name === 'get_credit_score') {
      const loans = await api('/api/loans')
      const agentLoans = loans.filter(l => l.borrower === args.agent)
      const repaid   = agentLoans.filter(l => l.status === 'repaid').length
      const defaulted = agentLoans.filter(l => l.status === 'defaulted').length
      result = { agent: args.agent, totalLoans: agentLoans.length, repaid, defaulted, repaymentRate: agentLoans.length ? (repaid / agentLoans.length * 100).toFixed(1) + '%' : 'N/A' }
    }
    else result = { error: 'unknown tool' }

    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  } catch (e) {
    return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
