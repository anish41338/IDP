import { TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react'
import { METRIC_META } from '../../lib/norms'

// Keys to display in the table (ordered)
const TABLE_KEYS = [
  'symmetry_score',
  'posture_angle_deg',
  'shoulder_width_cm',
  'height_cm',
  'arm_length_left_cm',
  'arm_length_right_cm',
  'torso_length_cm',
  'inseam_estimate_cm',
]

function StatusBadge({ status }) {
  if (status === 'normal') return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
      <CheckCircle2 size={10} /> Normal
    </span>
  )
  if (status === 'above') return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-200 dark:border-amber-800">
      <ArrowUp size={10} /> Above
    </span>
  )
  if (status === 'below') return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800">
      <ArrowDown size={10} /> Below
    </span>
  )
  return <span className="text-xs text-slate-400">—</span>
}

function DeltaCell({ delta }) {
  if (!delta) return <span className="text-xs text-slate-400">—</span>
  const { diff, pct } = delta
  const improved = (diff > 0) // for most metrics, higher is better
  // Special case: for posture_angle_deg, smaller abs value is better
  const sign = diff > 0 ? '+' : ''
  const isZero = diff === 0

  if (isZero) return (
    <span className="flex items-center gap-1 text-xs text-slate-400">
      <Minus size={11} /> No change
    </span>
  )

  return (
    <span className={`flex items-center gap-1 text-xs font-semibold tabular-nums ${
      diff > 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-slate-500 dark:text-slate-400'
    }`}>
      {diff > 0
        ? <TrendingUp size={12} />
        : <TrendingDown size={12} />
      }
      {sign}{diff} ({sign}{pct}%)
    </span>
  )
}

export default function NormComparisonTable({ measurements, norms, deltas }) {
  if (!measurements) return null

  const hasNorms = Object.keys(norms || {}).length > 0
  const hasDeltas = Object.keys(deltas || {}).length > 0

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Measurement
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Value
            </th>
            {hasNorms && (
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Normal Range
              </th>
            )}
            {hasNorms && (
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Status
              </th>
            )}
            {hasDeltas && (
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                vs Previous
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
          {TABLE_KEYS.map(key => {
            const val = measurements[key]
            if (val == null) return null
            const meta = METRIC_META[key] || { label: key, unit: '' }
            const norm = norms?.[key]
            const delta = deltas?.[key]

            return (
              <tr
                key={key}
                className={`transition-colors ${
                  norm?.status === 'above' || norm?.status === 'below'
                    ? 'bg-amber-50/40 dark:bg-amber-950/10'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/20'
                }`}
              >
                {/* Label */}
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-700 dark:text-slate-200">{meta.label}</div>
                  {meta.note && (
                    <div className="text-[10px] text-slate-400 mt-0.5">{meta.note}</div>
                  )}
                </td>

                {/* Value */}
                <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-800 dark:text-slate-100">
                  {val}{meta.unit}
                </td>

                {/* Normal range */}
                {hasNorms && (
                  <td className="px-4 py-3 text-center text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {norm ? `${norm.range[0]}–${norm.range[1]}${meta.unit}` : '—'}
                  </td>
                )}

                {/* Status */}
                {hasNorms && (
                  <td className="px-4 py-3 text-center">
                    {norm ? <StatusBadge status={norm.status} /> : <span className="text-xs text-slate-400">—</span>}
                  </td>
                )}

                {/* Delta */}
                {hasDeltas && (
                  <td className="px-4 py-3 text-right">
                    <DeltaCell delta={delta} />
                  </td>
                )}
              </tr>
            )
          }).filter(Boolean)}
        </tbody>
      </table>

      {/* Legend */}
      {hasNorms && (
        <div className="flex items-center gap-4 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Legend:</span>
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={9} /> Within normal range
          </span>
          <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
            <ArrowUp size={9} /> Above normal range
          </span>
          <span className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400">
            <ArrowDown size={9} /> Below normal range
          </span>
          {hasDeltas && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400 ml-2">
              <TrendingUp size={9} /> Change vs previous session
            </span>
          )}
        </div>
      )}
    </div>
  )
}
