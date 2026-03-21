/**
 * fund-agents.js
 * Run this once to send 0.01 Sepolia ETH to each agent wallet.
 * Usage: PRIVATE_KEY=0x... node fund-agents.js
 */
import { ethers } from 'ethers'

const PK       = process.env.PRIVATE_KEY
const RPC_URL  = process.env.RPC_URL || 'https://sepolia.drpc.org'
const AMOUNT   = ethers.parseEther('0.01')

const AGENTS = [
  { name: 'Alpha',   address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' },
  { name: 'Beta',    address: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94' },
  { name: 'Gamma',   address: '0xfc2077CA7F403cBECA41B1B0F62D91B5EA631B5E' },
  { name: 'Delta',   address: '0x58A57ed9d8d624cBD12e2C467D34787555bB1b25' },
  { name: 'Epsilon', address: '0x3061750d3dF69ef7B8d4407CB7f3F879Fd9d2398' },
]

if (!PK) { console.error('Set PRIVATE_KEY env var'); process.exit(1) }

const provider = new ethers.JsonRpcProvider(RPC_URL)
const funder   = new ethers.Wallet(PK, provider)

const bal = await provider.getBalance(funder.address)
console.log(`Funder: ${funder.address}`)
console.log(`Balance: ${ethers.formatEther(bal)} ETH\n`)

for (const agent of AGENTS) {
  const agentBal = await provider.getBalance(agent.address)
  if (agentBal >= AMOUNT) {
    console.log(`✅ ${agent.name} already funded (${ethers.formatEther(agentBal)} ETH)`)
    continue
  }
  try {
    const tx = await funder.sendTransaction({ to: agent.address, value: AMOUNT })
    await tx.wait()
    console.log(`✅ Funded ${agent.name}: ${tx.hash}`)
  } catch (err) {
    console.error(`❌ ${agent.name}: ${err.message}`)
  }
}
