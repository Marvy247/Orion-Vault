import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createEventSource, fetchState, triggerTick } from '../utils/api'

interface Agent {
  name: string
  address: string
  reputation: number
  joinedAt: number
}

interface Proposal {
  id: number
  proposer: string
  type: string
  description: string
  amount: number
  riskScore: string
  rationale: string
  votesFor: number
  votesAgainst: number
  status: 'pending' | 'approved' | 'rejected' | 'executed'
  createdAt: number
  expiresAt: number
}

interface Treasury {
  totalUSDT: number
  totalXAUT: number
  allocations: any[]
}

interface Market {
  ETH: number
  BTC: number
  USDT: number
  XAUT: number
  volatility: number
}

interface SwarmState {
  cycle: number
  agents: Agent[]
  proposals: Proposal[]
  treasury: Treasury
  market: Market
  history: any[]
  eventLog: any[]
}

interface SwarmCtx {
  state: SwarmState | null
  connected: boolean
  tick: () => Promise<void>
}

const Ctx = createContext<SwarmCtx>({ state: null, connected: false, tick: async () => {} })

export function SwarmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SwarmState | null>(null)
  const [connected, setConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Initial load
    fetchState().then(setState).catch(() => {})

    // SSE stream
    const es = createEventSource((event: any) => {
      if (event.type === 'init') {
        setState(event.data)
        setConnected(true)
      } else {
        // Refresh state on any swarm event
        fetchState().then(setState).catch(() => {})
      }
    })

    es.onerror = () => setConnected(false)
    es.onopen  = () => setConnected(true)
    esRef.current = es

    return () => es.close()
  }, [])

  const tick = async () => {
    await triggerTick()
    const s = await fetchState()
    setState(s)
  }

  return <Ctx.Provider value={{ state, connected, tick }}>{children}</Ctx.Provider>
}

export const useSwarm = () => useContext(Ctx)
