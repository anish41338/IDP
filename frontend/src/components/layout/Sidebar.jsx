import { NavLink } from 'react-router-dom'
import { Users, UserPlus, Activity, Cpu, LayoutDashboard } from 'lucide-react'
import { useAppContext } from '../../context/AppContext'

const navItems = [
  { to: '/patients', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/patients/new', label: 'New Patient', icon: UserPlus, end: false },
]

export default function Sidebar() {
  const { demoMode } = useAppContext()

  return (
    <aside className="w-60 bg-[#0d1117] text-white flex flex-col shrink-0 relative border-r border-white/[0.06]">
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/50">
            <Activity size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold text-white tracking-tight">ClinAssess</div>
            <div className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">Posture AI</div>
          </div>
        </div>

        {demoMode && (
          <div className="mt-4 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
              <span className="text-[10px] font-bold text-blue-400 tracking-widest uppercase">Demo Mode</span>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.15em] px-3 mb-3 mt-1">
          Menu
        </p>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={15} className={isActive ? 'text-blue-400' : ''} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Cpu size={11} className="text-slate-700" />
          <p className="text-[10px] text-slate-700 font-medium">v1.0 · IEEE Research</p>
        </div>
      </div>
    </aside>
  )
}
