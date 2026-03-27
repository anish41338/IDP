import { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem('darkMode')) ?? false }
    catch { return false }
  })

  const [demoMode, setDemoMode] = useState(() => {
    try { return JSON.parse(localStorage.getItem('demoMode')) ?? true }
    catch { return true }
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  useEffect(() => {
    localStorage.setItem('demoMode', JSON.stringify(demoMode))
  }, [demoMode])

  return (
    <AppContext.Provider value={{
      darkMode,
      toggleDarkMode: () => setDarkMode(d => !d),
      demoMode,
      toggleDemoMode: () => setDemoMode(d => !d),
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}
