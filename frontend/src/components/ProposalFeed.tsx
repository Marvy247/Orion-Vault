import { motion } from 'framer-motion'
import { useSwarm } from '../context/SwarmContext'

const RISK_COLOR: Record<string, string> = {
  LOW:    'text-emerald-600 bg-emerald-50',
  MEDIUM: 'text-amber-600 bg-amber-50',
  HIGH:   'text-red-600 bg-red-50',
}

const STATUS_COLOR: Record<string, string> = {
  pending:  'text-blue-600 bg-blue-50',
  approved: 'text-emerald-600 bg-emerald-50',
  rejected: 'text-red-600 bg-red-50',
  executed: 'text-purple-600 bg-purple-50',
}

export function ProposalFeed() {
  const { state } = useSwarm()
  if (!state) return null

  const proposals = [...state.proposals].reverse().slice(0, 12)

  return (
    <div className="space-y-3">
      {proposals.length === 0 && (
        <p className="text-text-pale text-sm text-center py-8">Waiting for first proposals...</p>
      )}
      {proposals.map((p, i) => {
        const timeLeft = Math.max(0, Math.floor((p.expiresAt - Date.now()) / 1000))
        const totalVotes = p.votesFor + p.votesAgainst
        const forPct = totalVotes > 0 ? Math.round(p.votesFor / totalVotes * 100) : 0

        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass rounded-xl p-4 border border-app-border"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-main leading-snug">{p.description}</p>
                <p className="text-xs text-text-pale mt-1">{p.rationale}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[p.status]}`}>
                  {p.status}
                </span>
                {p.riskScore && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RISK_COLOR[p.riskScore]}`}>
                    {p.riskScore}
                  </span>
                )}
              </div>
            </div>

            {/* Vote bar */}
            <div className="mt-2">
              <div className="flex justify-between text-xs text-text-pale mb-1">
                <span>✅ {p.votesFor.toLocaleString()} rep</span>
                <span>{p.status === 'pending' && timeLeft > 0 ? `${timeLeft}s left` : ''}</span>
                <span>❌ {p.votesAgainst.toLocaleString()} rep</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-indigo rounded-full transition-all duration-500"
                  style={{ width: `${forPct}%` }}
                />
              </div>
              {(p as any).txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${(p as any).txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent-indigo hover:underline font-mono mt-1 block"
                >
                  ⛓ {(p as any).txHash.slice(0, 12)}… ↗
                </a>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
