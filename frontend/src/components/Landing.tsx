import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const FEATURES = [
  { icon: '🔑', title: 'WDK Agent Wallets',     desc: 'Every agent holds its own self-custodial EVM wallet via Tether WDK — HD-derived, no shared keys.' },
  { icon: '🗳️', title: 'Swarm Governance',      desc: 'Agents propose, vote with reputation-weighted consensus, and execute capital allocations autonomously.' },
  { icon: '⚡', title: 'On-chain Settlement',   desc: 'Approved proposals execute directly on the OrionVault smart contract — transparent, immutable, trustless.' },
  { icon: '📈', title: 'Reputation Economy',    desc: 'Successful agents earn reputation (+voting weight). Poor performers get slashed. Natural selection for quality.' },
  { icon: '🌐', title: 'Multi-chain Ready',     desc: 'WDK supports EVM, Bitcoin, Solana, TON, TRON. Orion Vault can bridge and allocate across any chain.' },
  { icon: '🤖', title: 'LLM-Ready Architecture','desc': 'Swap the heuristic brain for GPT-4 / Claude with one function change. The swarm loop is model-agnostic.' },
]

export function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="pt-36 pb-24 px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-indigo/10 text-accent-indigo rounded-full text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-accent-indigo animate-pulse" />
            Hackathon Galáctica · WDK Edition 1 · Agent Wallets Track
          </div>

          <h1 className="font-serif font-bold text-6xl md:text-8xl tracking-tighter text-text-main mb-6 leading-none">
            Orion
            <br />
            <span className="italic text-accent-indigo">Vault</span>
          </h1>

          <p className="text-xl md:text-2xl text-text-dim max-w-3xl mx-auto mb-4 leading-relaxed">
            A decentralized swarm of AI agents, each with its own self-custodial WDK wallet,
            that collectively govern a shared treasury.
          </p>
          <p className="text-lg text-text-pale max-w-2xl mx-auto mb-12">
            Agents propose → Swarm votes → Value settles onchain. No human controller. No central custody.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="px-8 py-4 bg-accent-indigo text-white rounded-xl font-semibold hover:bg-accent-indigo-hover transition-all hover:shadow-floating text-lg"
            >
              View Live Swarm →
            </Link>
            <Link
              to="/about"
              className="px-8 py-4 border border-app-border text-text-dim rounded-xl font-semibold hover:bg-app-hover transition-all text-lg"
            >
              How It Works
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Architecture diagram */}
      <div className="px-6 pb-16 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-3xl p-8 border border-app-border text-center"
        >
          <p className="text-text-pale text-sm font-medium uppercase tracking-widest mb-6">Swarm Flow</p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-medium">
            {[
              { label: 'WDK Wallet', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
              { label: '→', color: 'text-text-pale' },
              { label: 'Agent Brain', color: 'bg-purple-50 text-purple-700 border-purple-200' },
              { label: '→', color: 'text-text-pale' },
              { label: 'Proposal', color: 'bg-blue-50 text-blue-700 border-blue-200' },
              { label: '→', color: 'text-text-pale' },
              { label: 'Swarm Vote', color: 'bg-amber-50 text-amber-700 border-amber-200' },
              { label: '→', color: 'text-text-pale' },
              { label: 'OrionVault', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              { label: '→', color: 'text-text-pale' },
              { label: 'Onchain Settlement', color: 'bg-rose-50 text-rose-700 border-rose-200' },
            ].map((item, i) =>
              item.label === '→'
                ? <span key={i} className={item.color}>{item.label}</span>
                : <span key={i} className={`px-3 py-1.5 rounded-lg border ${item.color}`}>{item.label}</span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Features */}
      <div className="px-6 pb-24 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              className="glass rounded-2xl p-6 border border-app-border hover:border-accent-indigo/30 transition-colors"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-lg text-text-main mb-2">{f.title}</h3>
              <p className="text-sm text-text-dim leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
