import { motion } from 'framer-motion'
import { useSwarm } from '../context/SwarmContext'

const REP_COLOR = (rep: number) => {
  if (rep >= 1500) return 'text-emerald-600'
  if (rep >= 1000) return 'text-blue-600'
  return 'text-amber-600'
}

export function AgentGrid() {
  const { state } = useSwarm()
  if (!state) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {state.agents.map((agent, i) => {
        const repPct = Math.min(100, (agent.reputation / 2000) * 100)
        const proposals = state.proposals.filter(p => p.proposer === agent.name)
        const executed  = proposals.filter(p => p.status === 'executed').length

        return (
          <motion.div
            key={agent.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass rounded-2xl p-5 border border-app-border hover:border-accent-indigo/30 transition-colors"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-indigo to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  {agent.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-text-main">Agent {agent.name}</p>
                  <p className="text-xs text-text-pale font-mono">
                    {agent.address.slice(0, 6)}…{agent.address.slice(-4)}
                  </p>
                </div>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Active" />
            </div>

            {/* Reputation bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-pale">Reputation</span>
                <span className={`font-bold ${REP_COLOR(agent.reputation)}`}>{agent.reputation}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-accent-indigo to-purple-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${repPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-app-hover rounded-lg py-2">
                <p className="text-lg font-bold text-text-main">{proposals.length}</p>
                <p className="text-xs text-text-pale">Proposed</p>
              </div>
              <div className="bg-app-hover rounded-lg py-2">
                <p className="text-lg font-bold text-emerald-600">{executed}</p>
                <p className="text-xs text-text-pale">Executed</p>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
