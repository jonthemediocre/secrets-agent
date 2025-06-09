import { ReactNode } from 'react'

interface GovernanceLayoutProps {
  children: ReactNode
}

export default function GovernanceLayout({ children }: GovernanceLayoutProps) {
  return (
    <div className="governance-layout">
      <div className="container mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  )
}