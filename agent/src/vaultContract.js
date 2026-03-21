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
    this.provider = new ethers.JsonRpcProvider(rpcUrl)
    this._readers = new Map()  // agentName → read-only contract
    this._writers = new Map()  // agentName → signer contract
  }

  /**
   * Register an agent signer. The WDK account exposes a sign() method
   * but for ethers we need the raw private key. We derive it via the
   * WDK account's underlying wallet.
   */
  async addSigner(agentName, wdkAccount) {
    // WDK EVM account exposes _account.privateKey via the internal wallet
    const pk = wdkAccount._account?._wallet?.privateKey
      || wdkAccount._account?.privateKey
      || null

    if (!pk) {
      console.warn(`[VaultContract] No private key accessible for ${agentName} — using read-only mode`)
      const ro = new ethers.Contract(this.address, ABI, this.provider)
      this._readers.set(agentName, ro)
      return
    }

    const signer = new ethers.Wallet(pk, this.provider)
    const contract = new ethers.Contract(this.address, ABI, signer)
    this._writers.set(agentName, contract)
    this._readers.set(agentName, contract)
    console.log(`[VaultContract] ${agentName} signer registered (${signer.address})`)
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
