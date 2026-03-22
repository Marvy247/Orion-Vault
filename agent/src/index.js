import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createAgentWallet } from './agentWallet.js'
import { LendingContract } from './lendingContract.js'
import { LendingEngine } from './lendingEngine.js'

const PORT             = process.env.PORT || 3001
const RPC_URL          = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'
const CONTRACT_ADDRESS = process.env.SYMBIOLEND_ADDRESS
const TOKEN_ADDRESS    = process.env.USDT_ADDRESS

// ── Agent seeds ───────────────────────────────────────────────────────────────

const LENDER_SEED = process.env.LENDER_SEED
const BORROWER_SEEDS = [
  process.env.BORROWER_1_SEED,
  process.env.BORROWER_2_SEED,
  process.env.BORROWER_3_SEED,
  process.env.BORROWER_4_SEED,
]

const BORROWER_NAMES = ['Nexus', 'Flux', 'Orbit', 'Pulse']
const BORROWER_TYPES = ['DeFi Yield Agent', 'Trading Agent', 'Tipping Agent', 'Arbitrage Agent']

// ── Bootstrap ─────────────────────────────────────────────────────────────────

let engine = null
const sseClients = []

async function bootstrap() {
  console.log('\n🔗 SymbioLend – Initializing agent lending protocol...')

  const contract = new LendingContract(CONTRACT_ADDRESS, TOKEN_ADDRESS, RPC_URL)

  // Lender agent
  const lenderWallet = await createAgentWallet(LENDER_SEED, RPC_URL)
  const lenderAddr   = await lenderWallet.getAddress()
  contract.addSigner('Lender', lenderWallet)
  await contract.registerAgent('Lender').catch(() => {})

  const lender = {
    name:       'Lender',
    address:    lenderAddr,
    type:       'Lender Agent',
    activeLoans: 0,
  }
  console.log(`✅ Lender Agent ready at ${lenderAddr}`)

  // Borrower agents
  const borrowers = []
  for (let i = 0; i < BORROWER_NAMES.length; i++) {
    const seed   = BORROWER_SEEDS[i]
    if (!seed) continue
    const wallet = await createAgentWallet(seed, RPC_URL)
    const addr   = await wallet.getAddress()
    const name   = BORROWER_NAMES[i]
    contract.addSigner(name, wallet)
    await contract.registerAgent(name).catch(() => {})
    borrowers.push({ name, address: addr, type: BORROWER_TYPES[i], activeLoans: 0 })
    console.log(`✅ Borrower ${name} (${BORROWER_TYPES[i]}) at ${addr}`)
  }

  engine = new LendingEngine(lender, borrowers, contract)
  console.log(`\n🌐 Lending engine online — ${borrowers.length} borrower agents\n`)

  // Autonomous loop
  setInterval(async () => {
    try {
      const events = await engine.tick()
      for (const e of events) broadcast(e)
    } catch (err) {
      console.error('[loop]', err.message)
    }
  }, 10_000)
}

// ── SSE broadcast ─────────────────────────────────────────────────────────────

function broadcast(event) {
  const data = `data: ${JSON.stringify(event)}\n\n`
  for (const res of sseClients) {
    try { res.write(data) } catch {}
  }
}

// ── Express API ───────────────────────────────────────────────────────────────

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/state', (_, res) => {
  res.json(engine ? engine.getState() : { error: 'initializing' })
})

app.get('/api/loans', (_, res) => {
  res.json(engine ? [...engine.loans.values()] : [])
})

app.get('/api/zk/:borrower', async (req, res) => {
  if (!engine) return res.status(503).json({ error: 'initializing' })
  const { proveCreditScore, verifyProof } = await import('./zkCredit.js')
  const agent = engine.borrowers.find(b => b.name === req.params.borrower)
  if (!agent) return res.status(404).json({ error: 'agent not found' })
  try {
    const onChain = await engine.contract.getAgent(agent.address)
    const score   = Number(onChain.creditScore)
    const proof   = await proveCreditScore(score, 200)
    if (!proof) return res.json({ available: false, reason: 'ZK keys not set up yet' })
    const valid   = await verifyProof(proof.proof, proof.publicSignals)
    res.json({ borrower: agent.name, creditScore: score, commitment: proof.commitment, minScore: 200, verified: valid, proof: proof.proof })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/agents', (_, res) => {
  res.json(engine ? [engine.lender, ...engine.borrowers] : [])
})

app.get('/api/dids', (_, res) => {
  res.json(engine ? engine.getState().dids : [])
})

app.get('/api/market', (_, res) => {
  res.json(engine ? engine.market : {})
})

app.post('/api/tick', async (_, res) => {
  if (!engine) return res.status(503).json({ error: 'initializing' })
  const events = await engine.tick()
  for (const e of events) broadcast(e)
  res.json({ events, state: engine.getState() })
})

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()
  sseClients.push(res)
  req.on('close', () => {
    const i = sseClients.indexOf(res)
    if (i !== -1) sseClients.splice(i, 1)
  })
})

app.listen(PORT, () => {
  console.log(`🔭 SymbioLend API → http://localhost:${PORT}`)
  bootstrap().catch(console.error)
})
