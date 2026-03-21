import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { AgentWallet } from './agentWallet.js'
import { SwarmCoordinator } from './swarm.js'

const PORT    = process.env.PORT || 3001
const RPC_URL = process.env.RPC_URL || 'https://sepolia.drpc.org'

// ─── Agent Seeds (test wallets only) ─────────────────────────────────────────
const AGENTS = [
  { name: 'Alpha',   seed: process.env.AGENT_ALPHA_SEED   || 'test test test test test test test test test test test junk' },
  { name: 'Beta',    seed: process.env.AGENT_BETA_SEED    || 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about' },
  { name: 'Gamma',   seed: process.env.AGENT_GAMMA_SEED   || 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong' },
  { name: 'Delta',   seed: process.env.AGENT_DELTA_SEED   || 'legal winner thank year wave sausage worth useful legal winner thank yellow' },
  { name: 'Epsilon', seed: process.env.AGENT_EPSILON_SEED || 'letter advice cage absurd amount doctor acoustic avoid letter advice cage above' },
]

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const swarm   = new SwarmCoordinator()
const wallets = []

async function bootstrap() {
  console.log('🚀 Orion Vault – Initializing agent swarm...')

  for (const cfg of AGENTS) {
    try {
      const wallet = new AgentWallet(cfg.name, cfg.seed, RPC_URL)
      await wallet.init()
      wallets.push(wallet)
      swarm.addAgent(cfg.name, wallet.address, wallet)
      console.log(`  ✅ ${cfg.name} → ${wallet.address}`)
    } catch (err) {
      console.error(`  ❌ Failed to init ${cfg.name}:`, err.message)
    }
  }

  console.log(`\n🌌 Swarm online with ${wallets.length} agents`)
  startAutonomousLoop()
}

// ─── Autonomous Loop ──────────────────────────────────────────────────────────
let loopInterval = null

function startAutonomousLoop() {
  const TICK_MS = 8_000 // 8 second cycles for demo visibility
  console.log(`⏱  Autonomous loop starting (${TICK_MS / 1000}s cycles)`)

  loopInterval = setInterval(async () => {
    try {
      await swarm.tick()
    } catch (err) {
      console.error('Swarm tick error:', err.message)
    }
  }, TICK_MS)
}

// ─── API Server ───────────────────────────────────────────────────────────────
const app = express()
app.use(cors())
app.use(express.json())

// Full swarm state snapshot
app.get('/api/state', (_req, res) => {
  res.json(swarm.getState())
})

// SSE stream for real-time events
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.flushHeaders()

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  // Send current state immediately
  send({ type: 'init', data: swarm.getState() })

  // Patch swarm to forward events to this SSE client
  const origEmit = swarm._emit.bind(swarm)
  swarm._emit = (type, data) => {
    origEmit(type, data)
    send({ type, data, ts: Date.now() })
  }

  req.on('close', () => {
    swarm._emit = origEmit
  })
})

// Manual trigger: force one swarm tick (useful for demo)
app.post('/api/tick', async (_req, res) => {
  const events = await swarm.tick()
  res.json({ ok: true, events })
})

// Get agent wallet addresses
app.get('/api/agents', (_req, res) => {
  res.json(swarm.getState().agents)
})

// Get proposals
app.get('/api/proposals', (_req, res) => {
  res.json(swarm.getState().proposals)
})

// Get treasury
app.get('/api/treasury', (_req, res) => {
  res.json({ treasury: swarm.treasury, market: swarm.market })
})

app.listen(PORT, async () => {
  console.log(`\n🔭 Orion Vault API → http://localhost:${PORT}`)
  await bootstrap()
})

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down swarm...')
  if (loopInterval) clearInterval(loopInterval)
  wallets.forEach(w => w.dispose())
  process.exit(0)
})
