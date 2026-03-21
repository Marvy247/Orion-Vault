import { motion } from 'framer-motion'
import { useSwarm } from '../context/SwarmContext'

export function AllocationHistory() {
  const { state } = useSwarm()
  if (!state) return null

  const history = [...state.history].reverse().slice(0, 10)

  if (history.length === 0) {
    return <p className="text-text-pale text-sm text-center py-8">No allocations executed yet</p>
  }

  return (
    <div className="space-y-2">
      {history.map((h, i) => (
        <motion.div
          key={h.txHash}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center justify-between py-2 border-b border-app-border/50 last:border-0"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-main truncate">{h.description}</p>
            <p className="text-xs text-text-pale font-mono mt-0.5">
              {h.txHash.slice(0, 10)}…{h.txHash.slice(-6)}
            </p>
          </div>
          <div className="text-right shrink-0 ml-4">
            <p className="text-sm font-bold text-accent-indigo">${h.amount?.toLocaleString()}</p>
            <p className="text-xs text-text-pale">
              {new Date(h.executedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
