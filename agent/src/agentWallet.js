import WDK from '@tetherto/wdk'
import WalletManagerEvm from '@tetherto/wdk-wallet-evm'

/**
 * Creates a WDK-backed self-custodial EVM wallet for an agent.
 * Returns the account object with address + signing capability.
 */
export async function createAgentWallet(seed, rpcUrl) {
  const wdk = new WDK(seed).registerWallet('evm', WalletManagerEvm, { provider: rpcUrl })
  const account = await wdk.getAccount('evm', 0)
  return account
}

/**
 * Extracts the raw private key from a WDK account for ethers.js signing.
 */
export function extractPrivateKey(account) {
  const pkBuf = account._account?.privateKeyBuffer
  return '0x' + Buffer.from(pkBuf).toString('hex')
}
