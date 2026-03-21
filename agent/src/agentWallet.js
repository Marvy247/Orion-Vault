import WDK from '@tetherto/wdk'
import WalletManagerEvm from '@tetherto/wdk-wallet-evm'

/**
 * AgentWallet – wraps a WDK instance for one swarm agent.
 * Each agent has its own HD-derived self-custodial EVM wallet.
 */
export class AgentWallet {
  constructor(name, seed, rpcUrl) {
    this.name   = name
    this.rpcUrl = rpcUrl
    this._wdk   = new WDK(seed)
      .registerWallet('evm', WalletManagerEvm, { provider: rpcUrl })
    this._account = null
    this._address = null
  }

  async init() {
    this._account = await this._wdk.getAccount('evm', 0)
    this._address = await this._account.getAddress()
    return this
  }

  get address() { return this._address }

  async getBalance() {
    return this._account.getBalance()
  }

  async getTokenBalance(tokenAddress) {
    return this._account.getTokenBalances([tokenAddress])
  }

  async sign(message) {
    return this._account.sign(message)
  }

  async sendTransaction(to, value) {
    return this._account.sendTransaction({ to, value })
  }

  dispose() {
    this._wdk.dispose()
  }
}
