import { motion } from 'framer-motion'

const TECH = [
  { name: 'Tether WDK',         desc: 'Self-custodial HD wallets for every agent via @tetherto/wdk-wallet-evm. Each agent derives its own EVM address from a unique BIP-39 seed — no shared keys, no custody.',  icon: '🔑' },
  { name: 'Swarm Governance',   desc: 'Agents propose capital allocations, vote with reputation-weighted consensus (51% quorum), and execute autonomously. No human controller after initial setup.',              icon: '🗳️' },
  { name: 'OrionVault Contract', desc: 'Solidity smart contract (Foundry + OpenZeppelin) handles on-chain treasury, agent registration, proposal lifecycle, and reputation slashing/rewarding.',                  icon: '📜' },
  { name: 'Autonomous Loops',   desc: 'Each agent runs an independent reasoning cycle: observe market signals → generate strategy → propose → vote. Architecture is LLM-ready (swap heuristics for GPT-4).',    icon: '🤖' },
  { name: 'Real-time Dashboard','desc': 'React + SSE stream gives a live view of swarm state, treasury, proposals, votes, and executed allocations as they happen.',                                              icon: '📊' },
  { name: 'Economic Model',     desc: 'Agents earn reputation for successful proposals (+100 rep) and lose it for bad ones (-200 rep). Low-reputation agents lose voting weight — natural selection for quality.', icon: '📈' },
]

export function About() {
  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-serif font-bold text-5xl text-text-main mb-4">
          About <span className="italic text-accent-indigo">Orion Vault</span>
        </h1>
        <p className="text-lg text-text-dim leading-relaxed">
          Orion Vault is a decentralized swarm of AI agents, each holding its own self-custodial WDK wallet,
          that collectively govern a shared treasury. Agents propose, vote on, and execute capital allocation
          strategies autonomously — no central controller, no human approval required after setup.
        </p>
        <p className="text-lg text-text-dim leading-relaxed mt-4">
          This is not a chatbot with a wallet. This is <strong>agentic finance infrastructure</strong> —
          autonomous systems that execute tasks, manage capital, and settle value onchain under clearly
          defined economic constraints.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h2 className="font-serif font-bold text-3xl text-text-main mb-6">How It Works</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {TECH.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              className="glass rounded-2xl p-6 border border-app-border"
            >
              <div className="text-3xl mb-3">{t.icon}</div>
              <h3 className="font-bold text-lg text-text-main mb-2">{t.name}</h3>
              <p className="text-sm text-text-dim leading-relaxed">{t.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h2 className="font-serif font-bold text-3xl text-text-main mb-4">Track Alignment</h2>
        <div className="glass rounded-2xl p-6 border border-app-border space-y-3">
          {[
            ['WDK Integration',    'Every agent wallet is created with @tetherto/wdk + @tetherto/wdk-wallet-evm. HD derivation, self-custodial, multi-chain ready.'],
            ['Agent Autonomy',     'Agents run independent reasoning loops — propose, vote, execute — without any human trigger after launch.'],
            ['Economic Soundness', 'Reputation staking, slashing, and rewards create real incentives. Treasury allocations are bounded and quorum-gated.'],
            ['Real-world Viability','The OrionVault contract is deployable to any EVM chain. The agent engine is production-ready with a REST + SSE API.'],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <span className="text-emerald-500 font-bold shrink-0">✓</span>
              <div>
                <span className="font-semibold text-text-main">{k}: </span>
                <span className="text-text-dim text-sm">{v}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <h2 className="font-serif font-bold text-3xl text-text-main mb-4">Tech Stack</h2>
        <div className="flex flex-wrap gap-2">
          {['Tether WDK', '@tetherto/wdk-wallet-evm', 'Solidity', 'Foundry', 'OpenZeppelin', 'React', 'Vite', 'Tailwind CSS', 'Framer Motion', 'Express', 'SSE', 'Node.js ESM'].map(t => (
            <span key={t} className="px-3 py-1.5 bg-app-hover border border-app-border rounded-lg text-sm font-medium text-text-dim">
              {t}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
