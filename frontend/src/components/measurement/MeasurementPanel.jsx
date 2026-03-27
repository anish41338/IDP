import { motion } from 'framer-motion'

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}
const item = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.18 } },
}

function cardStyle(key, value) {
  if (key === 'symmetry_score') {
    if (value >= 95) return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
    if (value >= 85) return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
    return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
  }
  if (key === 'posture_angle_deg') {
    const abs = Math.abs(value)
    if (abs <= 2) return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
    if (abs <= 5) return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
    return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
  }
  return 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
}

function formatLabel(key) {
  return key
    .replace(/_cm$/, '')
    .replace(/_deg$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function formatValue(key, value) {
  if (key.endsWith('_cm')) return `${value} cm`
  if (key.endsWith('_deg')) return `${value}°`
  if (key === 'symmetry_score') return `${value}%`
  return String(value)
}

export default function MeasurementPanel({ measurements, alerts }) {
  if (!measurements) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400">
        <div className="w-6 h-6 border-2 border-slate-300 dark:border-slate-600 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-xs">Waiting for pose detection...</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Alerts */}
      {alerts?.length > 0 && (
        <div className="space-y-1.5">
          {alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <span className="text-amber-500 text-xs mt-0.5">⚠</span>
              <span className="text-xs text-amber-800 dark:text-amber-300">{alert}</span>
            </div>
          ))}
        </div>
      )}

      {/* Measurement grid */}
      <motion.div
        className="grid grid-cols-2 gap-2"
        variants={list}
        initial="hidden"
        animate="show"
      >
        {Object.entries(measurements).map(([key, value]) => (
          <motion.div
            key={key}
            variants={item}
            className={`p-3 rounded-lg border text-center ${cardStyle(key, value)}`}
          >
            <div className="text-[10px] font-medium opacity-70 mb-1 uppercase tracking-wide">
              {formatLabel(key)}
            </div>
            <div className="text-base font-bold tabular-nums">
              {formatValue(key, value)}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
