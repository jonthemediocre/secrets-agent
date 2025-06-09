'use client'

import React, { useState, useEffect } from 'react'
import { SideNav } from '@/components/side-nav'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(true)

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    
    setIsDarkMode(prefersDark)
    
    // Apply theme to document
    if (prefersDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    
    // Save preference and apply theme
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light')
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      <SideNav isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      <main className="flex-1 overflow-auto bg-white dark:bg-gray-900 p-6 ml-64">
        {children}
      </main>
    </div>
  )
} 