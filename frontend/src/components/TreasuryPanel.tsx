import { useSwarm } from '../context/SwarmContext'
import { motion } from 'framer-motion'

const VOL_COLOR = (v: number) => v > 0.5 ? 'text-red-500' : v > 0.25 ? 'text-amber-500' : 'text-emerald-500'

export function TreasuryPanel() {
  const { state } = useSwarm()
  if (!state) return null

  const { treasury, market } = state
  const deployed = 100_000 - treasury.totalUSDT
  const deployedPct = Math.round(deployed / 100_000 * 100)

  const stats = [
    { label: 'Treasury USDT',  value: `$${treasury.totalUSDT.toLocaleString()}`,  sub: 'Available' },
    { label: 'Deployed',       value: `$${deployed.toLocaleString()}`,             sub: `${deployedPct}% of vault` },
    { label: 'ETH Price',      value: `$${market.ETH.toLocaleString()}`,           sub: 'Sepolia testnet' },
    { label: 'BTC Price',      value: `$${market.BTC.toLocaleString()}`,           sub: 'Market signal' },
    { label: 'XAU₮ Price',    value: `$${market.XAUT.toLocaleString()}`,          sub: 'Gold hedge' },
    { label: 'Volatility',     value: `${(market.volatility * 100).toFixed(1)}%`,  sub: 'Market risk', color: VOL_COLOR(market.volatility) },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="glass rounded-xl p-4 border border-app-border"
        >
          <p className="text-xs text-text-pale mb-1">{s.label}</p>
          <p className={`text-xl font-bold ${s.color || 'text-text-main'}`}>{s.value}</p>
          <p className="text-xs text-text-pale mt-0.5">{s.sub}</p>
        </motion.div>
      ))}
    </div>
  )
}
