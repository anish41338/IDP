import { NavLink } from 'react-router-dom'
import { Users, UserPlus, Activity } from 'lucide-react'
import { useAppContext } from '../../context/AppContext'

const navItems = [
  { to: '/patients', label: 'Patients', icon: Users, end: true },
  { to: '/patients/new', label: 'New Patient', icon: UserPlus, end: false },
]

export default function Sidebar() {
  const { demoMode } = useAppContext()

  return (
    <aside className="w-56 bg-slate-900 text-white flex flex-col border-r border-slate-800 shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <Activity size={15} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate">ClinAssess</div>
            <div className="text-[10px] text-slate-500 truncate">Body Assessment Tool</div>
          </div>
        </div>

        {demoMode && (
          <div className="mt-3 px-2.5 py-1.5 bg-blue-950/60 border border-blue-800/60 rounded-lg">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
              <span className="text-[10px] font-semibold text-blue-300 tracking-wide">DEMO MODE ACTIVE</span>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2">
          Navigation
        </p>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-800">
        <p className="text-[10px] text-slate-700 text-center">v1.0 · Local POC</p>
      </div>
    </aside>
  )
}
