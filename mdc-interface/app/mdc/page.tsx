'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ChartBarIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CogIcon,
  EyeIcon,
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SparklesIcon,
  BoltIcon,
  CommandLineIcon,
  FolderIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
)

interface MDCStats {
  totalRules: number
  validRules: number
  invalidRules: number
  warningRules: number
  ruleTypes: {
    always: number
    auto: number
    agent: number
    manual: number
  }
  folders: {
    name: string
    count: number
    health: number
  }[]
  recentActivity: {
    timestamp: string
    action: string
    rule: string
    status: 'success' | 'warning' | 'error'
  }[]
  systemHealth: {
    overall: number
    validator: boolean
    generator: boolean
    monitor: boolean
    migration: boolean
  }
}

// Mock data fetcher - replace with actual API call
const fetchMDCStats = async (): Promise<MDCStats> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return {
    totalRules: 636,
    validRules: 589,
    invalidRules: 32,
    warningRules: 15,
    ruleTypes: {
      always: 324,
      auto: 156,
      agent: 89,
      manual: 67,
    },
    folders: [
      { name: 'core', count: 128, health: 95 },
      { name: 'language', count: 98, health: 89 },
      { name: 'framework', count: 87, health: 92 },
      { name: 'testing', count: 76, health: 88 },
      { name: 'workflow', count: 65, health: 94 },
      { name: 'security', count: 54, health: 97 },
      { name: 'performance', count: 43, health: 91 },
      { name: 'documentation', count: 45, health: 85 },
      { name: 'deployment', count: 40, health: 93 },
    ],
    recentActivity: [
      { timestamp: '2024-01-15T10:30:00Z', action: 'Rule Created', rule: 'typescript-strict-mode', status: 'success' },
      { timestamp: '2024-01-15T10:15:00Z', action: 'Validation Run', rule: 'batch-validation', status: 'warning' },
      { timestamp: '2024-01-15T10:00:00Z', action: 'Rule Updated', rule: 'react-hooks-deps', status: 'success' },
      { timestamp: '2024-01-15T09:45:00Z', action: 'Migration Complete', rule: 'legacy-rules-migration', status: 'success' },
      { timestamp: '2024-01-15T09:30:00Z', action: 'Auto-fix Applied', rule: 'eslint-config', status: 'success' },
    ],
    systemHealth: {
      overall: 94,
      validator: true,
      generator: true,
      monitor: true,
      migration: true,
    }
  }
}

export default function MDCDashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')
  const queryClient = useQueryClient()

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['mdc-stats', selectedTimeRange],
    queryFn: fetchMDCStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Force refresh function
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['mdc-stats'] })
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return <ErrorState onRetry={handleRefresh} />
  }

  if (!stats) {
    return <ErrorState onRetry={handleRefresh} />
  }

  const healthPercentage = Math.round((stats.validRules / stats.totalRules) * 100)
  const overallStatus = healthPercentage >= 95 ? 'excellent' : healthPercentage >= 85 ? 'good' : healthPercentage >= 70 ? 'warning' : 'critical'

  return (
    <div className="content-width py-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 text-gradient-primary">
            MDC Rule Dashboard
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Manage and monitor your Markdown with Context rules
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <TimeRangeSelector value={selectedTimeRange} onChange={setSelectedTimeRange} />
          <button
            onClick={handleRefresh}
            className="btn-secondary"
            title="Refresh data"
          >
            <ArrowUpIcon className="w-4 h-4" />
            Refresh
          </button>
          <Link href="/mdc/rules/create" className="btn-primary">
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Rule
          </Link>
        </div>
      </motion.div>

      {/* System Health Alert */}
      <SystemHealthAlert health={stats.systemHealth} />

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <MetricCard
          title="Total Rules"
          value={stats.totalRules}
          icon={DocumentTextIcon}
          trend={{ value: 12, isPositive: true }}
          color="primary"
        />
        <MetricCard
          title="Health Score"
          value={`${healthPercentage}%`}
          icon={ShieldCheckIcon}
          trend={{ value: 3, isPositive: true }}
          color={overallStatus === 'excellent' ? 'success' : overallStatus === 'good' ? 'primary' : 'warning'}
        />
        <MetricCard
          title="Valid Rules"
          value={stats.validRules}
          icon={CheckCircleIcon}
          trend={{ value: 8, isPositive: true }}
          color="success"
        />
        <MetricCard
          title="Issues"
          value={stats.invalidRules + stats.warningRules}
          icon={ExclamationTriangleIcon}
          trend={{ value: 5, isPositive: false }}
          color="warning"
        />
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Rule Types Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1"
        >
          <RuleTypesChart data={stats.ruleTypes} />
        </motion.div>

        {/* Folder Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <FolderHealthChart folders={stats.folders} />
        </motion.div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <QuickActions />
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <RecentActivity activities={stats.recentActivity} />
        </motion.div>
      </div>

      {/* System Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <SystemStatus health={stats.systemHealth} />
      </motion.div>
    </div>
  )
}

// Components
function DashboardSkeleton() {
  return (
    <div className="content-width py-8 space-y-8">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card">
            <div className="card-body">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card">
            <div className="card-body">
              <div className="animate-pulse">
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="content-width py-8">
      <div className="text-center">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-warning-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Unable to load dashboard</h3>
        <p className="mt-1 text-sm text-gray-500">There was an error loading the MDC dashboard data.</p>
        <div className="mt-6">
          <button onClick={onRetry} className="btn-primary">
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}

function TimeRangeSelector({ 
  value, 
  onChange 
}: { 
  value: '1h' | '24h' | '7d' | '30d'
  onChange: (value: '1h' | '24h' | '7d' | '30d') => void 
}) {
  const options = [
    { value: '1h', label: '1 Hour' },
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
  ] as const

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as any)}
      className="input-primary py-2 text-sm"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'primary'
}: {
  title: string
  value: string | number
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  trend?: { value: number; isPositive: boolean }
  color?: 'primary' | 'success' | 'warning' | 'error'
}) {
  const colorClasses = {
    primary: 'text-primary-600 bg-primary-50',
    success: 'text-success-600 bg-success-50',
    warning: 'text-warning-600 bg-warning-50',
    error: 'text-error-600 bg-error-50',
  }

  return (
    <div className="card hover-lift">
      <div className="card-body">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-center mt-1">
              <p className="text-2xl font-semibold text-gray-900">{value}</p>
              {trend && (
                <div className={`ml-2 flex items-center text-sm ${
                  trend.isPositive ? 'text-success-600' : 'text-error-600'
                }`}>
                  {trend.isPositive ? (
                    <ArrowUpIcon className="w-4 h-4" />
                  ) : (
                    <ArrowDownIcon className="w-4 h-4" />
                  )}
                  <span className="ml-1">{trend.value}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SystemHealthAlert({ health }: { health: MDCStats['systemHealth'] }) {
  const isHealthy = health.overall >= 90
  
  if (isHealthy) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-warning-50 border border-warning-200 rounded-lg p-4"
    >
      <div className="flex">
        <ExclamationTriangleIcon className="h-5 w-5 text-warning-400" />
        <div className="ml-3">
          <h3 className="text-sm font-medium text-warning-800">
            System Health Warning
          </h3>
          <p className="mt-1 text-sm text-warning-700">
            Overall system health is at {health.overall}%. Some components may need attention.
          </p>
          <div className="mt-3">
            <Link href="/mdc/monitoring" className="btn-warning text-xs">
              View Details
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function RuleTypesChart({ data }: { data: MDCStats['ruleTypes'] }) {
  const chartData = {
    labels: ['Always', 'Auto', 'Agent', 'Manual'],
    datasets: [
      {
        data: [data.always, data.auto, data.agent, data.manual],
        backgroundColor: [
          'rgb(239 68 68)',
          'rgb(59 130 246)',
          'rgb(147 51 234)',
          'rgb(245 158 11)',
        ],
        borderColor: [
          'rgb(220 38 38)',
          'rgb(37 99 235)',
          'rgb(126 34 206)',
          'rgb(217 119 6)',
        ],
        borderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: 'Rule Types Distribution',
        font: {
          size: 16,
          weight: 'bold',
        },
        padding: 20,
      },
    },
  }

  return (
    <div className="card">
      <div className="card-body">
        <div style={{ height: '300px' }}>
          <Doughnut data={chartData} options={options} />
        </div>
      </div>
    </div>
  )
}

function FolderHealthChart({ folders }: { folders: MDCStats['folders'] }) {
  const chartData = {
    labels: folders.map(f => f.name),
    datasets: [
      {
        label: 'Health Score',
        data: folders.map(f => f.health),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        borderRadius: 4,
      },
      {
        label: 'Rule Count',
        data: folders.map(f => f.count),
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
        borderRadius: 4,
        yAxisID: 'y1',
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Folders',
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Health Score (%)',
        },
        min: 0,
        max: 100,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Rule Count',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    plugins: {
      title: {
        display: true,
        text: 'Folder Health & Rule Distribution',
        font: {
          size: 16,
          weight: 'bold',
        },
        padding: 20,
      },
      legend: {
        position: 'top' as const,
      },
    },
  }

  return (
    <div className="card">
      <div className="card-body">
        <div style={{ height: '300px' }}>
          <Bar data={chartData} options={options} />
        </div>
      </div>
    </div>
  )
}

function QuickActions() {
  const actions = [
    {
      name: 'Create Rule',
      description: 'Create a new MDC rule',
      href: '/mdc/rules/create',
      icon: PlusIcon,
      color: 'primary',
    },
    {
      name: 'Validate Rules',
      description: 'Run validation on all rules',
      href: '/mdc/validate',
      icon: ShieldCheckIcon,
      color: 'success',
    },
    {
      name: 'Browse Rules',
      description: 'View and manage existing rules',
      href: '/mdc/rules',
      icon: FolderIcon,
      color: 'primary',
    },
    {
      name: 'System Monitor',
      description: 'Monitor system health',
      href: '/mdc/monitoring',
      icon: EyeIcon,
      color: 'warning',
    },
    {
      name: 'Tools',
      description: 'Access MDC tools',
      href: '/mdc/tools',
      icon: CogIcon,
      color: 'gray',
    },
  ]

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
      </div>
      <div className="card-body p-0">
        <div className="divide-y divide-gray-200">
          {actions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              className="block p-4 hover:bg-gray-50 transition-colors duration-150"
            >
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${
                  action.color === 'primary' ? 'bg-primary-50 text-primary-600' :
                  action.color === 'success' ? 'bg-success-50 text-success-600' :
                  action.color === 'warning' ? 'bg-warning-50 text-warning-600' :
                  'bg-gray-50 text-gray-600'
                }`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{action.name}</p>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function RecentActivity({ activities }: { activities: MDCStats['recentActivity'] }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="w-4 h-4 text-success-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="w-4 h-4 text-warning-500" />
      case 'error':
        return <ExclamationTriangleIcon className="w-4 h-4 text-error-500" />
      default:
        return <ClockIcon className="w-4 h-4 text-gray-500" />
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ago`
    } else if (minutes > 0) {
      return `${minutes}m ago`
    } else {
      return 'Just now'
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
      </div>
      <div className="card-body p-0">
        <div className="divide-y divide-gray-200">
          {activities.map((activity, index) => (
            <div key={index} className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  {getStatusIcon(activity.status)}
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.action}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTime(activity.timestamp)}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 code-inline">
                    {activity.rule}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card-footer">
        <Link href="/mdc/activity" className="text-sm text-primary-600 hover:text-primary-500">
          View all activity →
        </Link>
      </div>
    </div>
  )
}

function SystemStatus({ health }: { health: MDCStats['systemHealth'] }) {
  const components = [
    { name: 'Validator', status: health.validator, icon: ShieldCheckIcon },
    { name: 'Generator', status: health.generator, icon: SparklesIcon },
    { name: 'Monitor', status: health.monitor, icon: EyeIcon },
    { name: 'Migration', status: health.migration, icon: BoltIcon },
  ]

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">System Status</h3>
          <div className="flex items-center">
            <div className={`status-dot mr-2 ${health.overall >= 95 ? 'status-online' : health.overall >= 80 ? 'status-warning' : 'status-offline'}`}></div>
            <span className="text-sm text-gray-600">{health.overall}% Healthy</span>
          </div>
        </div>
      </div>
      <div className="card-body">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {components.map((component) => (
            <div key={component.name} className="text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${
                component.status ? 'bg-success-100' : 'bg-error-100'
              }`}>
                <component.icon className={`w-6 h-6 ${
                  component.status ? 'text-success-600' : 'text-error-600'
                }`} />
              </div>
              <p className="mt-2 text-sm font-medium text-gray-900">{component.name}</p>
              <p className={`text-xs ${
                component.status ? 'text-success-600' : 'text-error-600'
              }`}>
                {component.status ? 'Online' : 'Offline'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 