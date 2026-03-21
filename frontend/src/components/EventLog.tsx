import { motion, AnimatePresence } from 'framer-motion'
import { useSwarm } from '../context/SwarmContext'

const EVENT_ICON: Record<string, string> = {
  agent_joined:      '🤖',
  proposal_created:  '📋',
  vote_cast:         '🗳️',
  proposal_executed: '⚡',
  proposal_rejected: '❌',
  agent_rewarded:    '🏆',
  agent_slashed:     '⚠️',
  cycle_complete:    '🔄',
}

export function EventLog() {
  const { state } = useSwarm()
  if (!state) return null

  const events = [...state.eventLog].reverse().slice(0, 30)

  return (
    <div className="space-y-1.5 max-h-96 overflow-y-auto no-scrollbar">
      <AnimatePresence initial={false}>
        {events.map((e, i) => (
          <motion.div
            key={`${e.ts}-${i}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-start gap-2 text-xs py-1.5 border-b border-app-border/50 last:border-0"
          >
            <span className="text-base shrink-0">{EVENT_ICON[e.type] || '•'}</span>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-text-dim capitalize">{e.type.replace(/_/g, ' ')}</span>
              {e.data?.description && (
                <p className="text-text-pale truncate">{e.data.description}</p>
              )}
              {e.data?.name && !e.data?.description && (
                <p className="text-text-pale">Agent {e.data.name}</p>
              )}
              {e.data?.voter && (
                <p className="text-text-pale">{e.data.voter} → {e.data.support ? '✅' : '❌'}</p>
              )}
            </div>
            <span className="text-text-pale shrink-0">
              {new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
