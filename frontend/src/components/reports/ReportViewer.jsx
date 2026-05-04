import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, TrendingUp, ClipboardList, Loader2, ChevronDown } from 'lucide-react'
import { getSessionReports, createAssessmentReport, createProgressReport, createSoapReport } from '../../api/reports'
import { mockApi } from '../../lib/mockData'
import { useAppContext } from '../../context/AppContext'
import LoadingSpinner from '../shared/LoadingSpinner'

const REPORT_TYPES = [
  { key: 'assessment', label: 'Assessment', icon: FileText, color: 'bg-blue-600 hover:bg-blue-700' },
  { key: 'progress', label: 'Progress', icon: TrendingUp, color: 'bg-emerald-600 hover:bg-emerald-700', requiresPrev: true },
  { key: 'soap', label: 'SOAP Note', icon: ClipboardList, color: 'bg-violet-600 hover:bg-violet-700' },
]

const TYPE_LABELS = { assessment: 'Assessment', progress: 'Progress', soap: 'SOAP Note' }

export default function ReportViewer({ sessionId, previousSessionId }) {
  const { demoMode } = useAppContext()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(null)
  const [error, setError] = useState(null)
  const [activeReport, setActiveReport] = useState(null)

  useEffect(() => {
    const fetch = demoMode
      ? mockApi.getSessionReports(sessionId)
      : getSessionReports(sessionId)
    fetch
      .then(data => { setReports(data); if (data.length > 0) setActiveReport(data[0]) })
      .catch(() => setError('Failed to load reports'))
      .finally(() => setLoading(false))
  }, [sessionId, demoMode])

  const generate = async (type) => {
    setGenerating(type)
    setError(null)
    try {
      let report
      if (demoMode) {
        if (type === 'assessment') report = await mockApi.createAssessmentReport(sessionId)
        else if (type === 'progress') report = await mockApi.createProgressReport(sessionId, previousSessionId)
        else report = await mockApi.createSoapReport(sessionId)
      } else {
        if (type === 'assessment') report = await createAssessmentReport(sessionId)
        else if (type === 'progress') report = await createProgressReport(sessionId, previousSessionId)
        else report = await createSoapReport(sessionId)
      }
      setReports(r => [report, ...r])
      setActiveReport(report)
    } catch {
      setError(`Failed to generate ${type} report`)
    } finally {
      setGenerating(null)
    }
  }

  if (loading) return <LoadingSpinner size="sm" label="Loading reports..." />

  return (
    <div className="space-y-4">
      {/* Generate buttons */}
      <div className="flex flex-wrap gap-2">
        {REPORT_TYPES.map(({ key, label, icon: Icon, color, requiresPrev }) => {
          const disabled = !!generating || (requiresPrev && !previousSessionId)
          return (
            <button
              key={key}
              onClick={() => generate(key)}
              disabled={disabled}
              title={requiresPrev && !previousSessionId ? 'Requires a previous session' : undefined}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${color}`}
            >
              {generating === key ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Icon size={12} />
              )}
              {generating === key ? 'Generating...' : `Generate ${label}`}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-xs">
          {error}
        </div>
      )}

      {/* Generating indicator */}
      {generating && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-700 dark:text-blue-300">
          <Loader2 size={13} className="animate-spin shrink-0" />
          Generating {TYPE_LABELS[generating]} report via LLM...
        </div>
      )}

      {/* Report selector tabs */}
      {reports.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {reports.map(r => (
            <button
              key={r.id}
              onClick={() => setActiveReport(r)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
                activeReport?.id === r.id
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-800 dark:border-slate-200'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              {TYPE_LABELS[r.report_type] || r.report_type}
            </button>
          ))}
        </div>
      )}

      {/* Report content */}
      <AnimatePresence mode="wait">
        {activeReport ? (
          <motion.div
            key={activeReport.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5 max-h-96 overflow-auto"
          >
            <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 font-mono leading-relaxed">
              {activeReport.content}
            </pre>
          </motion.div>
        ) : (
          !generating && (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <FileText size={28} className="text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No reports yet</p>
              <p className="text-xs text-slate-400">Generate a report using the buttons above</p>
            </div>
          )
        )}
      </AnimatePresence>
    </div>
  )
}
