import { motion } from 'framer-motion'
import { useSwarm } from '../context/SwarmContext'

const REP_COLOR = (rep: number) => {
  if (rep >= 1500) return 'text-emerald-600'
  if (rep >= 1000) return 'text-blue-600'
  return 'text-amber-600'
}

const SEPOLIA = 'https://sepolia.etherscan.io'

export function AgentGrid() {
  const { state } = useSwarm()
  if (!state) return null

  const sorted = [...state.agents].sort((a, b) => b.reputation - a.reputation)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sorted.map((agent: any, i) => {
        const repPct     = Math.min(100, (agent.reputation / 2000) * 100)
        const proposals  = state.proposals.filter(p => p.proposer === agent.name)
        const executed   = proposals.filter(p => p.status === 'executed').length
        const isLeader   = i === 0

        return (
          <motion.div
            key={agent.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`glass rounded-2xl p-5 border transition-colors ${
              isLeader ? 'border-accent-gold/40 bg-amber-50/30' : 'border-app-border hover:border-accent-indigo/30'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-indigo to-purple-500 flex items-center justify-center text-lg">
                  {agent.emoji || '🤖'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-text-main">Agent {agent.name}</p>
                    {isLeader && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">👑 #1</span>}
                  </div>
                  <p className="text-xs text-text-pale">{agent.label || 'Agent'}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <a
                  href={`${SEPOLIA}/address/${agent.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-accent-indigo hover:underline"
                >
                  {agent.address.slice(0, 6)}…{agent.address.slice(-4)} ↗
                </a>
              </div>
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
