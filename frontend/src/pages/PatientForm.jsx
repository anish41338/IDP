import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Save, X, User } from 'lucide-react'
import { createPatient, updatePatient, getPatient } from '../api/patients'
import { mockApi } from '../lib/mockData'
import { useAppContext } from '../context/AppContext'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const page = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  out: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

const EMPTY = { name: '', age: '', gender: '', height_cm: '', weight_kg: '', notes: '' }

export default function PatientForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const { demoMode } = useAppContext()
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isEdit) return
    const fetch = demoMode ? mockApi.getPatient(id) : getPatient(id)
    fetch
      .then(p => setForm({
        name: p.name ?? '',
        age: p.age ?? '',
        gender: p.gender ?? '',
        height_cm: p.height_cm ?? '',
        weight_kg: p.weight_kg ?? '',
        notes: p.notes ?? '',
      }))
      .catch(() => setError('Failed to load patient'))
      .finally(() => setLoading(false))
  }, [id, isEdit, demoMode])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Patient name is required')
    setSaving(true)
    setError(null)
    const payload = {
      name: form.name.trim(),
      age: form.age ? Number(form.age) : null,
      gender: form.gender || null,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      notes: form.notes.trim() || null,
    }
    try {
      if (isEdit) {
        await (demoMode ? mockApi.updatePatient(id, payload) : updatePatient(id, payload))
        navigate(`/patients/${id}`)
      } else {
        const patient = await (demoMode ? mockApi.createPatient(payload) : createPatient(payload))
        navigate(`/patients/${patient.id}`)
      }
    } catch {
      setError('Failed to save patient')
    } finally {
      setSaving(false)
    }
  }

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  if (loading) return <LoadingSpinner size="lg" label="Loading patient..." />

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={page}>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <User size={18} className="text-slate-500 dark:text-slate-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {isEdit ? 'Edit Patient' : 'New Patient'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isEdit ? 'Update patient information' : 'Register a new patient for body assessment'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div className="col-span-2">
            <label className="label">Full Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Sarah Johnson"
              className="input"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Age</label>
              <input type="number" value={form.age} onChange={set('age')} placeholder="e.g. 34" className="input" min="0" max="150" />
            </div>
            <div>
              <label className="label">Gender</label>
              <select value={form.gender} onChange={set('gender')} className="input">
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other / Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="label">Height (cm)</label>
              <input type="number" value={form.height_cm} onChange={set('height_cm')} placeholder="e.g. 165" className="input" min="0" />
            </div>
            <div>
              <label className="label">Weight (kg)</label>
              <input type="number" value={form.weight_kg} onChange={set('weight_kg')} placeholder="e.g. 62" className="input" min="0" />
            </div>
          </div>

          <div>
            <label className="label">Clinical Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={3}
              placeholder="Diagnosis, referral reason, treatment context..."
              className="input resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              <Save size={14} />
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Patient'}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
              <X size={14} />
              Cancel
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  )
}
