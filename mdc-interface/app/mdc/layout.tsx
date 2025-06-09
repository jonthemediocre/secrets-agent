'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HomeIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  EyeIcon,
  CogIcon,
  FolderIcon,
  PlusIcon,
  BeakerIcon,
  ChartBarIcon,
  BoltIcon,
  Bars3Icon,
  XMarkIcon,
  CommandLineIcon,
  SparklesIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { 
  HomeIcon as HomeIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  ShieldCheckIcon as ShieldCheckIconSolid,
  EyeIcon as EyeIconSolid,
  CogIcon as CogIconSolid,
  FolderIcon as FolderIconSolid,
  BeakerIcon as BeakerIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  BoltIcon as BoltIconSolid,
  CommandLineIcon as CommandLineIconSolid,
  SparklesIcon as SparklesIconSolid,
  ClockIcon as ClockIconSolid,
} from '@heroicons/react/24/solid'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  iconSolid: React.ComponentType<React.SVGProps<SVGSVGElement>>
  description: string
  badge?: string
  children?: NavigationItem[]
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/mdc',
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
    description: 'Overview and system health',
  },
  {
    name: 'Rules',
    href: '/mdc/rules',
    icon: DocumentTextIcon,
    iconSolid: DocumentTextIconSolid,
    description: 'Browse and manage rules',
    children: [
      {
        name: 'All Rules',
        href: '/mdc/rules',
        icon: DocumentTextIcon,
        iconSolid: DocumentTextIconSolid,
        description: 'View all rules',
      },
      {
        name: 'Create Rule',
        href: '/mdc/rules/create',
        icon: PlusIcon,
        iconSolid: PlusIcon,
        description: 'Create a new rule',
      },
      {
        name: 'Categories',
        href: '/mdc/rules/categories',
        icon: FolderIcon,
        iconSolid: FolderIconSolid,
        description: 'Browse by category',
      },
    ],
  },
  {
    name: 'Validation',
    href: '/mdc/validate',
    icon: ShieldCheckIcon,
    iconSolid: ShieldCheckIconSolid,
    description: 'Rule validation and health',
    children: [
      {
        name: 'Run Validation',
        href: '/mdc/validate',
        icon: ShieldCheckIcon,
        iconSolid: ShieldCheckIconSolid,
        description: 'Validate all rules',
      },
      {
        name: 'Validation Reports',
        href: '/mdc/validate/reports',
        icon: ChartBarIcon,
        iconSolid: ChartBarIconSolid,
        description: 'View validation history',
      },
      {
        name: 'Auto-Fix',
        href: '/mdc/validate/autofix',
        icon: SparklesIcon,
        iconSolid: SparklesIconSolid,
        description: 'Automatically fix issues',
      },
    ],
  },
  {
    name: 'Monitoring',
    href: '/mdc/monitoring',
    icon: EyeIcon,
    iconSolid: EyeIconSolid,
    description: 'Real-time system monitoring',
    children: [
      {
        name: 'Live Monitor',
        href: '/mdc/monitoring',
        icon: EyeIcon,
        iconSolid: EyeIconSolid,
        description: 'Real-time monitoring',
      },
      {
        name: 'Activity Log',
        href: '/mdc/monitoring/activity',
        icon: ClockIcon,
        iconSolid: ClockIconSolid,
        description: 'View system activity',
      },
      {
        name: 'System Health',
        href: '/mdc/monitoring/health',
        icon: BeakerIcon,
        iconSolid: BeakerIconSolid,
        description: 'Health diagnostics',
      },
    ],
  },
  {
    name: 'Tools',
    href: '/mdc/tools',
    icon: CogIcon,
    iconSolid: CogIconSolid,
    description: 'MDC management tools',
    children: [
      {
        name: 'Rule Generator',
        href: '/mdc/tools/generator',
        icon: SparklesIcon,
        iconSolid: SparklesIconSolid,
        description: 'Generate rules from prompts',
      },
      {
        name: 'Migration',
        href: '/mdc/tools/migration',
        icon: BoltIcon,
        iconSolid: BoltIconSolid,
        description: 'Migrate existing rules',
      },
      {
        name: 'Bulk Operations',
        href: '/mdc/tools/bulk',
        icon: CommandLineIcon,
        iconSolid: CommandLineIconSolid,
        description: 'Batch rule operations',
      },
    ],
  },
]

export default function MDCLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Check if current path matches navigation item
  const isActive = (href: string) => {
    if (href === '/mdc') {
      return pathname === '/mdc'
    }
    return pathname.startsWith(href)
  }

  // Find current navigation item for breadcrumb
  const findCurrentNavItem = (): NavigationItem | null => {
    for (const item of navigation) {
      if (isActive(item.href)) {
        if (item.children) {
          for (const child of item.children) {
            if (isActive(child.href)) {
              return child
            }
          }
        }
        return item
      }
    }
    return null
  }

  const currentNavItem = findCurrentNavItem()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex w-80 flex-col">
          <Sidebar navigation={navigation} isActive={isActive} />
        </div>
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-80 lg:hidden"
          >
            <Sidebar
              navigation={navigation}
              isActive={isActive}
              onClose={() => setIsSidebarOpen(false)}
              isMobile
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                type="button"
                className="mr-4 text-gray-500 hover:text-gray-600 lg:hidden"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Bars3Icon className="h-6 w-6" />
              </button>

              {/* Breadcrumb */}
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-4">
                  <li>
                    <div>
                      <Link
                        href="/mdc"
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <HomeIcon className="h-5 w-5 flex-shrink-0" />
                        <span className="sr-only">MDC Home</span>
                      </Link>
                    </div>
                  </li>
                  {currentNavItem && currentNavItem.href !== '/mdc' && (
                    <li>
                      <div className="flex items-center">
                        <svg
                          className="h-5 w-5 flex-shrink-0 text-gray-300"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                        </svg>
                        <span className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700">
                          {currentNavItem.name}
                        </span>
                      </div>
                    </li>
                  )}
                </ol>
              </nav>
            </div>

            {/* Header actions */}
            <div className="flex items-center space-x-4">
              <SystemStatusIndicator />
              <QuickActionsMenu />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}

// Sidebar component
function Sidebar({
  navigation,
  isActive,
  onClose,
  isMobile = false,
}: {
  navigation: NavigationItem[]
  isActive: (href: string) => boolean
  onClose?: () => void
  isMobile?: boolean
}) {
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (name: string) => {
    setExpandedItems(prev =>
      prev.includes(name)
        ? prev.filter(item => item !== name)
        : [...prev, name]
    )
  }

  return (
    <div className="flex h-full flex-col bg-white border-r border-gray-200 shadow-lg">
      {/* Sidebar header */}
      <div className="flex h-16 flex-shrink-0 items-center justify-between px-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
            <DocumentTextIcon className="h-5 w-5 text-white" />
          </div>
          <h1 className="ml-3 text-xl font-bold text-gray-900">MDC Manager</h1>
        </div>
        {isMobile && onClose && (
          <button
            type="button"
            className="text-gray-400 hover:text-gray-500"
            onClick={onClose}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-4 overflow-y-auto scrollbar-thin">
        {navigation.map((item) => (
          <NavigationItem
            key={item.name}
            item={item}
            isActive={isActive}
            expanded={expandedItems.includes(item.name)}
            onToggleExpanded={() => toggleExpanded(item.name)}
            onClose={onClose}
          />
        ))}
      </nav>

      {/* Sidebar footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center">
          <div className="status-online mr-2"></div>
          <div className="text-sm">
            <p className="font-medium text-gray-900">System Online</p>
            <p className="text-gray-500">All services running</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Navigation item component
function NavigationItem({
  item,
  isActive,
  expanded,
  onToggleExpanded,
  onClose,
}: {
  item: NavigationItem
  isActive: (href: string) => boolean
  expanded: boolean
  onToggleExpanded: () => void
  onClose?: () => void
}) {
  const active = isActive(item.href)
  const hasChildren = item.children && item.children.length > 0
  const Icon = active ? item.iconSolid : item.icon

  return (
    <div>
      {hasChildren ? (
        <button
          onClick={onToggleExpanded}
          className={`group flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-all duration-200 ${
            active
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${
            active ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
          }`} />
          <span className="flex-1">{item.name}</span>
          <svg
            className={`ml-2 h-4 w-4 transition-transform duration-200 ${
              expanded ? 'rotate-90' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ) : (
        <Link
          href={item.href}
          onClick={onClose}
          className={`group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
            active
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${
            active ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
          }`} />
          <span>{item.name}</span>
          {item.badge && (
            <span className="ml-auto rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-700">
              {item.badge}
            </span>
          )}
        </Link>
      )}

      {/* Children */}
      <AnimatePresence>
        {hasChildren && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-4 mt-2 space-y-1 overflow-hidden"
          >
            {item.children?.map((child) => (
              <Link
                key={child.name}
                href={child.href}
                onClick={onClose}
                className={`group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive(child.href)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <child.icon className={`mr-3 h-4 w-4 flex-shrink-0 ${
                  isActive(child.href) ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                }`} />
                <span>{child.name}</span>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// System status indicator
function SystemStatusIndicator() {
  return (
    <div className="flex items-center">
      <div className="status-online mr-2"></div>
      <span className="text-sm text-gray-600 hidden sm:inline">System Healthy</span>
    </div>
  )
}

// Quick actions menu
function QuickActionsMenu() {
  const [isOpen, setIsOpen] = useState(false)

  const actions = [
    { name: 'Create Rule', href: '/mdc/rules/create', icon: PlusIcon },
    { name: 'Run Validation', href: '/mdc/validate', icon: ShieldCheckIcon },
    { name: 'View Tools', href: '/mdc/tools', icon: CogIcon },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-primary"
        title="Quick Actions"
      >
        <PlusIcon className="h-4 w-4" />
        <span className="hidden sm:ml-2 sm:inline">Quick Actions</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="filter-dropdown"
          >
            <div className="py-1">
              {actions.map((action) => (
                <Link
                  key={action.name}
                  href={action.href}
                  onClick={() => setIsOpen(false)}
                  className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <action.icon className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                  {action.name}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
} 