import { motion } from 'framer-motion'
import { useSwarm } from '../context/SwarmContext'
import { AgentGrid } from '../components/AgentGrid'
import { ProposalFeed } from '../components/ProposalFeed'
import { TreasuryPanel } from '../components/TreasuryPanel'
import { EventLog } from '../components/EventLog'
import { AllocationHistory } from '../components/AllocationHistory'

export function Dashboard() {
  const { state, connected, tick } = useSwarm()

  const pending  = state?.proposals.filter(p => p.status === 'pending').length  ?? 0
  const executed = state?.proposals.filter(p => p.status === 'executed').length ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-bold text-4xl text-text-main">
            Swarm <span className="italic text-accent-indigo">Dashboard</span>
          </h1>
          <p className="text-text-dim mt-1">
            {state?.agents.length ?? 0} agents · Cycle #{state?.cycle ?? 0} ·{' '}
            <span className={connected ? 'text-emerald-500' : 'text-red-400'}>
              {connected ? '● Live' : '○ Connecting…'}
            </span>
            {state?.contractAddress && state.contractAddress !== '0x0000000000000000000000000000000000000000' && (
              <> ·{' '}
                <a
                  href={`https://sepolia.etherscan.io/address/${state.contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-indigo hover:underline font-mono text-xs"
                >
                  {state.contractAddress.slice(0, 8)}…{state.contractAddress.slice(-6)} ↗
                </a>
              </>
            )}
          </p>
        </div>
        <button
          onClick={tick}
          className="px-5 py-2.5 bg-accent-indigo text-white rounded-xl font-medium hover:bg-accent-indigo-hover transition-colors text-sm"
        >
          ⚡ Force Tick
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Agents',      value: state?.agents.length ?? 0,  icon: '🤖' },
          { label: 'Pending Proposals',  value: pending,                     icon: '📋' },
          { label: 'Executed',           value: executed,                    icon: '⚡' },
          { label: 'Treasury USDT',      value: `$${(state?.treasury.totalUSDT ?? 0).toLocaleString()}`, icon: '💰' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass rounded-2xl p-5 border border-app-border"
          >
            <div className="text-2xl mb-2">{s.icon}</div>
            <p className="text-2xl font-bold text-text-main">{s.value}</p>
            <p className="text-xs text-text-pale mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Treasury & Market */}
      <section>
        <h2 className="font-serif font-bold text-2xl text-text-main mb-4">Treasury & Market</h2>
        <TreasuryPanel />
      </section>

      {/* Agents */}
      <section>
        <h2 className="font-serif font-bold text-2xl text-text-main mb-4">Agent Swarm</h2>
        <AgentGrid />
      </section>

      {/* Proposals + Event log side by side */}
      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <h2 className="font-serif font-bold text-2xl text-text-main mb-4">Active Proposals</h2>
          <div className="glass rounded-2xl p-5 border border-app-border">
            <ProposalFeed />
          </div>
        </section>

        <section>
          <h2 className="font-serif font-bold text-2xl text-text-main mb-4">Live Event Feed</h2>
          <div className="glass rounded-2xl p-5 border border-app-border">
            <EventLog />
          </div>
        </section>
      </div>

      {/* Allocation history */}
      <section>
        <h2 className="font-serif font-bold text-2xl text-text-main mb-4">Executed Allocations</h2>
        <div className="glass rounded-2xl p-5 border border-app-border">
          <AllocationHistory />
        </div>
      </section>
    </div>
  )
}
