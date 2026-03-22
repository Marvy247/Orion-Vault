import { ethers } from 'ethers'
import { extractPrivateKey } from './agentWallet.js'

const ABI = [
  'function registerAgent() external',
  'function requestLoan(address token, uint256 principal, uint256 interestBps, uint256 duration, uint256 collateral) external returns (uint256)',
  'function fundLoan(uint256 loanId, uint256 duration) external',
  'function repay(uint256 loanId, uint256 amount) external',
  'function markDefault(uint256 loanId) external',
  'function liquidate(uint256 loanId) external',
  'function getAgent(address wallet) external view returns (tuple(address wallet, uint256 creditScore, uint256 totalBorrowed, uint256 totalRepaid, uint256 activeLoans, bool registered))',
  'function getLoan(uint256 id) external view returns (tuple(uint256 id, address lender, address borrower, address token, uint256 principal, uint256 collateral, uint256 interestBps, uint256 dueAt, uint256 repaidAmount, uint8 status))',
  'function totalOwed(uint256 loanId) external view returns (uint256)',
  'function loanCount() external view returns (uint256)',
  'event LoanRequested(uint256 indexed loanId, address borrower, address token, uint256 principal, uint256 interestBps, uint256 duration)',
  'event LoanFunded(uint256 indexed loanId, address lender)',
  'event LoanRepaid(uint256 indexed loanId, uint256 amount, bool fullRepayment)',
  'event LoanDefaulted(uint256 indexed loanId, address borrower)',
  'event LoanLiquidated(uint256 indexed loanId, address liquidator)',
  'event CreditScoreUpdated(address indexed agent, uint256 oldScore, uint256 newScore)',
]

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
]

export class LendingContract {
  constructor(contractAddress, tokenAddress, rpcUrl) {
    this.contractAddress = contractAddress
    this.tokenAddress    = tokenAddress
    this.provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
      staticNetwork: true,
      batchMaxCount: 1,
    })
    this.signers = {}   // agentName → ethers.Wallet
    this.contract = new ethers.Contract(contractAddress, ABI, this.provider)
  }

  addSigner(name, wdkAccount) {
    const pk = extractPrivateKey(wdkAccount)
    this.signers[name] = new ethers.Wallet(pk, this.provider)
    console.log(`[LendingContract] ${name} signer ready (${this.signers[name].address})`)
  }

  _as(name) {
    return this.contract.connect(this.signers[name])
  }

  _token(name) {
    return new ethers.Contract(this.tokenAddress, ERC20_ABI, this.signers[name])
  }

  async registerAgent(name) {
    try {
      const tx = await this._as(name).registerAgent()
      await tx.wait()
      return tx.hash
    } catch (e) {
      if (e.message?.includes('already registered')) return null
      throw e
    }
  }

  async requestLoan(name, principal, interestBps, durationSecs, collateral = 0n) {
    if (collateral > 0n) {
      const approveTx = await this._token(name).approve(this.contractAddress, collateral)
      await approveTx.wait()
    }
    const tx = await this._as(name).requestLoan(
      this.tokenAddress, principal, interestBps, durationSecs, collateral
    )
    const receipt = await tx.wait()
    const event = receipt.logs
      .map(l => { try { return this.contract.interface.parseLog(l) } catch { return null } })
      .find(e => e?.name === 'LoanRequested')
    return { hash: tx.hash, loanId: event ? Number(event.args.loanId) : null }
  }

  async fundLoan(name, loanId, principal, durationSecs) {
    const approveTx = await this._token(name).approve(this.contractAddress, principal)
    await approveTx.wait()
    const tx = await this._as(name).fundLoan(loanId, durationSecs)
    await tx.wait()
    return tx.hash
  }

  async repay(name, loanId, amount) {
    const approveTx = await this._token(name).approve(this.contractAddress, amount)
    await approveTx.wait()
    const tx = await this._as(name).repay(loanId, amount)
    await tx.wait()
    return tx.hash
  }

  async markDefault(name, loanId) {
    const tx = await this._as(name).markDefault(loanId)
    await tx.wait()
    return tx.hash
  }

  async getAgent(address) {
    return this.contract.getAgent(address)
  }

  async getLoan(loanId) {
    return this.contract.getLoan(loanId)
  }

  async totalOwed(loanId) {
    return this.contract.totalOwed(loanId)
  }

  async loanCount() {
    return Number(await this.contract.loanCount())
  }

  async tokenBalance(address) {
    return this.contract.runner.provider
      ? new ethers.Contract(this.tokenAddress, ERC20_ABI, this.provider).balanceOf(address)
      : 0n
  }
}
