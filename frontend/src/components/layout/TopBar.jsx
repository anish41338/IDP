import { useLocation } from 'react-router-dom'
import { Sun, Moon, FlaskConical } from 'lucide-react'
import { useAppContext } from '../../context/AppContext'

function getTitle(pathname) {
  if (pathname === '/patients') return 'Patients'
  if (pathname === '/patients/new') return 'New Patient'
  if (pathname.includes('/sessions/new')) return 'New Measurement Session'
  if (pathname.includes('/edit')) return 'Edit Patient'
  if (/\/patients\/\d+$/.test(pathname)) return 'Patient Detail'
  if (/\/sessions\/\d+$/.test(pathname)) return 'Session Detail'
  return 'Dashboard'
}

export default function TopBar() {
  const { darkMode, toggleDarkMode, demoMode, toggleDemoMode } = useAppContext()
  const location = useLocation()

  return (
    <header className="h-14 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 flex items-center justify-between shrink-0 z-10">
      <h1 className="text-sm font-semibold text-slate-700 dark:text-slate-200 tracking-wide">
        {getTitle(location.pathname)}
      </h1>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleDemoMode}
          title={demoMode ? 'Disable demo mode' : 'Enable demo mode'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
            demoMode
              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
              : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-300'
          }`}
        >
          <FlaskConical size={11} />
          Demo {demoMode ? 'ON' : 'OFF'}
        </button>

        <button
          onClick={toggleDarkMode}
          title={darkMode ? 'Light mode' : 'Dark mode'}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          {darkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  )
}
