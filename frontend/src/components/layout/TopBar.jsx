import { useLocation } from 'react-router-dom'
import { Sun, Moon, FlaskConical } from 'lucide-react'
import { useAppContext } from '../../context/AppContext'

function getTitle(pathname) {
  if (pathname === '/patients') return 'Patient Dashboard'
  if (pathname === '/patients/new') return 'New Patient'
  if (pathname.includes('/sessions/new')) return 'New Session'
  if (pathname.includes('/edit')) return 'Edit Patient'
  if (pathname.includes('/monitor')) return 'Live Monitor'
  if (/\/patients\/\d+$/.test(pathname)) return 'Patient Detail'
  if (/\/sessions\/\d+$/.test(pathname)) return 'Session Detail'
  return 'Dashboard'
}

export default function TopBar() {
  const { darkMode, toggleDarkMode, demoMode, toggleDemoMode } = useAppContext()
  const location = useLocation()

  return (
    <header className="h-14 bg-white/80 dark:bg-[#0d1117]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-white/[0.06] px-6 flex items-center justify-between shrink-0 z-10">
      <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 tracking-wide">
        {getTitle(location.pathname)}
      </h2>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleDemoMode}
          title={demoMode ? 'Disable demo mode' : 'Enable demo mode'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 ${
            demoMode
              ? 'bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/30'
              : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-300'
          }`}
        >
          <FlaskConical size={11} />
          Demo {demoMode ? 'ON' : 'OFF'}
        </button>

        <button
          onClick={toggleDarkMode}
          title={darkMode ? 'Light mode' : 'Dark mode'}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        >
          {darkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  )
}
