import { SymbioProvider } from './context/SymbioContext'
import { Dashboard } from './components/Dashboard'
import { AgentPanel } from './components/AgentPanel'
import { LoanFeed } from './components/LoanFeed'
import { CreditPanel } from './components/CreditPanel'
import { EventLog } from './components/EventLog'
import { DIDPanel } from './components/DIDPanel'

export default function App() {
  return (
    <SymbioProvider>
      <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6 space-y-6">
        <Dashboard />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <LoanFeed />
            <EventLog />
          </div>
          <div className="space-y-6">
            <AgentPanel />
            <CreditPanel />
            <DIDPanel />
          </div>
        </div>
      </div>
    </SymbioProvider>
  )
}
