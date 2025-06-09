'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';
import { navigationItems } from '@/lib/data';

export function Breadcrumb() {
  const pathname = usePathname();
  
  // Get current page info
  const currentPage = navigationItems.find(item => item.href === pathname);
  
  if (pathname === '/') {
    return (
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
        <HomeIcon className="w-4 h-4" />
        <span className="font-medium text-foreground">Dashboard</span>
      </nav>
    );
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
      <Link 
        href="/" 
        className="flex items-center hover:text-foreground transition-colors"
      >
        <HomeIcon className="w-4 h-4" />
      </Link>
      <ChevronRightIcon className="w-4 h-4" />
      <span className="font-medium text-foreground">
        {currentPage?.name || 'Page'}
      </span>
    </nav>
  );
} 