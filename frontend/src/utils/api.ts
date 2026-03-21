const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export async function fetchState() {
  const r = await fetch(`${API}/api/state`)
  return r.json()
}

export async function triggerTick() {
  const r = await fetch(`${API}/api/tick`, { method: 'POST' })
  return r.json()
}

export function createEventSource(onEvent: (e: any) => void) {
  const es = new EventSource(`${API}/api/events`)
  es.onmessage = (e: MessageEvent) => {
    try { onEvent(JSON.parse(e.data)) } catch {}
  }
  return es
}
