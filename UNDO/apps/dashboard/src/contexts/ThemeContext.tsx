'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('dark-mode')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (savedTheme === '1' || (!savedTheme && prefersDark)) {
      setIsDark(true)
      document.body.classList.add('dark-mode')
    } else {
      setIsDark(false)
      document.body.classList.remove('dark-mode')
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    
    if (newTheme) {
      document.body.classList.add('dark-mode')
      localStorage.setItem('dark-mode', '1')
    } else {
      document.body.classList.remove('dark-mode')
      localStorage.setItem('dark-mode', '0')
    }
  }

  const value = {
    isDark,
    toggleTheme
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
