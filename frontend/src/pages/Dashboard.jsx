import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Plus, Users, Activity, TrendingUp, Calendar, ChevronRight, Trash2, Edit2 } from 'lucide-react'
import { getPatients, deletePatient } from '../api/patients'
import { mockApi, getMockStats } from '../lib/mockData'
import { useAppContext } from '../context/AppContext'
import LoadingSpinner from '../components/shared/LoadingSpinner'

const page = {
  initial: { opacity: 0, y: 16 },
  in: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
  out: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.24 } },
}

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-500',
  'from-cyan-500 to-sky-600',
]

function initials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function genderClass(g) {
  if (g === 'male') return 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30'
  if (g === 'female') return 'bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-500/30'
  return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
}

const STAT_CONFIGS = [
  {
    icon: Users,
    label: 'Total Patients',
    grad: 'from-blue-600 to-indigo-600',
    glow: 'shadow-blue-500/20',
    bg: 'bg-blue-500/10 dark:bg-blue-500/10',
    iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
  },
  {
    icon: Activity,
    label: 'Total Sessions',
    grad: 'from-slate-600 to-slate-700',
    glow: 'shadow-slate-500/20',
    bg: 'bg-slate-100 dark:bg-slate-500/10',
    iconBg: 'bg-gradient-to-br from-slate-500 to-slate-700',
  },
  {
    icon: TrendingUp,
    label: 'Avg Symmetry',
    grad: 'from-emerald-600 to-teal-600',
    glow: 'shadow-emerald-500/20',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
  },
  {
    icon: Calendar,
    label: 'This Month',
    grad: 'from-violet-600 to-purple-600',
    glow: 'shadow-violet-500/20',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
  },
]

function HeroStatCard({ icon: Icon, label, value, iconBg, glow }) {
  return (
    <motion.div variants={item} className={`card p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform duration-200`}>
      <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center shrink-0 shadow-lg ${glow}`}>
        <Icon size={20} className="text-white" strokeWidth={2} />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-none tabular-nums">
          {value}
        </div>
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{label}</div>
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
    { ...STAT_CONFIGS[0], value: stats.totalPatients },
    { ...STAT_CONFIGS[1], value: stats.totalSessions },
    { ...STAT_CONFIGS[2], value: stats.avgSymmetry },
    { ...STAT_CONFIGS[3], value: stats.thisMonth },
  ]

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <LoadingSpinner size="lg" label="Loading patients..." />

  return (
    <motion.div initial="initial" animate="in" exit="out" variants={page}>
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Patient Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {patients.length} patient{patients.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <Link to="/patients/new" className="btn-primary">
          <Plus size={15} />
          New Patient
        </Link>
      </div>

      {error && (
        <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 rounded-2xl text-sm">
          {error}
        </div>
      )}

      {/* Hero stat cards */}
      <motion.div
        className="grid grid-cols-4 gap-4 mb-7"
        variants={list}
        initial="hidden"
        animate="show"
      >
        {statCards.map(s => <HeroStatCard key={s.label} {...s} />)}
      </motion.div>

      {/* Search + table header */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative max-w-xs w-full">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10 py-2.5 text-sm"
          />
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table / Empty state */}
      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Users size={28} className="text-slate-400" />
          </div>
          <div>
            <p className="font-bold text-slate-700 dark:text-slate-200 text-base">No patients found</p>
            <p className="text-sm text-slate-400 mt-1">
              {search ? 'Try a different search term' : 'Create your first patient to get started'}
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
              <tr className="border-b border-slate-100 dark:border-slate-700/70 bg-slate-50/60 dark:bg-white/[0.02]">
                <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.08em]">Patient</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.08em]">Age</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.08em]">Gender</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.08em]">Height</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.08em]">Notes</th>
                <th className="px-4 py-3.5 w-28" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <motion.tr
                  key={p.id}
                  variants={item}
                  className="border-b border-slate-50 dark:border-slate-700/40 last:border-0 hover:bg-blue-50/40 dark:hover:bg-blue-500/5 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/patients/${p.id}`)}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
                        {initials(p.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">ID #{p.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300 tabular-nums font-medium">{p.age ?? '—'}</td>
                  <td className="px-4 py-4">
                    {p.gender ? (
                      <span className={`badge capitalize text-[11px] ${genderClass(p.gender)}`}>{p.gender}</span>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300 tabular-nums font-medium">
                    {p.height_cm ? `${p.height_cm} cm` : '—'}
                  </td>
                  <td className="px-4 py-4 text-slate-400 text-xs max-w-[180px] truncate italic">
                    {p.notes || '—'}
                  </td>
                  <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button
                        onClick={() => navigate(`/patients/${p.id}`)}
                        className="p-2 rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                        title="View patient"
                      >
                        <ChevronRight size={14} />
                      </button>
                      <button
                        onClick={() => navigate(`/patients/${p.id}/edit`)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
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
