/**
 * ThemeContext.jsx — React Context for Dark/Light Mode Theme Toggle
 *
 * Manages theme state ('dark' or 'light').
 * Defaults to 'dark' mode on every fresh page load (state-based, no localStorage).
 * Toggles the 'dark' or 'light' CSS class on document.documentElement.
 */

import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  // Default to dark mode on every fresh page load
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }, [theme])

  function toggleTheme() {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    return { theme: 'dark', toggleTheme: () => {}, setTheme: () => {} }
  }
  return context
}
