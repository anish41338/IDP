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
    <div className="card p-4 text-center">
      <div className={`text-xl font-bold tabular-nums text-slate-800 dark:text-slate-100 ${valueClass}`}>
        {value}
      </div>
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
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

  const symColor = sym >= 95
    ? 'text-emerald-600 dark:text-emerald-400'
    : sym >= 85
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400'

  const symLabel = sym >= 95 ? 'Excellent' : sym >= 85 ? 'Good' : 'Needs Attention'
  const angleLabel = angle == null ? '' : Math.abs(angle) <= 2 ? 'Neutral' : Math.abs(angle) <= 5 ? 'Mild tilt' : 'Significant tilt'

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={page}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Session #{session.id}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
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
      <div className="grid grid-cols-4 gap-3 mb-5">
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
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
          Clinical Reports
        </h3>
        <ReportViewer sessionId={Number(id)} previousSessionId={previousSession?.id} />
      </div>
    </motion.div>
  )
}
