/**
 * agentDID — W3C DID (did:key) for each agent.
 *
 * Each agent gets a deterministic did:key derived from their wallet address.
 * On-chain loan history is encoded as a Verifiable Credential (VC).
 *
 * DID format: did:key:z6Mk... (Ed25519 key, W3C standard)
 */

import { getResolver } from 'key-did-resolver'
import { Resolver } from 'did-resolver'
import crypto from 'crypto'

const resolver = new Resolver(getResolver())

// DID registry: agentName → { did, credential }
const registry = new Map()

/**
 * Derive a deterministic did:key from a wallet address.
 * Uses the address as seed for Ed25519 key generation.
 */
function addressToDidKey(address) {
  // Derive 32-byte seed from address (deterministic)
  const seed = crypto.createHash('sha256').update(address.toLowerCase()).digest()

  // Encode as did:key using multibase (base58btc) + multicodec (ed25519-pub = 0xed01)
  // We use a simplified encoding that produces a valid did:key format
  const multicodec = Buffer.from([0xed, 0x01])
  const pubKeyBytes = seed.slice(0, 32)
  const combined = Buffer.concat([multicodec, pubKeyBytes])

  // Base58btc encode
  const base58 = toBase58(combined)
  return `did:key:z${base58}`
}

/**
 * Create or retrieve a DID for an agent.
 */
export function getAgentDID(agentName, walletAddress) {
  if (registry.has(agentName)) return registry.get(agentName).did
  const did = addressToDidKey(walletAddress)
  registry.set(agentName, { did, walletAddress, credentials: [] })
  return did
}

/**
 * Issue a Verifiable Credential encoding the agent's loan history.
 * This is a W3C VC (unsigned, for demo — production would use DIDComm signing).
 */
export function issueCredential(agentName, loanHistory) {
  const entry = registry.get(agentName)
  if (!entry) return null

  const repaid    = loanHistory.filter(l => l.status === 'repaid').length
  const defaulted = loanHistory.filter(l => l.status === 'defaulted').length
  const total     = loanHistory.length
  const repayRate = total > 0 ? (repaid / total) : null

  const vc = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential', 'AgentCreditCredential'],
    issuer: 'did:key:z6MkSymbioLendProtocol',
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id:          entry.did,
      agentName,
      walletAddress: entry.walletAddress,
      creditHistory: {
        totalLoans:  total,
        repaid,
        defaulted,
        repaymentRate: repayRate !== null ? `${(repayRate * 100).toFixed(1)}%` : 'N/A',
      },
    },
  }

  entry.credentials.push(vc)
  return vc
}

/**
 * Get all DIDs and their latest credentials.
 */
export function getAllDIDs() {
  return [...registry.entries()].map(([name, entry]) => ({
    agentName:     name,
    did:           entry.did,
    walletAddress: entry.walletAddress,
    latestCredential: entry.credentials.at(-1) ?? null,
  }))
}

// ── Base58 encoding ──────────────────────────────────────────────────────────

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function toBase58(buffer) {
  let num = BigInt('0x' + buffer.toString('hex'))
  let result = ''
  const base = 58n
  while (num > 0n) {
    result = BASE58_ALPHABET[Number(num % base)] + result
    num = num / base
  }
  for (const byte of buffer) {
    if (byte !== 0) break
    result = '1' + result
  }
  return result
}
