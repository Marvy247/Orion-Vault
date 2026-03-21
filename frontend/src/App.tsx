import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Analytics } from '@vercel/analytics/react'
import { Toaster } from 'react-hot-toast'
import { SwarmProvider } from './context/SwarmContext'
import { Landing } from './components/Landing'
import { Dashboard } from './components/Dashboard'
import { About } from './components/About'

const NAV = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/about',     label: 'About' },
]

function Nav() {
  const loc = useLocation()
  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl">
      <div className="glass rounded-2xl px-6 py-4 border border-app-border shadow-floating flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="w-8 h-8 rounded-lg bg-accent-indigo flex items-center justify-center text-white text-sm font-bold">O</span>
          <span className="font-serif font-bold text-xl tracking-tight text-text-main group-hover:text-accent-indigo transition-colors">
            Orion<span className="italic">Vault</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {NAV.map(n => (
            <Link
              key={n.path}
              to={n.path}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                loc.pathname === n.path
                  ? 'bg-accent-indigo text-white shadow-premium'
                  : 'text-text-dim hover:text-accent-indigo hover:bg-app-hover'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}

function AnimatedRoutes() {
  const loc = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={loc} key={loc.pathname}>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="pt-36 pb-24 px-6 min-h-screen"
          >
            <div className="max-w-7xl mx-auto"><Dashboard /></div>
          </motion.div>
        } />
        <Route path="/about" element={
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="pt-36 pb-24 px-6 min-h-screen"
          >
            <div className="max-w-7xl mx-auto"><About /></div>
          </motion.div>
        } />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <SwarmProvider>
        <Analytics />
        <Toaster position="top-right" />
        <div className="min-h-screen bg-app-bg grid-subtle selection:bg-accent-indigo/10 selection:text-accent-indigo">
          <Nav />
          <main className="relative"><AnimatedRoutes /></main>
          <footer className="border-t border-app-border py-12 px-6">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-accent-indigo flex items-center justify-center text-white text-xs font-bold">O</span>
                <span className="font-serif font-bold text-lg text-text-main">Orion<span className="italic">Vault</span></span>
              </div>
              <p className="text-sm text-text-pale">
                Built for Hackathon Galáctica · WDK Edition 1 · Agent Wallets Track
              </p>
              <p className="text-xs text-text-pale uppercase tracking-widest">© 2026 Orion Vault</p>
            </div>
          </footer>
        </div>
      </SwarmProvider>
    </BrowserRouter>
  )
}
