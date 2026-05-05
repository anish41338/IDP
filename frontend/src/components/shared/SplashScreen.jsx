import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity } from 'lucide-react'

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('logo') // logo → tagline → exit

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('tagline'), 700)
    const t2 = setTimeout(() => setPhase('exit'), 1900)
    const t3 = setTimeout(() => onDone(), 2350)
    return () => [t1, t2, t3].forEach(clearTimeout)
  }, [onDone])

  return (
    <AnimatePresence>
      {phase !== 'exit' ? (
        <motion.div
          key="splash"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d1117]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45, ease: 'easeInOut' } }}
        >
          {/* Ambient glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
            <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-violet-600/8 rounded-full blur-3xl" />
          </div>

          {/* Logo mark */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative mb-5"
          >
            <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-600/40">
              <Activity size={36} className="text-white" strokeWidth={2} />
            </div>
            {/* Ring pulse */}
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-blue-400/40"
              animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
            />
          </motion.div>

          {/* Wordmark */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-center"
          >
            <h1 className="text-3xl font-bold text-white tracking-tight">ClinAssess</h1>

            {/* Tagline fades in separately */}
            <AnimatePresence>
              {phase === 'tagline' && (
                <motion.p
                  key="tagline"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="mt-1.5 text-sm text-slate-400 font-medium"
                >
                  Clinical Body Assessment · AI-Powered Analysis
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Loading dots */}
          <motion.div
            className="flex gap-1.5 mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-blue-500"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
              />
            ))}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
