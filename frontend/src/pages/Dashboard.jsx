import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Plus, Users, Activity, TrendingUp, Calendar, ChevronRight, Trash2, Edit2 } from 'lucide-react'
import { getPatients, deletePatient } from '../api/patients'
import { mockApi, getMockStats } from '../lib/mockData'
import { useAppContext } from '../context/AppContext'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const page = {
  initial: { opacity: 0, y: 12 },
  in: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  out: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22 } },
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500',
  'bg-rose-500', 'bg-amber-500', 'bg-cyan-500',
]

function initials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function genderClass(g) {
  if (g === 'male') return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
  if (g === 'female') return 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300'
  return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <motion.div variants={item} className="card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-none tabular-nums">
          {value}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</div>
      </div>
    </motion.div>
  )
}

export default function Dashboard() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const { demoMode } = useAppContext()
  const navigate = useNavigate()

  useEffect(() => { fetchPatients() }, [demoMode])

  const fetchPatients = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = demoMode ? await mockApi.getPatients() : await getPatients()
      setPatients(data)
    } catch {
      setError('Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete patient "${name}"? This cannot be undone.`)) return
    try {
      if (!demoMode) await deletePatient(id)
      setPatients(p => p.filter(pt => pt.id !== id))
    } catch {
      setError('Failed to delete patient')
    }
  }

  const stats = demoMode
    ? getMockStats()
    : { totalPatients: patients.length, totalSessions: '—', avgSymmetry: '—', thisMonth: '—' }

  const statCards = [
    { icon: Users, label: 'Total Patients', value: stats.totalPatients, accent: 'bg-blue-600' },
    { icon: Activity, label: 'Total Sessions', value: stats.totalSessions, accent: 'bg-slate-600' },
    { icon: TrendingUp, label: 'Avg Symmetry Score', value: stats.avgSymmetry, accent: 'bg-emerald-600' },
    { icon: Calendar, label: 'Sessions This Month', value: stats.thisMonth, accent: 'bg-slate-500' },
  ]

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <LoadingSpinner size="lg" label="Loading patients..." />

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={page}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Patient Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {patients.length} patient{patients.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <Link to="/patients/new" className="btn-primary">
          <Plus size={15} />
          New Patient
        </Link>
      </div>

      {error && (
        <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <motion.div
        className="grid grid-cols-4 gap-4 mb-6"
        variants={list}
        initial="hidden"
        animate="show"
      >
        {statCards.map(s => <StatCard key={s.label} {...s} />)}
      </motion.div>

      {/* Search */}
      <div className="relative mb-4 max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search patients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9 py-2 text-sm"
        />
      </div>

      {/* Table / Empty state */}
      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Users size={24} className="text-slate-400" />
          </div>
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-200">No patients found</p>
            <p className="text-sm text-slate-400 mt-0.5">
              {search ? 'Try a different search term' : 'Create a new patient to get started'}
            </p>
          </div>
          {!search && (
            <Link to="/patients/new" className="btn-primary mt-1">
              <Plus size={14} /> Add First Patient
            </Link>
          )}
        </div>
      ) : (
        <motion.div className="card overflow-hidden" variants={list} initial="hidden" animate="show">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Age</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Gender</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Height</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Notes</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <motion.tr
                  key={p.id}
                  variants={item}
                  className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group"
                >
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => navigate(`/patients/${p.id}`)}
                      className="flex items-center gap-3 text-left min-w-0"
                    >
                      <div className={`w-8 h-8 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {initials(p.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {p.name}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">ID #{p.id}</div>
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 tabular-nums">{p.age ?? '—'}</td>
                  <td className="px-4 py-3.5">
                    {p.gender ? (
                      <span className={`badge capitalize ${genderClass(p.gender)}`}>{p.gender}</span>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 tabular-nums">
                    {p.height_cm ? `${p.height_cm} cm` : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs max-w-[180px] truncate">
                    {p.notes || '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button
                        onClick={() => navigate(`/patients/${p.id}`)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                        title="View patient"
                      >
                        <ChevronRight size={14} />
                      </button>
                      <Link
                        to={`/patients/${p.id}/edit`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </motion.div>
  )
}
