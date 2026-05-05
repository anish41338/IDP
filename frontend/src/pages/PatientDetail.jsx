import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit2, Plus, Calendar, Ruler, Weight, User, TrendingUp, Radio, Activity, ChevronRight } from 'lucide-react'
import { getPatient, getPatientSessions } from '../api/patients'
import { mockApi } from '../lib/mockData'
import { useAppContext } from '../context/AppContext'
import TrendChart from '../components/analytics/TrendChart'
import SymmetryGauge from '../components/analytics/SymmetryGauge'
import ChatPanel from '../components/chat/ChatPanel'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const page = {
  initial: { opacity: 0, y: 16 },
  in: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
  out: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

const tabAnim = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.12 } },
}

const TABS = ['History', 'Trends', 'Chat']
const TREND_METRICS = ['symmetry_score', 'shoulder_width_cm', 'posture_angle_deg']
const AVATAR_GRADS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-rose-500 to-pink-600',
]

function initials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function symmetryBadge(score) {
  if (score == null) return 'bg-slate-100 dark:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-600'
  if (score >= 95) return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
  if (score >= 85) return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
  return 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30'
}

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { demoMode } = useAppContext()
  const [patient, setPatient] = useState(null)
  const [sessions, setSessions] = useState([])
  const [tab, setTab] = useState('History')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      demoMode ? mockApi.getPatient(id) : getPatient(id),
      demoMode ? mockApi.getPatientSessions(id) : getPatientSessions(id),
    ])
      .then(([p, s]) => { setPatient(p); setSessions(s) })
      .catch(() => setError('Failed to load patient data'))
      .finally(() => setLoading(false))
  }, [id, demoMode])

  if (loading) return <LoadingSpinner size="lg" label="Loading patient..." />
  if (error) return <div className="p-6 text-red-500 text-sm">{error}</div>
  if (!patient) return null

  const latest = sessions[0]
  const avatarGrad = AVATAR_GRADS[Number(id) % AVATAR_GRADS.length]

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={page}>
      {/* Patient hero card */}
      <div className="card p-6 mb-6 relative overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-500/5 dark:to-transparent pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-lg`}>
              {initials(patient.name)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{patient.name}</h1>
              <div className="flex flex-wrap gap-4 mt-2">
                {patient.age && (
                  <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <User size={13} /> Age {patient.age}
                  </span>
                )}
                {patient.gender && (
                  <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 capitalize">
                    <User size={13} /> {patient.gender}
                  </span>
                )}
                {patient.height_cm && (
                  <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <Ruler size={13} /> {patient.height_cm} cm
                  </span>
                )}
                {patient.weight_kg && (
                  <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <Weight size={13} /> {patient.weight_kg} kg
                  </span>
                )}
              </div>
              {patient.notes && (
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 max-w-md italic">{patient.notes}</p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 shrink-0 flex-wrap items-start">
            <Link to={`/patients/${id}/edit`} className="btn-secondary">
              <Edit2 size={13} /> Edit
            </Link>
            <Link
              to={`/patients/${id}/monitor`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-emerald-500/25 hover:shadow-md active:scale-[0.98]"
            >
              <Radio size={13} className="animate-pulse" />
              Live Monitor
            </Link>
            <Link to={`/patients/${id}/sessions/new`} className="btn-primary">
              <Plus size={13} /> New Session
            </Link>
          </div>
        </div>

        {/* Quick stats */}
        {latest && (
          <div className="relative grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-100 dark:border-slate-700/60">
            {[
              { label: 'Total Sessions', value: sessions.length, color: '' },
              {
                label: 'Latest Symmetry',
                value: latest.measurements?.symmetry_score != null ? `${latest.measurements.symmetry_score}%` : '—',
                color: latest.measurements?.symmetry_score >= 95 ? 'text-emerald-600 dark:text-emerald-400'
                  : latest.measurements?.symmetry_score >= 85 ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400',
              },
              {
                label: 'Posture Angle',
                value: latest.measurements?.posture_angle_deg != null ? `${latest.measurements.posture_angle_deg}°` : '—',
                color: '',
              },
              {
                label: 'Last Session',
                value: new Date(latest.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                color: '',
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <div className={`text-xl font-bold text-slate-800 dark:text-slate-100 tabular-nums ${color}`}>{value}</div>
                <div className="text-xs font-medium text-slate-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700/60 mb-5 gap-0">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-semibold transition-all duration-150 flex items-center gap-2 ${
              tab === t ? 'tab-active' : 'tab-inactive'
            }`}
          >
            {t}
            {t === 'History' && sessions.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                tab === t
                  ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                {sessions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} {...tabAnim}>

          {/* History */}
          {tab === 'History' && (
            sessions.length === 0 ? (
              <div className="card flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Calendar size={26} className="text-slate-400" />
                </div>
                <div>
                  <p className="font-bold text-slate-600 dark:text-slate-300 text-base">No sessions yet</p>
                  <p className="text-sm text-slate-400 mt-1">Start the first assessment session for this patient</p>
                </div>
                <Link to={`/patients/${id}/sessions/new`} className="btn-primary mt-1">
                  <Plus size={14} /> Start First Session
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="card-hover p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => navigate(`/sessions/${s.id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center shrink-0">
                        <Calendar size={15} className="text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          Session #{s.id}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {new Date(s.session_date).toLocaleDateString('en-US', {
                            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                          })}
                          {s.notes && ` · ${s.notes}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      {s.measurements?.symmetry_score != null && (
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${symmetryBadge(s.measurements.symmetry_score)}`}>
                          {s.measurements.symmetry_score}% sym
                        </span>
                      )}
                      {s.posture_alerts?.length > 0 && (
                        <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-lg border border-amber-200 dark:border-amber-500/30">
                          ⚠ {s.posture_alerts.length}
                        </span>
                      )}
                      <ChevronRight size={15} className="text-slate-300 dark:text-slate-600" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          )}

          {/* Trends */}
          {tab === 'Trends' && (
            sessions.length < 2 ? (
              <div className="card flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <TrendingUp size={26} className="text-slate-400" />
                </div>
                <div>
                  <p className="font-bold text-slate-600 dark:text-slate-300 text-base">Insufficient data</p>
                  <p className="text-sm text-slate-400 mt-1">At least 2 sessions required for trend analysis</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-5">
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <Activity size={14} className="text-slate-400" />
                    Key Metrics Over Time
                  </h3>
                  <TrendChart sessions={sessions} metrics={TREND_METRICS} />
                </div>
                <div className="card p-5 flex flex-col">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">Latest Symmetry</h3>
                  <div className="flex-1 flex items-center justify-center">
                    <SymmetryGauge score={latest?.measurements?.symmetry_score} />
                  </div>
                </div>
              </div>
            )
          )}

          {/* Chat */}
          {tab === 'Chat' && (
            <div className="card p-5">
              <ChatPanel patientId={Number(id)} />
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
