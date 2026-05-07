import { motion } from 'framer-motion'
import { Activity, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react'

const SEVERITY_STYLES = {
  NORMAL:   { card: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200', bar: 'bg-emerald-500', icon: ShieldCheck },
  MILD:     { card: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200', bar: 'bg-sky-500', icon: Activity },
  MODERATE: { card: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200', bar: 'bg-amber-500', icon: AlertTriangle },
  SEVERE:   { card: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200', bar: 'bg-red-500', icon: AlertTriangle },
}

function formatFeature(name) {
  return name
    .replace(/^delta_/, 'Δ ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export default function AnomalyGauge({ anomaly }) {
  if (!anomaly) return null

  const { score, is_anomalous, severity, top_features = [], calibrating, calibration_progress } = anomaly

  // ── Calibration view ─────────────────────────────────────────────────────────
  if (calibrating) {
    const pct = Math.round((calibration_progress ?? 0) * 100)
    return (
      <div className="card p-4 mb-5 border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-blue-500" />
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
            Building posture baseline...
          </h3>
          <span className="ml-auto text-xs font-mono text-blue-700 dark:text-blue-300 tabular-nums">
            {pct}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-blue-100 dark:bg-blue-900/50 overflow-hidden">
          <motion.div
            className="h-full bg-blue-500"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-2 opacity-80">
          Hold a typical working posture. Anomaly detection activates once the baseline finishes.
        </p>
      </div>
    )
  }

  // ── Live scoring view ────────────────────────────────────────────────────────
  const style = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.NORMAL
  const Icon = style.icon

  // Map score to a 0–100 gauge fill. score_samples is typically in [-0.6, 0.2];
  // clamp into a visual band where higher fill = more normal.
  const fillPct = Math.round(Math.min(Math.max((score + 0.6) / 0.8, 0), 1) * 100)

  return (
    <div className={`card p-4 mb-5 border ${style.card}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={14} />
          <h3 className="text-sm font-semibold">Postural Anomaly</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide font-bold opacity-80">
            {severity}
          </span>
          <span className="text-xs font-mono tabular-nums opacity-70">
            {score.toFixed(3)}
          </span>
        </div>
      </div>

      <div className="h-2 rounded-full bg-white/60 dark:bg-black/20 overflow-hidden mb-3">
        <motion.div
          className={`h-full ${style.bar}`}
          initial={false}
          animate={{ width: `${fillPct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {is_anomalous && top_features.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70 mb-1.5">
            Top contributors
          </div>
          <div className="flex flex-wrap gap-1.5">
            {top_features.map(f => (
              <span
                key={f}
                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/70 dark:bg-black/30 border border-current/20"
              >
                {formatFeature(f)}
              </span>
            ))}
          </div>
        </div>
      )}

      {!is_anomalous && (
        <p className="text-[11px] opacity-75">
          Posture pattern matches your baseline.
        </p>
      )}
    </div>
  )
}
