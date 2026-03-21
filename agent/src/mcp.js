/**
 * Orion Vault MCP Server
 *
 * Exposes the agent swarm as MCP tools so any AI assistant
 * (Claude, Cursor, Copilot, OpenClaw) can query and interact
 * with the swarm via the Model Context Protocol.
 *
 * Tools:
 *   swarm_state         – full swarm snapshot
 *   get_agent_wallets   – all agent addresses + reputation
 *   get_treasury        – treasury balances + market prices
 *   get_proposals       – active/recent proposals with vote tallies
 *   submit_proposal     – create a new capital allocation proposal
 *   cast_vote           – vote on a proposal as a named agent
 *   get_allocation_history – executed allocations
 *   trigger_cycle       – force one autonomous swarm cycle
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import 'dotenv/config'

const API = `http://localhost:${process.env.PORT || 3001}`

async function api(path, method = 'GET', body) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return r.json()
}

const server = new McpServer({
  name:    'orion-vault',
  version: '1.0.0',
})

// ─── Tools ────────────────────────────────────────────────────────────────────

server.tool(
  'swarm_state',
  'Get the full Orion Vault swarm state: agents, proposals, treasury, market data, and event log.',
  {},
  async () => {
    const state = await api('/api/state')
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          cycle:           state.cycle,
          contractAddress: state.contractAddress,
          network:         state.network,
          agents:          state.agents.length,
          pendingProposals: state.proposals.filter(p => p.status === 'pending').length,
          executedProposals: state.proposals.filter(p => p.status === 'executed').length,
          treasuryUSDT:    state.treasury.totalUSDT,
          market:          state.market,
        }, null, 2),
      }],
    }
  }
)

server.tool(
  'get_agent_wallets',
  'Get all agent wallet addresses, reputation scores, and activity stats.',
  {},
  async () => {
    const agents = await api('/api/agents')
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(agents.map(a => ({
          name:       a.name,
          address:    a.address,
          reputation: a.reputation,
          joinedAt:   new Date(a.joinedAt).toISOString(),
        })), null, 2),
      }],
    }
  }
)

server.tool(
  'get_treasury',
  'Get the OrionVault treasury balances and live market prices (ETH, BTC, XAUT, volatility).',
  {},
  async () => {
    const data = await api('/api/treasury')
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(data, null, 2),
      }],
    }
  }
)

server.tool(
  'get_proposals',
  'Get all proposals with their vote tallies, status, and on-chain tx hashes.',
  {
    status: z.enum(['pending', 'approved', 'rejected', 'executed', 'all']).optional()
      .describe('Filter by status. Defaults to all.'),
  },
  async ({ status }) => {
    const proposals = await api('/api/proposals')
    const filtered = status && status !== 'all'
      ? proposals.filter(p => p.status === status)
      : proposals
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(filtered.slice(-20), null, 2),
      }],
    }
  }
)

server.tool(
  'submit_proposal',
  'Submit a new capital allocation proposal to the swarm. The swarm will vote on it autonomously.',
  {
    proposer:    z.enum(['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon']).describe('Agent submitting the proposal'),
    type:        z.enum(['Transfer', 'Rebalance', 'AgentSlash', 'ParamChange']).describe('Proposal type'),
    description: z.string().describe('Human-readable description of the allocation strategy'),
    amount:      z.number().describe('USDT amount to allocate'),
  },
  async ({ proposer, type, description, amount }) => {
    // Inject directly into swarm via tick endpoint
    // The swarm coordinator is running in the agent process
    const result = await api('/api/propose', 'POST', { proposer, type, description, amount })
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
    }
  }
)

server.tool(
  'cast_vote',
  'Cast a vote on a proposal as a named agent.',
  {
    proposalId: z.number().describe('Proposal ID to vote on'),
    voter:      z.enum(['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon']).describe('Agent casting the vote'),
    support:    z.boolean().describe('true = vote for, false = vote against'),
  },
  async ({ proposalId, voter, support }) => {
    const result = await api('/api/vote', 'POST', { proposalId, voter, support })
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
    }
  }
)

server.tool(
  'get_allocation_history',
  'Get the history of executed capital allocations from the OrionVault treasury.',
  {},
  async () => {
    const state = await api('/api/state')
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(state.history, null, 2),
      }],
    }
  }
)

server.tool(
  'trigger_cycle',
  'Force one autonomous swarm cycle: agents observe market, propose strategies, and vote.',
  {},
  async () => {
    const result = await api('/api/tick', 'POST')
    return {
      content: [{
        type: 'text',
        text: `Cycle triggered. ${result.events?.length ?? 0} events generated.`,
      }],
    }
  }
)

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport()
await server.connect(transport)
console.error('Orion Vault MCP server running (stdio)')
