import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from 'react-hot-toast';

const navLinks = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/about', label: 'About', icon: '📖' },
];

function Navigation() {
  const location = useLocation();

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl">
      <div className="glass rounded-2xl px-6 py-4 border border-app-border shadow-floating flex items-center justify-between">
        <Link to="/" className="flex items-center group">
          <span className="font-serif font-bold text-2xl tracking-tighter text-text-main group-hover:text-accent-indigo transition-colors duration-300">
            Your<span className="italic">Brand</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-accent-indigo text-white shadow-premium'
                    : 'text-text-dim hover:text-accent-indigo hover:bg-app-hover'
                }`}
              >
                {link.icon} {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<PageWrapper><Dashboard /></PageWrapper>} />
        <Route path="/about" element={<PageWrapper><About /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="pt-44 pb-24 px-6 min-h-screen"
    >
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </motion.div>
  );
}

function LandingPage() {
  return (
    <div className="pt-32 pb-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <h1 className="font-serif font-bold text-6xl md:text-7xl tracking-tighter text-text-main mb-6">
            Welcome to Your
            <br />
            <span className="italic text-accent-indigo">New Project</span>
          </h1>
          <p className="text-xl text-text-dim max-w-2xl mx-auto mb-10">
            A modern React template with Tailwind CSS, Framer Motion, and React Router.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent-indigo text-white rounded-xl font-medium hover:shadow-premium transition-all"
          >
            Get Started →
          </Link>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: '⚡', title: 'Fast', desc: 'Built with Vite for lightning-fast development' },
            { icon: '🎨', title: 'Beautiful', desc: 'Tailwind CSS with custom design system' },
            { icon: '✨', title: 'Animated', desc: 'Smooth animations with Framer Motion' }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-8 border border-app-border"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="font-bold text-xl mb-2">{feature.title}</h3>
              <p className="text-text-dim">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="glass rounded-2xl p-8 border border-app-border">
      <h2 className="font-serif font-bold text-3xl mb-4">Dashboard</h2>
      <p className="text-text-dim">Build your dashboard here.</p>
    </div>
  );
}

function About() {
  return (
    <div className="glass rounded-2xl p-8 border border-app-border">
      <h2 className="font-serif font-bold text-3xl mb-4">About</h2>
      <p className="text-text-dim">Add your about content here.</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Analytics />
      <Toaster position="top-right" />
      <div className="min-h-screen bg-app-bg grid-subtle selection:bg-accent-indigo/10 selection:text-accent-indigo">
        <Navigation />
        <main className="relative">
          <AnimatedRoutes />
        </main>

        <footer className="border-t border-app-border py-16 px-6 bg-white">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex flex-col items-center md:items-start gap-5">
              <span className="font-serif font-bold text-2xl tracking-tighter text-text-main">
                Your<span className="italic">Brand</span>
              </span>
              <p className="text-sm text-text-pale max-w-xs text-center md:text-left leading-relaxed">
                Your tagline or description here
              </p>
            </div>

            <div className="flex flex-col items-center md:items-end gap-4">
              <p className="text-xs text-text-pale uppercase tracking-widest font-medium">
                © 2026 YOUR BRAND
              </p>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
