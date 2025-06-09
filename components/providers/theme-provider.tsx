'use client'

import React, { useState, useEffect } from 'react'
import { SideNav } from '@/components/side-nav'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)

  // Fix theme persistence
  useEffect(() => {
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    
    setIsDarkMode(prefersDark)
    
    // Apply theme immediately to prevent flickering
    if (prefersDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    setIsHydrated(true)
  }, [])

  // Save theme preference when it changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
      if (isDarkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [isDarkMode, isHydrated])

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  return (
    <div className="min-h-screen bg-background">
      <SideNav isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      <div className="ml-64">
        {children}
      </div>
    </div>
  )
} 