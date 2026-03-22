import { useSymbio } from '../context/SymbioContext'

export function DIDPanel() {
  const { state } = useSymbio()
  const dids = (state as any)?.dids ?? []

  if (!dids.length) return null

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-white">Agent DIDs</h2>
        <span className="text-xs text-slate-500">W3C did:key</span>
      </div>
      <div className="divide-y divide-slate-700">
        {dids.map((d: any) => (
          <div key={d.agentName} className="px-4 py-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">{d.agentName}</span>
              {d.latestCredential && (
                <span className="text-xs text-violet-400">🪪 VC issued</span>
              )}
            </div>
            <div className="text-xs font-mono text-slate-400 truncate">{d.did}</div>
            {d.latestCredential && (
              <div className="text-xs text-slate-500">
                Repay rate: <span className="text-emerald-400">
                  {d.latestCredential.credentialSubject.creditHistory.repaymentRate}
                </span>
                {' · '}
                {d.latestCredential.credentialSubject.creditHistory.totalLoans} loans
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
