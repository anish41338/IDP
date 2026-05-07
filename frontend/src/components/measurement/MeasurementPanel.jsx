import { motion } from 'framer-motion'

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}
const item = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.18 } },
}

// Keys to skip from the flat measurement grid (rendered separately)
const SKIP_KEYS = new Set([
  'joint_angles', 'reba', 'rula', 'temporal', 'anomaly',
  'left_shoulder_height_cm', 'right_shoulder_height_cm',
])

function cardStyle(key, value) {
  if (value == null) return 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700 text-slate-400'
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
  if (value == null) return '—'
  if (key.endsWith('_cm')) return `${value} cm`
  if (key.endsWith('_deg')) return `${value}°`
  if (key === 'symmetry_score') return `${value}%`
  if (key.startsWith('lsi_')) return `${value}%`
  if (key === 'depth_confidence') return `${(value * 100).toFixed(0)}%`
  if (['ape_index', 'cormic_index', 'shoulder_hip_ratio'].includes(key)) return value.toFixed(3)
  return String(value)
}

// ─── REBA risk badge ──────────────────────────────────────────────────────────

const REBA_COLORS = {
  negligible: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  low:        'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  medium:     'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  high:       'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  very_high:  'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
}

function RebaRulaBadges({ reba, rula }) {
  if (!reba && !rula) return null

  const rebaColor = REBA_COLORS[reba?.risk_level] ?? REBA_COLORS.negligible
  const rulaLevel = rula?.action_level ?? 1
  const rulaColor = rulaLevel <= 1
    ? REBA_COLORS.negligible
    : rulaLevel === 2
    ? REBA_COLORS.medium
    : rulaLevel === 3
    ? REBA_COLORS.high
    : REBA_COLORS.very_high

  return (
    <div className="mb-3 grid grid-cols-2 gap-2">
      {reba && (
        <div className={`p-3 rounded-lg border ${rebaColor}`}>
          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70 mb-1">REBA Score</div>
          <div className="flex items-end gap-1.5">
            <span className="text-2xl font-bold tabular-nums">{reba.final_score}</span>
            <span className="text-xs font-semibold mb-0.5 capitalize">{reba.risk_level?.replace('_', ' ')}</span>
          </div>
          <div className="text-[10px] opacity-60 mt-0.5">
            Table A: {reba.score_a} · Table B: {reba.score_b}
          </div>
        </div>
      )}
      {rula && (
        <div className={`p-3 rounded-lg border ${rulaColor}`}>
          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70 mb-1">RULA Score</div>
          <div className="flex items-end gap-1.5">
            <span className="text-2xl font-bold tabular-nums">{rula.grand_score}</span>
            <span className="text-xs font-semibold mb-0.5">Level {rula.action_level}</span>
          </div>
          <div className="text-[10px] opacity-60 mt-0.5 leading-tight">{rula.action_description?.split(' — ')[0]}</div>
        </div>
      )}
    </div>
  )
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

  const { reba, rula, ...rest } = measurements
  const flatMeasurements = Object.fromEntries(
    Object.entries(rest).filter(([k]) => !SKIP_KEYS.has(k))
  )

  return (
    <div className="space-y-3">
      {/* REBA / RULA badges */}
      <RebaRulaBadges reba={reba} rula={rula} />

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
        {Object.entries(flatMeasurements).filter(([, v]) => v != null).map(([key, value]) => (
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
