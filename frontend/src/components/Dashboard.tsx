import { motion } from 'framer-motion'
import { useSwarm } from '../context/SwarmContext'
import { AgentGrid } from '../components/AgentGrid'
import { ProposalFeed } from '../components/ProposalFeed'
import { TreasuryPanel } from '../components/TreasuryPanel'
import { EventLog } from '../components/EventLog'
import { AllocationHistory } from '../components/AllocationHistory'

const SEPOLIA = 'https://sepolia.etherscan.io'

export function Dashboard() {
  const { state, connected, tick } = useSwarm()

  const pending  = state?.proposals.filter(p => p.status === 'pending').length  ?? 0
  const executed = state?.proposals.filter(p => p.status === 'executed').length ?? 0
  const onChain  = state?.proposals.filter((p: any) => p.txHash).length ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-4xl text-text-main">
            Swarm <span className="italic text-accent-indigo">Dashboard</span>
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className={`flex items-center gap-1.5 text-sm font-medium ${connected ? 'text-emerald-600' : 'text-red-400'}`}>
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              {connected ? 'Live' : 'Connecting…'}
            </span>
            <span className="text-text-pale text-sm">Cycle #{state?.cycle ?? 0}</span>
            {state?.contractAddress && state.contractAddress !== '0x0000000000000000000000000000000000000000' && (
              <a
                href={`${SEPOLIA}/address/${state.contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-accent-indigo hover:underline bg-accent-indigo/5 px-2 py-1 rounded-lg"
              >
                ⛓ OrionVault on Sepolia ↗
              </a>
            )}
          </div>
        </div>
        <button
          onClick={tick}
          className="shrink-0 px-5 py-2.5 bg-accent-indigo text-white rounded-xl font-medium hover:bg-accent-indigo-hover transition-colors text-sm"
        >
          ⚡ Force Cycle
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Agents',     value: state?.agents.length ?? 0,  icon: '🤖', color: '' },
          { label: 'Pending Proposals', value: pending,                     icon: '📋', color: '' },
          { label: 'Executed',          value: executed,                    icon: '⚡', color: 'text-emerald-600' },
          { label: 'On-chain Txs',      value: onChain,                     icon: '⛓',  color: 'text-accent-indigo' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass rounded-2xl p-5 border border-app-border"
          >
            <div className="text-2xl mb-2">{s.icon}</div>
            <p className={`text-2xl font-bold ${s.color || 'text-text-main'}`}>{s.value}</p>
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif font-bold text-2xl text-text-main">Agent Swarm</h2>
          <span className="text-sm text-text-pale">Sorted by reputation</span>
        </div>
        <AgentGrid />
      </section>

      {/* Proposals + Events */}
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
