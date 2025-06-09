import { ReactNode } from 'react'

interface SymbolicLayoutProps {
  children: ReactNode
}

export default function SymbolicLayout({ children }: SymbolicLayoutProps) {
  return (
    <div className="symbolic-layout">
      <div className="container mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  )
}