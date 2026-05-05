import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, FileDown, FileText, Activity } from 'lucide-react'
import { getSession } from '../api/sessions'
import { getPatient, getPatientSessions } from '../api/patients'
import { exportPdf, exportCsv } from '../api/export'
import { mockApi } from '../lib/mockData'
import { compareToNorms, computeDelta } from '../lib/norms'
import { useAppContext } from '../context/AppContext'
import MeasurementPanel from '../components/measurement/MeasurementPanel'
import NormComparisonTable from '../components/measurement/NormComparisonTable'
import ReportViewer from '../components/reports/ReportViewer'
import SymmetryGauge from '../components/analytics/SymmetryGauge'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const page = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  out: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

function StatCard({ label, value, sub, valueClass = '' }) {
  return (
    <div className="card p-4 text-center hover:-translate-y-0.5 transition-transform duration-200">
      <div className={`text-xl font-bold tabular-nums text-slate-800 dark:text-slate-100 ${valueClass}`}>
        {value}
      </div>
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5 capitalize">{sub}</div>}
    </div>
  )
}

export default function SessionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { demoMode } = useAppContext()

  const [session, setSession] = useState(null)
  const [patient, setPatient] = useState(null)
  const [allSessions, setAllSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchSession = demoMode ? mockApi.getSession(id) : getSession(id)
    fetchSession
      .then(async s => {
        setSession(s)
        const [p, sessions] = await Promise.all([
          demoMode ? mockApi.getPatient(s.patient_id) : getPatient(s.patient_id),
          demoMode ? mockApi.getPatientSessions(s.patient_id) : getPatientSessions(s.patient_id),
        ])
        setPatient(p)
        setAllSessions(sessions)
      })
      .catch(() => setError('Failed to load session'))
      .finally(() => setLoading(false))
  }, [id, demoMode])

  if (loading) return <LoadingSpinner size="lg" label="Loading session..." />
  if (error) return <div className="p-6 text-sm text-red-500">{error}</div>
  if (!session || !patient) return null

  // Find previous session for comparison
  const sorted = [...allSessions].sort((a, b) => new Date(a.session_date) - new Date(b.session_date))
  const idx = sorted.findIndex(s => s.id === Number(id))
  const previousSession = idx > 0 ? sorted[idx - 1] : null

  // Compute norms and deltas
  const norms = compareToNorms(session.measurements, patient.age, patient.gender)
  const deltas = computeDelta(session.measurements, previousSession?.measurements)

  const m = session.measurements || {}
  const sym = m.symmetry_score
  const angle = m.posture_angle_deg
  const reba = m.reba
  const rula = m.rula

  const symColor = sym >= 95
    ? 'text-emerald-600 dark:text-emerald-400'
    : sym >= 85
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400'

  const symLabel = sym >= 95 ? 'Excellent' : sym >= 85 ? 'Good' : 'Needs Attention'
  const angleLabel = angle == null ? '' : Math.abs(angle) <= 2 ? 'Neutral' : Math.abs(angle) <= 5 ? 'Mild tilt' : 'Significant tilt'

  const rebaScore = reba?.final_score
  const rebaRisk = reba?.risk_level
  const rebaColor = !rebaScore ? '' : rebaScore <= 3
    ? 'text-emerald-600 dark:text-emerald-400'
    : rebaScore <= 7
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400'

  const rulaAction = rula?.action_level
  const rulaColor = !rulaAction ? '' : rulaAction <= 1
    ? 'text-emerald-600 dark:text-emerald-400'
    : rulaAction <= 2
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400'

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={page}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Session #{session.id}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {patient.name} ·{' '}
            {new Date(session.session_date).toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/patients/${patient.id}`)} className="btn-ghost">
            <ArrowLeft size={14} /> Patient
          </button>
          {!demoMode ? (
            <>
              <button onClick={() => exportPdf(id)} className="btn-secondary">
                <FileDown size={14} /> PDF
              </button>
              <button onClick={() => exportCsv(patient.id)} className="btn-secondary">
                <FileText size={14} /> CSV
              </button>
            </>
          ) : (
            <>
              <button className="btn-secondary opacity-50 cursor-not-allowed" title="Export disabled in demo mode">
                <FileDown size={14} /> PDF
              </button>
              <button className="btn-secondary opacity-50 cursor-not-allowed" title="Export disabled in demo mode">
                <FileText size={14} /> CSV
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary stat bar */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <StatCard
          label="Symmetry Score"
          value={sym != null ? `${sym}%` : '—'}
          sub={symLabel}
          valueClass={symColor}
        />
        <StatCard
          label="Posture Angle"
          value={angle != null ? `${angle}°` : '—'}
          sub={angleLabel}
        />
        <StatCard
          label="Shoulder Width"
          value={m.shoulder_width_cm ? `${m.shoulder_width_cm} cm` : '—'}
        />
        <StatCard
          label="Posture Alerts"
          value={session.posture_alerts?.length ?? 0}
          sub={session.posture_alerts?.length > 0 ? 'Review recommended' : 'None detected'}
        />
      </div>

      {/* REBA / RULA stat bar */}
      {(reba || rula) && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          <StatCard
            label="REBA Score"
            value={rebaScore ?? '—'}
            sub={rebaRisk ? rebaRisk.replace('_', ' ') : undefined}
            valueClass={rebaColor}
          />
          <StatCard
            label="REBA Table A"
            value={reba?.score_a ?? '—'}
            sub="Trunk · Neck · Legs"
          />
          <StatCard
            label="REBA Table B"
            value={reba?.score_b ?? '—'}
            sub="Arms · Wrist"
          />
          <StatCard
            label="RULA Action Level"
            value={rulaAction ? `Level ${rulaAction}` : '—'}
            sub={rula?.action_description?.split(' — ')[0]}
            valueClass={rulaColor}
          />
        </div>
      )}

      {/* Temporal + LSI panel */}
      {(() => {
        const temporal = m.temporal
        const lsiKeys = ['lsi_arm', 'lsi_upper_arm', 'lsi_forearm', 'lsi_thigh', 'lsi_shank']
        const hasLsi = lsiKeys.some(k => m[k] != null)
        if (!temporal && !hasLsi) return null

        const fatigue = temporal?.fatigue_index
        const sway = temporal?.postural_sway_index
        const symTrend = temporal?.symmetry_trend
        const trendIcon = symTrend === 'improving' ? '↑' : symTrend === 'worsening' ? '↓' : '→'
        const trendColor = symTrend === 'improving' ? 'text-emerald-600 dark:text-emerald-400'
          : symTrend === 'worsening' ? 'text-red-600 dark:text-red-400'
          : 'text-slate-500'
        const fatigueColor = fatigue == null ? 'text-slate-400'
          : fatigue >= 0.6 ? 'text-red-600 dark:text-red-400'
          : fatigue >= 0.3 ? 'text-amber-600 dark:text-amber-400'
          : 'text-emerald-600 dark:text-emerald-400'

        return (
          <div className="card p-5 mb-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Activity size={14} className="text-slate-400" />
              Temporal & Symmetry Analysis
            </h3>

            {temporal && (
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-center">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Fatigue Index</div>
                  <div className={`text-lg font-bold tabular-nums ${fatigueColor}`}>{fatigue != null ? fatigue.toFixed(2) : '—'}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-center">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Sway Index</div>
                  <div className="text-lg font-bold tabular-nums text-slate-700 dark:text-slate-200">{sway != null ? sway.toFixed(4) : '—'}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-center">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Symmetry Trend</div>
                  <div className={`text-lg font-bold ${trendColor}`}>{symTrend ? `${trendIcon} ${symTrend}` : '—'}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-center">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Depth Confidence</div>
                  <div className="text-lg font-bold tabular-nums text-slate-700 dark:text-slate-200">
                    {m.depth_confidence != null ? `${(m.depth_confidence * 100).toFixed(0)}%` : '—'}
                  </div>
                </div>
              </div>
            )}

            {hasLsi && (
              <div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Bilateral Lateral Symmetry Index (LSI)</div>
                <div className="grid grid-cols-5 gap-2">
                  {lsiKeys.map(k => {
                    const v = m[k]
                    if (v == null) return null
                    const high = v > 10
                    return (
                      <div key={k} className={`p-3 rounded-lg border text-center ${
                        high ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                        : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700'
                      }`}>
                        <div className="text-[9px] text-slate-400 mb-1 uppercase">{k.replace('lsi_','').replace('_',' ')}</div>
                        <div className={`text-base font-bold ${high ? 'text-amber-700 dark:text-amber-300' : 'text-slate-700 dark:text-slate-200'}`}>{v}%</div>
                        {high && <div className="text-[9px] text-amber-500 mt-0.5">{'>'} 10% threshold</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Grid: measurements + gauge */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
            Body Measurements
          </h3>
          <MeasurementPanel measurements={session.measurements} alerts={session.posture_alerts} />
        </div>

        <div className="card p-5 flex flex-col items-center justify-center gap-4">
          <SymmetryGauge score={sym} />
          {session.notes && (
            <div className="w-full p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">Session Notes</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 italic">{session.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Norm comparison + delta table */}
      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Activity size={14} className="text-slate-400" />
            Clinical Analysis
          </h3>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {patient.age && patient.gender && (
              <span>Norms: {patient.gender}, age {patient.age} ({patient.age <= 30 ? '18–30' : patient.age <= 50 ? '31–50' : '51+'})</span>
            )}
            {previousSession && (
              <span>· Comparing to Session #{previousSession.id}</span>
            )}
          </div>
        </div>
        <NormComparisonTable
          measurements={session.measurements}
          norms={norms}
          deltas={deltas}
        />
        {!patient.age || !patient.gender ? (
          <p className="text-xs text-slate-400 mt-3 text-center">
            Add patient age and gender to enable norm comparison
          </p>
        ) : null}
      </div>

      {/* Reports */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">
          Clinical Reports
        </h3>
        <ReportViewer sessionId={Number(id)} previousSessionId={previousSession?.id} />
      </div>
    </motion.div>
  )
}
