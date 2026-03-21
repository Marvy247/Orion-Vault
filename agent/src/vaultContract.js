import { ethers } from 'ethers'

const ABI = [
  'function bootstrapAgent(address wallet, string name) external',
  'function propose(uint8 pType, string description, address target, address token, uint256 amount, bytes callData) external returns (uint256)',
  'function vote(uint256 id, bool support) external',
  'function finalizeProposal(uint256 id) external',
  'function getProposalStatus(uint256 id) external view returns (uint8)',
  'function getProposalInfo(uint256 id) external view returns (address proposer, uint8 pType, string description, address target, address token, uint256 amount, uint256 votesFor, uint256 votesAgainst, uint256 expiresAt, uint8 status)',
  'function agents(address) external view returns (address wallet, string name, uint256 reputation, uint256 totalProposed, uint256 successfulProps, bool active, uint256 joinedAt)',
  'function proposalCount() external view returns (uint256)',
  'function treasuryBalance(address) external view returns (uint256)',
  'function totalReputation() external view returns (uint256)',
  'event ProposalCreated(uint256 indexed id, address indexed proposer, uint8 pType, string description)',
  'event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight)',
  'event ProposalExecuted(uint256 indexed id, bool success)',
  'event AgentRewarded(address indexed wallet, uint256 rewardAmount)',
]

/**
 * VaultContract – thin ethers.js wrapper around the deployed OrionVault.
 * Each agent signs its own transactions via its WDK-derived private key.
 */
export class VaultContract {
  constructor(address, rpcUrl) {
    this.address  = address
    this.provider = new ethers.JsonRpcProvider(rpcUrl, 11155111, { staticNetwork: true, batchMaxCount: 1 })
    this._readers = new Map()
    this._writers = new Map()
  }

  /**
   * Register an agent signer. The WDK account exposes a sign() method
   * but for ethers we need the raw private key. We derive it via the
   * WDK account's underlying wallet.
   */
  async addSigner(agentName, wdkAccount) {
    try {
      // WDK EVM account: _account is the HD node, privateKeyBuffer is a Buffer
      const pkBuf = wdkAccount._account?.privateKeyBuffer
      if (!pkBuf) throw new Error('no privateKeyBuffer')

      const pk     = '0x' + Buffer.from(pkBuf).toString('hex')
      const signer   = new ethers.Wallet(pk, this.provider)
      const contract = new ethers.Contract(this.address, ABI, signer)
      this._writers.set(agentName, contract)
      this._readers.set(agentName, contract)
      console.log(`[VaultContract] ${agentName} signer ready (${signer.address})`)
    } catch (err) {
      console.warn(`[VaultContract] ${agentName} read-only: ${err.message}`)
      const ro = new ethers.Contract(this.address, ABI, this.provider)
      this._readers.set(agentName, ro)
    }
  }

  reader(agentName) {
    return this._readers.get(agentName) || new ethers.Contract(this.address, ABI, this.provider)
  }

  writer(agentName) {
    return this._writers.get(agentName) || null
  }

  async getProposalCount() {
    const c = new ethers.Contract(this.address, ABI, this.provider)
    return Number(await c.proposalCount())
  }

  async getAgentInfo(address) {
    const c = new ethers.Contract(this.address, ABI, this.provider)
    return c.agents(address)
  }
}
