import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { AgentWallet } from './agentWallet.js'
import { SwarmCoordinator } from './swarm.js'
import { VaultContract } from './vaultContract.js'

const PORT             = process.env.PORT || 3001
const RPC_URL          = process.env.RPC_URL || 'https://sepolia.drpc.org'
const VAULT_ADDRESS    = process.env.VAULT_CONTRACT_ADDRESS

const AGENTS = [
  { name: 'Alpha',   seed: process.env.AGENT_ALPHA_SEED   || 'test test test test test test test test test test test junk' },
  { name: 'Beta',    seed: process.env.AGENT_BETA_SEED    || 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about' },
  { name: 'Gamma',   seed: process.env.AGENT_GAMMA_SEED   || 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong' },
  { name: 'Delta',   seed: process.env.AGENT_DELTA_SEED   || 'legal winner thank year wave sausage worth useful legal winner thank yellow' },
  { name: 'Epsilon', seed: process.env.AGENT_EPSILON_SEED || 'letter advice cage absurd amount doctor acoustic avoid letter advice cage above' },
]

const swarm   = new SwarmCoordinator()
const wallets = []

async function bootstrap() {
  console.log('🚀 Orion Vault – Initializing agent swarm...')
  console.log(`📜 Contract: ${VAULT_ADDRESS || 'not set'}`)
  console.log(`🌐 Network:  Sepolia (${RPC_URL})`)

  // Init WDK wallets
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

  // Wire up on-chain contract if address is set
  if (VAULT_ADDRESS && VAULT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
    console.log('\n🔗 Connecting to OrionVault on Sepolia...')
    const vault = new VaultContract(VAULT_ADDRESS, RPC_URL)

    for (const wallet of wallets) {
      await vault.addSigner(wallet.name, wallet._account)
    }

    swarm.setVaultContract(vault)

    // Bootstrap agents on-chain (deployer already registered them, but try anyway)
    const anyWriter = [...vault._writers.values()][0]
    if (anyWriter) {
      for (const wallet of wallets) {
        try {
          const w = vault.writer(wallet.name)
          if (w) {
            const tx = await w.registerAgent(wallet.name)
            await tx.wait()
            console.log(`  ⛓  ${wallet.name} registered on-chain`)
          }
        } catch {
          // Already registered — that's fine
        }
      }
    }

    console.log('✅ On-chain integration active\n')
  } else {
    console.log('⚠️  Running in simulation mode (no contract address)\n')
  }

  console.log(`🌌 Swarm online with ${wallets.length} agents`)
  startAutonomousLoop()
}

let loopInterval = null

function startAutonomousLoop() {
  const TICK_MS = 8_000
  console.log(`⏱  Autonomous loop starting (${TICK_MS / 1000}s cycles)\n`)
  loopInterval = setInterval(async () => {
    try { await swarm.tick() } catch (err) { console.error('Tick error:', err.message) }
  }, TICK_MS)
}

// ─── API ──────────────────────────────────────────────────────────────────────
const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/state',     (_req, res) => res.json(swarm.getState()))
app.get('/api/agents',    (_req, res) => res.json(swarm.getState().agents))
app.get('/api/proposals', (_req, res) => res.json(swarm.getState().proposals))
app.get('/api/treasury',  (_req, res) => res.json({ treasury: swarm.treasury, market: swarm.market }))

app.post('/api/tick', async (_req, res) => {
  const events = await swarm.tick()
  res.json({ ok: true, events })
})

app.post('/api/propose', (req, res) => {
  const { proposer, type, description, amount } = req.body
  if (!swarm.agents.has(proposer)) return res.status(400).json({ error: 'Unknown agent' })
  const id = swarm.submitProposal(proposer, { type, description, amount, riskScore: 'MEDIUM', rationale: 'MCP-submitted' })
  res.json({ ok: true, proposalId: id })
})

app.post('/api/vote', (req, res) => {
  const { proposalId, voter, support } = req.body
  const agent = swarm.agents.get(voter)
  if (!agent) return res.status(400).json({ error: 'Unknown agent' })
  swarm.castVote(proposalId, voter, support, agent.reputation)
  res.json({ ok: true })
})

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.flushHeaders()

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)
  send({ type: 'init', data: swarm.getState() })

  const origEmit = swarm._emit.bind(swarm)
  swarm._emit = (type, data) => {
    origEmit(type, data)
    send({ type, data, ts: Date.now() })
  }
  req.on('close', () => { swarm._emit = origEmit })
})

app.listen(PORT, async () => {
  console.log(`\n🔭 Orion Vault API → http://localhost:${PORT}`)
  await bootstrap()
})

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...')
  if (loopInterval) clearInterval(loopInterval)
  wallets.forEach(w => w.dispose())
  process.exit(0)
})
