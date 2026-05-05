import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AppProvider } from './context/AppContext'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import Dashboard from './pages/Dashboard'
import PatientForm from './pages/PatientForm'
import PatientDetail from './pages/PatientDetail'
import MeasurementSession from './pages/MeasurementSession'
import SessionDetail from './pages/SessionDetail'
import LiveMonitor from './pages/LiveMonitor'
import ErrorBoundary from './components/shared/ErrorBoundary'
import SplashScreen from './components/shared/SplashScreen'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/patients" replace />} />
        <Route path="/patients" element={<Dashboard />} />
        <Route path="/patients/new" element={<PatientForm />} />
        <Route path="/patients/:id" element={<PatientDetail />} />
        <Route path="/patients/:id/edit" element={<PatientForm />} />
        <Route path="/patients/:patientId/sessions/new" element={<MeasurementSession />} />
        <Route path="/patients/:patientId/monitor" element={<LiveMonitor />} />
        <Route path="/sessions/:id" element={<SessionDetail />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false)

  return (
    <>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      <AppProvider>
        <BrowserRouter>
          <div className="flex h-screen bg-slate-100 dark:bg-[#0f1117] overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
              <TopBar />
              <main className="flex-1 overflow-auto">
                <div className="p-6 min-h-full">
                  <ErrorBoundary>
                    <AnimatedRoutes />
                  </ErrorBoundary>
                </div>
              </main>
            </div>
          </div>
        </BrowserRouter>
      </AppProvider>
    </>
  )
}
