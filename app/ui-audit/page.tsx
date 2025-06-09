'use client'

import React from 'react'
import { Breadcrumb } from '@/components/breadcrumb'
import { PageHeader } from '@/components/page-header'
import { UIAuditReport } from '@/components/UIAuditReport'

export default function UIAuditPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb />
      
      <PageHeader
        title="UI Interaction Audit"
        description="Comprehensive audit and testing of all interactive elements across the application"
      />

      <UIAuditReport />
    </div>
  )
} 