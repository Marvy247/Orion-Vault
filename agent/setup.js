/**
 * One-time setup: mint USDT to lender, fund borrowers with ETH, register all agents.
 */
import 'dotenv/config'
import { ethers } from 'ethers'
import { createAgentWallet, extractPrivateKey } from './src/agentWallet.js'

const RPC      = process.env.RPC_URL
const CONTRACT = process.env.SYMBIOLEND_ADDRESS
const USDT     = process.env.USDT_ADDRESS
const DEPLOYER_KEY = '0x8e4e0161ac8f367670394f767aabc24709cb1e3d4e9e6afe071b484859f1ac90'

const provider = new ethers.JsonRpcProvider(RPC, undefined, { staticNetwork: true, batchMaxCount: 1 })
const deployer = new ethers.Wallet(DEPLOYER_KEY, provider)

const USDT_ABI = [
  'function mint(address to, uint256 amount) external',
  'function balanceOf(address) external view returns (uint256)',
]
const CONTRACT_ABI = [
  'function registerAgent() external',
  'function getAgent(address) external view returns (tuple(address wallet, uint256 creditScore, uint256 totalBorrowed, uint256 totalRepaid, uint256 activeLoans, bool registered))',
]

const SEEDS = [
  ['Lender', process.env.LENDER_SEED],
  ['Nexus',  process.env.BORROWER_1_SEED],
  ['Flux',   process.env.BORROWER_2_SEED],
  ['Orbit',  process.env.BORROWER_3_SEED],
  ['Pulse',  process.env.BORROWER_4_SEED],
]

async function main() {
  const usdt     = new ethers.Contract(USDT, USDT_ABI, deployer)
  const contract = new ethers.Contract(CONTRACT, CONTRACT_ABI, deployer)

  console.log('Deployer:', deployer.address)
  console.log('SymbioLend:', CONTRACT)
  console.log('MockUSDT:', USDT)
  console.log()

  for (const [name, seed] of SEEDS) {
    const wallet = await createAgentWallet(seed, RPC)
    const addr   = await wallet.getAddress()
    const pk     = extractPrivateKey(wallet)
    const signer = new ethers.Wallet(pk, provider)

    // Check ETH balance
    const ethBal = await provider.getBalance(addr)
    console.log(`${name} (${addr}): ${ethers.formatEther(ethBal)} ETH`)

    // Fund with ETH if needed
    if (ethBal < ethers.parseEther('0.005')) {
      const tx = await deployer.sendTransaction({ to: addr, value: ethers.parseEther('0.01') })
      await tx.wait()
      console.log(`  → Funded with 0.01 ETH`)
    }

    // Mint USDT to lender only
    if (name === 'Lender') {
      const bal = await usdt.balanceOf(addr)
      if (bal < 10_000n * 1_000_000n) {
        const tx = await usdt.mint(addr, 100_000n * 1_000_000n)
        await tx.wait()
        console.log(`  → Minted 100,000 USDT to Lender`)
      } else {
        console.log(`  → Lender already has ${ethers.formatUnits(bal, 6)} USDT`)
      }
    }

    // Register agent on-chain
    try {
      const agent = await contract.getAgent(addr)
      if (agent.registered) {
        console.log(`  → Already registered (score: ${agent.creditScore})`)
      } else {
        const tx = await contract.connect(signer).registerAgent()
        await tx.wait()
        console.log(`  → Registered on-chain`)
      }
    } catch (e) {
      console.error(`  → Register failed: ${e.message}`)
    }
  }

  console.log('\n✅ Setup complete')
}

main().catch(console.error)
