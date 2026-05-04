import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, ArrowLeft, AlertTriangle, CheckCircle2, Wifi, WifiOff, Clock, Bell } from 'lucide-react'
import { getPatient } from '../api/patients'
import { mockApi } from '../lib/mockData'
import { useAppContext } from '../context/AppContext'
import useVideoStream from '../hooks/useVideoStream'
import LoadingSpinner from '../components/shared/LoadingSpinner'

// ─── Demo skeleton feed ───────────────────────────────────────────────────────

function DemoPoseFeed({ hasAlert }) {
  const connections = [
    [[320, 52], [258, 152]], [[320, 52], [382, 152]],
    [[258, 152], [382, 152]],
    [[258, 152], [228, 238]], [[228, 238], [212, 320]],
    [[382, 152], [412, 238]], [[412, 238], [428, 320]],
    [[258, 152], [292, 295]], [[382, 152], [348, 295]],
    [[292, 295], [348, 295]],
    [[292, 295], [283, 378]], [[283, 378], [278, 448]],
    [[348, 295], [357, 378]], [[357, 378], [362, 448]],
  ]
  const keypoints = [
    [320, 52], [258, 152], [382, 152],
    [228, 238], [412, 238], [212, 320], [428, 320],
    [292, 295], [348, 295],
    [283, 378], [357, 378], [278, 448], [362, 448],
  ]
  const color = hasAlert ? '#f59e0b' : '#22c55e'

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-950" style={{ aspectRatio: '4/3' }}>
      <svg viewBox="0 0 640 480" className="w-full h-full">
        <defs>
          <pattern id="mgrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="640" height="480" fill="#020617" />
        <rect width="640" height="480" fill="url(#mgrid)" />

        {connections.map(([[x1, y1], [x2, y2]], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={color} strokeWidth="2.5" strokeOpacity="0.9" strokeLinecap="round"
            style={{ transition: 'stroke 0.4s ease' }}
          />
        ))}

        <circle cx="320" cy="72" r="38" fill="none" stroke={color} strokeWidth="2.5" strokeOpacity="0.85"
          style={{ transition: 'stroke 0.4s ease' }} />

        {keypoints.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="5" fill={color} style={{ transition: 'fill 0.4s ease' }}>
            <animate attributeName="opacity" values="1;0.4;1" dur={`${1.4 + i * 0.1}s`} repeatCount="indefinite" />
          </circle>
        ))}

        <rect x="0" y="-4" width="640" height="3" fill={color} fillOpacity="0.1">
          <animateTransform attributeName="transform" type="translate" from="0,0" to="0,490" dur="3s" repeatCount="indefinite" />
        </rect>
      </svg>

      <div className="absolute top-3 left-3 px-2 py-1 bg-blue-600/90 text-white text-[10px] font-bold rounded-md tracking-wider">
        DEMO
      </div>
      <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors duration-300 ${
        hasAlert ? 'bg-amber-500/90 text-white' : 'bg-emerald-600/90 text-white'
      }`}>
        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
        {hasAlert ? 'ALERT' : 'MONITORING'}
      </div>
      <div className="absolute bottom-3 left-3 text-[10px] text-emerald-400/70 font-mono">
        confidence: 0.94 · landmarks: 33/33
      </div>
    </div>
  )
}

// ─── Demo cycling measurements ────────────────────────────────────────────────

const DEMO_GOOD = {
  shoulder_width_cm: 44.3, symmetry_score: 97.9, posture_angle_deg: -1.7,
  arm_length_left_cm: 59.3, arm_length_right_cm: 59.9,
  torso_length_cm: 54.2, height_cm: 175,
}
const DEMO_ALERT_VARIANTS = [
  { ...DEMO_GOOD, posture_angle_deg: -6.1, symmetry_score: 97.9 },
  { ...DEMO_GOOD, posture_angle_deg: -5.8, symmetry_score: 88.4 },
  { ...DEMO_GOOD, posture_angle_deg: -7.2, symmetry_score: 97.9 },
]

const DEMO_ALERT_MSGS = [
  'Shoulder drop detected: 6.1° tilt — exceeds 5° threshold',
  'Shoulder drop detected: 5.8° tilt — postural correction needed',
  'Significant shoulder tilt: 7.2° — prolonged deviation detected',
  'Asymmetry detected: symmetry score 88.4% — below 90% threshold',
]

// ─── Alert log entry ──────────────────────────────────────────────────────────

function AlertEntry({ entry, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      transition={{ duration: 0.25 }}
      className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
        entry.type === 'alert'
          ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
          : entry.type === 'clear'
          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      }`}
    >
      <div className="shrink-0 mt-0.5">
        {entry.type === 'alert'
          ? <AlertTriangle size={14} className="text-amber-500" />
          : entry.type === 'clear'
          ? <CheckCircle2 size={14} className="text-emerald-500" />
          : <Activity size={14} className="text-slate-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${
          entry.type === 'alert' ? 'text-amber-800 dark:text-amber-200'
          : entry.type === 'clear' ? 'text-emerald-800 dark:text-emerald-200'
          : 'text-slate-600 dark:text-slate-300'
        }`}>
          {entry.message}
        </p>
      </div>
      <div className="shrink-0 text-[10px] text-slate-400 font-mono tabular-nums">
        {entry.time}
      </div>
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function fmt(d) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function useDuration() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const m = Math.floor(elapsed / 60).toString().padStart(2, '0')
  const s = (elapsed % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function LiveMonitor() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const { demoMode } = useAppContext()

  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [alertLog, setAlertLog] = useState([])
  const [alertCount, setAlertCount] = useState(0)
  const [currentMeasurements, setCurrentMeasurements] = useState(null)
  const [hasAlert, setHasAlert] = useState(false)
  const duration = useDuration()
  const logEndRef = useRef(null)

  // Real-mode WebSocket
  const { frameDataUrl, measurements, alerts, connected } =
    useVideoStream(!demoMode ? 170 : null)

  // Load patient
  useEffect(() => {
    const fetch = demoMode ? mockApi.getPatient(patientId) : getPatient(patientId)
    fetch
      .then(setPatient)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [patientId, demoMode])

  // Scroll log to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [alertLog])

  // ── Demo mode: inject startup message + periodic alerts ──────────────────────
  useEffect(() => {
    if (!demoMode) return

    setCurrentMeasurements(DEMO_GOOD)

    const startMsg = {
      type: 'start',
      message: 'Monitoring started — landmarks detected, posture analysis active',
      time: fmt(new Date()),
    }
    setAlertLog([startMsg])

    let alertActive = false
    let alertVariantIdx = 0

    const interval = setInterval(() => {
      const now = new Date()
      if (!alertActive) {
        // Trigger alert
        alertActive = true
        const msg = DEMO_ALERT_MSGS[alertVariantIdx % DEMO_ALERT_MSGS.length]
        const variant = DEMO_ALERT_VARIANTS[alertVariantIdx % DEMO_ALERT_VARIANTS.length]
        alertVariantIdx++
        setHasAlert(true)
        setCurrentMeasurements(variant)
        setAlertCount(c => c + 1)
        setAlertLog(prev => [...prev, { type: 'alert', message: msg, time: fmt(now) }])

        // Auto-clear after 6 seconds
        setTimeout(() => {
          alertActive = false
          setHasAlert(false)
          setCurrentMeasurements(DEMO_GOOD)
          setAlertLog(prev => [...prev, {
            type: 'clear',
            message: 'Posture corrected — returning to normal parameters',
            time: fmt(new Date()),
          }])
        }, 6000)
      }
    }, 14000)

    return () => clearInterval(interval)
  }, [demoMode])

  // ── Real mode: feed WebSocket measurements into log ──────────────────────────
  useEffect(() => {
    if (demoMode || !measurements) return
    setCurrentMeasurements(measurements)
    if (alerts?.length > 0) {
      setHasAlert(true)
      alerts.forEach(msg => {
        setAlertCount(c => c + 1)
        setAlertLog(prev => [...prev, { type: 'alert', message: msg, time: fmt(new Date()) }])
      })
    } else if (hasAlert) {
      setHasAlert(false)
      setAlertLog(prev => [...prev, {
        type: 'clear',
        message: 'Posture corrected — returning to normal parameters',
        time: fmt(new Date()),
      }])
    }
  }, [measurements, alerts, demoMode])

  if (loading) return <LoadingSpinner size="lg" label="Starting monitor..." />

  const statusColor = hasAlert
    ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
    : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'

  const statusText = hasAlert ? 'POSTURE ALERT' : 'GOOD POSTURE'
  const statusIcon = hasAlert
    ? <AlertTriangle size={16} className="text-amber-500" />
    : <CheckCircle2 size={16} className="text-emerald-500" />

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              Live Monitoring
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {patient?.name ?? 'Patient'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Duration */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-mono text-slate-600 dark:text-slate-300">
            <Clock size={11} /> {duration}
          </div>
          {/* Alert count */}
          {alertCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-950/40 rounded-full text-xs font-semibold text-amber-700 dark:text-amber-300">
              <Bell size={11} /> {alertCount} alert{alertCount !== 1 ? 's' : ''}
            </div>
          )}
          <button onClick={() => navigate(`/patients/${patientId}`)} className="btn-ghost">
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border mb-5 transition-colors duration-500 ${statusColor}`}>
        {statusIcon}
        <span className={`text-sm font-bold tracking-wide ${hasAlert ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
          {statusText}
        </span>
        {hasAlert && (
          <span className="text-xs text-amber-600 dark:text-amber-400 ml-1">
            — postural deviation detected, please correct your position
          </span>
        )}
      </div>

      {/* Main grid: feed + measurements */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Feed */}
        <div>
          {demoMode ? (
            <DemoPoseFeed hasAlert={hasAlert} />
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-slate-950" style={{ aspectRatio: '4/3' }}>
              {frameDataUrl ? (
                <img src={frameDataUrl} alt="Live feed" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-slate-600 text-xs">Connecting camera...</p>
                  </div>
                </div>
              )}
              <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                connected ? 'bg-emerald-600/90 text-white' : 'bg-slate-700/90 text-slate-400'
              }`}>
                {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
                {connected ? 'Live' : 'Connecting'}
              </div>
            </div>
          )}
        </div>

        {/* Current measurements */}
        <div className="card p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
            Current Readings
          </h3>
          {currentMeasurements ? (
            <div className="grid grid-cols-2 gap-2 flex-1">
              {Object.entries(currentMeasurements).map(([key, value]) => {
                const isPostureKey = key === 'posture_angle_deg'
                const isSymKey = key === 'symmetry_score'
                let cardClass = 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                if (isPostureKey && Math.abs(value) > 5) cardClass = 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                if (isSymKey && value < 90) cardClass = 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                const label = key.replace(/_cm$/, '').replace(/_deg$/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                const unit = key.endsWith('_cm') ? ' cm' : key.endsWith('_deg') ? '°' : key === 'symmetry_score' ? '%' : ''
                return (
                  <div key={key} className={`p-2.5 rounded-lg border text-center transition-colors duration-300 ${cardClass}`}>
                    <div className="text-[10px] font-medium opacity-60 uppercase tracking-wide mb-1">{label}</div>
                    <div className="text-sm font-bold tabular-nums">{value}{unit}</div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              <div className="text-center">
                <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                Detecting landmarks...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alert log */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Bell size={14} className="text-slate-400" />
            Alert Log
          </h3>
          {alertCount > 0 && (
            <span className="text-xs text-slate-400">
              {alertCount} posture event{alertCount !== 1 ? 's' : ''} this session
            </span>
          )}
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {alertLog.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2">
              <Activity size={16} />
              Monitoring — no events yet
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {[...alertLog].reverse().map((entry, i) => (
                <AlertEntry key={`${entry.time}-${i}`} entry={entry} index={i} />
              ))}
            </AnimatePresence>
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </motion.div>
  )
}
