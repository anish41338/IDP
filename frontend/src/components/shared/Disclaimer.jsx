import { AlertTriangle } from 'lucide-react'

export default function Disclaimer() {
  return (
    <div className="flex items-center gap-2 px-6 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs shrink-0">
      <AlertTriangle size={11} className="shrink-0" />
      <span>
        <strong>Clinical Disclaimer:</strong> AI-generated assessments are for informational purposes only and do not constitute medical advice. All findings must be reviewed by a qualified healthcare professional.
      </span>
    </div>
  )
}
