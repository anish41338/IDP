export default function SymmetryGauge({ score }) {
  if (score == null) return null

  const clamped = Math.max(0, Math.min(100, score))
  const isExcellent = clamped >= 95
  const isGood = clamped >= 85

  const color = isExcellent ? '#10b981' : isGood ? '#f59e0b' : '#ef4444'
  const bgColor = isExcellent ? '#d1fae5' : isGood ? '#fef3c7' : '#fee2e2'
  const label = isExcellent ? 'Excellent' : isGood ? 'Good' : 'Needs Attention'
  const description = isExcellent
    ? 'Bilateral symmetry within optimal range'
    : isGood
    ? 'Mild asymmetry — continued monitoring advised'
    : 'Significant asymmetry — clinical review recommended'

  // SVG arc (semicircle gauge)
  const R = 68
  const cx = 90
  const cy = 90
  const toRad = deg => (deg * Math.PI) / 180
  const startDeg = 180
  const endDeg = 180 + (clamped / 100) * 180
  const x1 = cx + R * Math.cos(toRad(startDeg))
  const y1 = cy + R * Math.sin(toRad(startDeg))
  const x2 = cx + R * Math.cos(toRad(endDeg))
  const y2 = cy + R * Math.sin(toRad(endDeg))
  const largeArc = endDeg - startDeg > 180 ? 1 : 0

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="180" height="105" viewBox="0 0 180 105">
        {/* Background track */}
        <path
          d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="14"
          strokeLinecap="round"
          className="dark:[stroke:#334155]"
        />
        {/* Colored fill */}
        <path
          d={`M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Score label */}
        <text
          x={cx} y={cy - 10}
          textAnchor="middle"
          fontSize="26"
          fontWeight="700"
          fill={color}
        >
          {clamped.toFixed(0)}%
        </text>
        <text
          x={cx} y={cy + 10}
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill={color}
          fillOpacity="0.8"
        >
          {label}
        </text>
      </svg>

      <div className="text-center max-w-xs">
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>

      {/* Threshold guide */}
      <div className="flex items-center gap-4 text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> ≥95% Excellent</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> ≥85% Good</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> &lt;85% Review</span>
      </div>
    </div>
  )
}
