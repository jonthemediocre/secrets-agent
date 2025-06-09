'use client';

import React from 'react';
import { Breadcrumb } from './breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  showSearch?: boolean;
}

export function PageHeader({ title, description, children, showSearch = true }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4">
      <div className="space-y-4">
        {/* Breadcrumb */}
        <Breadcrumb />
        
        {/* Title and Actions */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {showSearch && (
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="pl-10 w-64"
                  suppressHydrationWarning={true}
                />
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </header>
  );
} 