import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']

const METRIC_LABELS = {
  symmetry_score: 'Symmetry %',
  shoulder_width_cm: 'Shoulder Width',
  torso_length_cm: 'Torso Length',
  posture_angle_deg: 'Posture Angle',
  arm_length_left_cm: 'Left Arm',
  arm_length_right_cm: 'Right Arm',
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-slate-500 dark:text-slate-400">{METRIC_LABELS[p.dataKey] || p.dataKey}:</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function TrendChart({ sessions, metrics }) {
  const sorted = [...sessions].sort((a, b) => new Date(a.session_date) - new Date(b.session_date))

  const data = sorted.map((s, i) => {
    const point = {
      name: `S${i + 1}`,
      date: new Date(s.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }
    for (const m of metrics) {
      point[m] = s.measurements?.[m] ?? null
    }
    return point
  })

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        At least 2 sessions needed for trend analysis
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:[stroke:#334155]" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
          formatter={v => METRIC_LABELS[v] || v}
        />
        {metrics.map((m, i) => (
          <Line
            key={m}
            type="monotone"
            dataKey={m}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 4, fill: COLORS[i % COLORS.length] }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
