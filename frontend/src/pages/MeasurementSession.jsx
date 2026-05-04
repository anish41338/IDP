import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, Save, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react'
import { getPatient } from '../api/patients'
import { createSession } from '../api/sessions'
import { mockApi } from '../lib/mockData'
import { useAppContext } from '../context/AppContext'
import useVideoStream from '../hooks/useVideoStream'
import VideoFeed from '../components/measurement/VideoFeed'
import MeasurementPanel from '../components/measurement/MeasurementPanel'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const page = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  out: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

// Demo mode: realistic frames that cycle to simulate live detection
const DEMO_FRAMES = [
  { shoulder_width_cm: 44.2, symmetry_score: 97.8, posture_angle_deg: -1.8, arm_length_left_cm: 59.2, arm_length_right_cm: 59.8, torso_length_cm: 54.1, inseam_estimate_cm: 80.3, height_cm: 175, left_shoulder_height_cm: 149.2, right_shoulder_height_cm: 147.8 },
  { shoulder_width_cm: 44.5, symmetry_score: 98.1, posture_angle_deg: -1.5, arm_length_left_cm: 59.4, arm_length_right_cm: 59.9, torso_length_cm: 54.3, inseam_estimate_cm: 80.5, height_cm: 175, left_shoulder_height_cm: 149.5, right_shoulder_height_cm: 148.1 },
  { shoulder_width_cm: 44.3, symmetry_score: 97.6, posture_angle_deg: -1.9, arm_length_left_cm: 59.3, arm_length_right_cm: 59.8, torso_length_cm: 54.0, inseam_estimate_cm: 80.4, height_cm: 175, left_shoulder_height_cm: 149.3, right_shoulder_height_cm: 147.9 },
  { shoulder_width_cm: 44.6, symmetry_score: 98.3, posture_angle_deg: -1.6, arm_length_left_cm: 59.5, arm_length_right_cm: 60.0, torso_length_cm: 54.4, inseam_estimate_cm: 80.6, height_cm: 175, left_shoulder_height_cm: 149.6, right_shoulder_height_cm: 148.2 },
  { shoulder_width_cm: 44.1, symmetry_score: 97.5, posture_angle_deg: -2.0, arm_length_left_cm: 59.1, arm_length_right_cm: 59.7, torso_length_cm: 53.9, inseam_estimate_cm: 80.2, height_cm: 175, left_shoulder_height_cm: 149.1, right_shoulder_height_cm: 147.7 },
]

// Animated SVG skeleton for demo mode
function DemoPoseFeed() {
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

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-950" style={{ aspectRatio: '4/3' }}>
      <svg viewBox="0 0 640 480" className="w-full h-full">
        {/* Grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="640" height="480" fill="#020617" />
        <rect width="640" height="480" fill="url(#grid)" />

        {/* Skeleton lines */}
        {connections.map(([[x1, y1], [x2, y2]], i) => (
          <line
            key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#22c55e" strokeWidth="2.5" strokeOpacity="0.9" strokeLinecap="round"
          />
        ))}

        {/* Head circle */}
        <circle cx="320" cy="72" r="38" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeOpacity="0.85" />

        {/* Keypoints */}
        {keypoints.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="5" fill="#22c55e">
            <animate attributeName="opacity" values="1;0.45;1" dur={`${1.4 + i * 0.12}s`} repeatCount="indefinite" />
          </circle>
        ))}

        {/* Shoulder width indicator */}
        <line x1="258" y1="132" x2="382" y2="132" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5 3" strokeOpacity="0.85" />
        <line x1="258" y1="125" x2="258" y2="139" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="382" y1="125" x2="382" y2="139" stroke="#3b82f6" strokeWidth="1.5" />
        <text x="320" y="124" textAnchor="middle" fill="#60a5fa" fontSize="11" fontWeight="600">44.2 cm</text>

        {/* Height indicator */}
        <line x1="490" y1="34" x2="490" y2="448" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5 3" strokeOpacity="0.7" />
        <line x1="483" y1="34" x2="497" y2="34" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="483" y1="448" x2="497" y2="448" stroke="#3b82f6" strokeWidth="1.5" />
        <text x="520" y="245" textAnchor="middle" fill="#60a5fa" fontSize="11" fontWeight="600"
          transform="rotate(90, 520, 245)">175 cm</text>

        {/* Scanline */}
        <rect x="0" y="-4" width="640" height="4" fill="#22c55e" fillOpacity="0.12">
          <animateTransform attributeName="transform" type="translate" from="0,0" to="0,490" dur="3s" repeatCount="indefinite" />
        </rect>
      </svg>

      {/* Badges */}
      <div className="absolute top-3 left-3 px-2 py-1 bg-blue-600/90 text-white text-[10px] font-bold rounded-md tracking-wider">
        DEMO
      </div>
      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600/90 text-white text-[10px] font-semibold rounded-full">
        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
        ANALYZING
      </div>

      {/* Corner confidence */}
      <div className="absolute bottom-3 left-3 text-[10px] text-emerald-400/80 font-mono">
        confidence: 0.94 · landmarks: 33/33
      </div>
    </div>
  )
}

export default function MeasurementSession() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const { demoMode } = useAppContext()

  const [patient, setPatient] = useState(null)
  const [height, setHeight] = useState('')
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Demo mode state
  const [demoMeasurements, setDemoMeasurements] = useState(null)
  const demoFrameRef = useRef(0)
  const demoReady = useRef(false)

  // Real mode
  const { frameDataUrl, measurements, alerts, connected, error: wsError, videoRef, canvasRef } =
    useVideoStream(step === 2 && !demoMode ? Number(height) : null)

  useEffect(() => {
    const fetch = demoMode ? mockApi.getPatient(patientId) : getPatient(patientId)
    fetch
      .then(p => { setPatient(p); if (p.height_cm) setHeight(String(p.height_cm)) })
      .catch(() => setError('Failed to load patient'))
  }, [patientId, demoMode])

  // Demo measurement cycling
  useEffect(() => {
    if (!demoMode || step !== 2) return
    // Small delay before first measurement appears (simulate detection startup)
    const startTimeout = setTimeout(() => {
      demoReady.current = true
      setDemoMeasurements(DEMO_FRAMES[0])
    }, 1200)
    const interval = setInterval(() => {
      if (!demoReady.current) return
      demoFrameRef.current = (demoFrameRef.current + 1) % DEMO_FRAMES.length
      setDemoMeasurements({ ...DEMO_FRAMES[demoFrameRef.current] })
    }, 450)
    return () => { clearTimeout(startTimeout); clearInterval(interval) }
  }, [demoMode, step])

  const handleStart = (e) => {
    e.preventDefault()
    if (!height || Number(height) < 50 || Number(height) > 250) {
      return setError('Please enter a valid height between 50 and 250 cm')
    }
    setError(null)
    setStep(2)
  }

  const handleSave = async () => {
    const finalMeasurements = demoMode ? demoMeasurements : measurements
    if (!finalMeasurements) return setError('No measurements captured yet')
    setSaving(true)
    try {
      const sessionData = {
        patient_id: Number(patientId),
        measurements: finalMeasurements,
        posture_alerts: demoMode ? [] : (alerts || []),
      }
      const session = await (demoMode ? mockApi.createSession(sessionData) : createSession(sessionData))
      navigate(`/sessions/${session.id}`)
    } catch {
      setError('Failed to save session')
      setSaving(false)
    }
  }

  if (!patient) return <LoadingSpinner size="lg" label="Loading patient..." />

  const activeMeasurements = demoMode ? demoMeasurements : measurements
  const activeAlerts = demoMode ? [] : (alerts || [])
  const isReady = Boolean(activeMeasurements)

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={page}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">New Measurement Session</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Patient: {patient.name}</p>
        </div>
        <button onClick={() => navigate(-1)} className="btn-ghost">
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-6">
        {[
          { n: 1, label: 'Configure' },
          { n: 2, label: 'Measure' },
        ].map(({ n, label }, i, arr) => (
          <div key={n} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === n
                  ? 'bg-blue-600 text-white'
                  : step > n
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}>
                {step > n ? <CheckCircle2 size={14} /> : n}
              </div>
              <span className={`text-sm font-medium ${step === n ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
            {i < arr.length - 1 && (
              <div className={`h-px w-8 ${step > n ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0" /> {error}
        </div>
      )}

      {/* Step 1: Config */}
      {step === 1 && (
        <div className="max-w-sm mx-auto">
          <div className="card p-6">
            <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">Configure Session</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Patient height is used to calibrate all measurements.
            </p>
            <form onSubmit={handleStart} className="space-y-4">
              <div>
                <label className="label">Patient Height (cm) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  placeholder="e.g. 175"
                  className="input text-center text-2xl font-bold tracking-wide"
                  min="50"
                  max="250"
                  autoFocus
                />
                <p className="text-xs text-slate-400 mt-1.5 text-center">Range: 50–250 cm</p>
              </div>
              <button type="submit" className="btn-primary w-full py-3">
                <Play size={15} /> Start Session
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Step 2: Measure */}
      {step === 2 && (
        <div className="grid grid-cols-2 gap-5">
          {/* Video / Demo feed */}
          <div>
            {demoMode ? (
              <DemoPoseFeed />
            ) : (
              <VideoFeed
                frameDataUrl={frameDataUrl}
                connected={connected}
                error={wsError}
                videoRef={videoRef}
                canvasRef={canvasRef}
              />
            )}
          </div>

          {/* Measurements + save */}
          <div className="flex flex-col gap-4">
            <div className="card p-4 flex-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Live Measurements
                </h3>
                {isReady ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    LIVE
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 animate-pulse">Detecting...</span>
                )}
              </div>
              <MeasurementPanel measurements={activeMeasurements} alerts={activeAlerts} />
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !isReady}
              className="btn-primary py-3 text-base"
            >
              <Save size={16} />
              {saving ? 'Saving Session...' : isReady ? 'Save Session' : 'Waiting for detection...'}
            </button>

            {!isReady && (
              <p className="text-xs text-slate-400 text-center">
                {demoMode ? 'Demo analysis starting...' : 'Stand in frame to begin detection'}
              </p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
