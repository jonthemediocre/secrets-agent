import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Shield,
  Cloud,
  Database,
  GitBranch,
  Slack,
  CheckCircle,
  AlertTriangle,
  Clock,
  Plus,
  Settings,
  Activity,
  TrendingUp,
  Users,
  Key,
  Lock,
  Unlock,
  RefreshCw,
  ExternalLink,
  PlayCircle,
  PauseCircle,
  StopCircle,
  BarChart3,
  Cpu,
  Wifi,
  WifiOff,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';

// Integration Card Component
const IntegrationCard = ({
  integration,
  onConnect,
  onDisconnect,
  onConfigure,
  onTest,
  className = ""
}: {
  integration: any;
  onConnect: (integration: any) => void;
  onDisconnect: (integration: any) => void;
  onConfigure: (integration: any) => void;
  onTest: (integration: any) => void;
  className?: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const statusConfig = {
    connected: { 
      color: 'text-green-600', 
      bg: 'bg-green-50', 
      icon: CheckCircle,
      label: 'Connected',
      dot: 'bg-green-500'
    },
    disconnected: { 
      color: 'text-gray-600', 
      bg: 'bg-gray-50', 
      icon: WifiOff,
      label: 'Disconnected',
      dot: 'bg-gray-400'
    },
    connecting: { 
      color: 'text-blue-600', 
      bg: 'bg-blue-50', 
      icon: RefreshCw,
      label: 'Connecting',
      dot: 'bg-blue-500'
    },
    error: { 
      color: 'text-red-600', 
      bg: 'bg-red-50', 
      icon: AlertTriangle,
      label: 'Error',
      dot: 'bg-red-500'
    }
  };

  const config = statusConfig[integration.status] || statusConfig.disconnected;
  const Icon = integration.icon;
  const StatusIcon = config.icon;

  const handleAction = async (action: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
    setIsLoading(false);
    
    switch (action) {
      case 'connect':
        onConnect(integration);
        break;
      case 'disconnect':
        onDisconnect(integration);
        break;
      case 'configure':
        onConfigure(integration);
        break;
      case 'test':
        onTest(integration);
        break;
    }
  };

  return (
    <motion.div
      className={`relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-lg transition-all duration-300 ${className}`}
      whileHover={{ y: -4, scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      layout
    >
      {/* Background Glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0"
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Header */}
      <div className="relative flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          {/* Icon */}
          <motion.div 
            className="relative p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800"
            animate={{ 
              rotate: isHovered ? 360 : 0,
              scale: isHovered ? 1.1 : 1 
            }}
            transition={{ duration: 0.6, type: "spring" }}
          >
            <Icon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
            
            {/* Status Dot */}
            <motion.div 
              className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${config.dot}`}
              animate={{ 
                scale: integration.status === 'connecting' ? [1, 1.2, 1] : 1,
                opacity: integration.status === 'connecting' ? [1, 0.6, 1] : 1 
              }}
              transition={{ duration: 1.5, repeat: integration.status === 'connecting' ? Infinity : 0 }}
            />
          </motion.div>

          {/* Info */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
              {integration.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {integration.description}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.color}`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {config.label}
              </span>
              {integration.version && (
                <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  v{integration.version}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        <motion.button
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <MoreHorizontal className="h-4 w-4 text-gray-500" />
        </motion.button>
      </div>

      {/* Metrics */}
      {integration.metrics && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {Object.entries(integration.metrics).map(([key, value]: [string, any]) => (
            <motion.div
              key={key}
              className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {value.value}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              {value.change && (
                <div className={`text-xs ${value.change > 0 ? 'text-green-600' : 'text-red-600'} flex items-center justify-center mt-1`}>
                  <TrendingUp className={`h-3 w-3 mr-1 ${value.change < 0 ? 'rotate-180' : ''}`} />
                  {Math.abs(value.change)}%
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Configuration Status */}
      {integration.configuration && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Configuration
          </h4>
          <div className="space-y-2">
            {Object.entries(integration.configuration).map(([key, status]: [string, any]) => (
              <div key={key} className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <div className="flex items-center">
                  {status ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center space-x-2">
          {integration.status === 'connected' ? (
            <>
              <motion.button
                className="flex items-center space-x-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                onClick={() => handleAction('test')}
                disabled={isLoading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isLoading ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <PlayCircle className="h-3 w-3" />
                )}
                <span>Test</span>
              </motion.button>
              
              <motion.button
                className="flex items-center space-x-1 px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => handleAction('configure')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Settings className="h-3 w-3" />
                <span>Configure</span>
              </motion.button>
              
              <motion.button
                className="flex items-center space-x-1 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                onClick={() => handleAction('disconnect')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <StopCircle className="h-3 w-3" />
                <span>Disconnect</span>
              </motion.button>
            </>
          ) : (
            <motion.button
              className="flex items-center space-x-1 px-4 py-2 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
              onClick={() => handleAction('connect')}
              disabled={isLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isLoading ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Zap className="h-3 w-3" />
              )}
              <span>Connect</span>
            </motion.button>
          )}
        </div>

        {/* Last Updated */}
        {integration.lastUpdated && (
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <Clock className="h-3 w-3 mr-1" />
            {integration.lastUpdated}
          </div>
        )}
      </motion.div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="absolute inset-0 rounded-2xl bg-white/90 dark:bg-gray-800/90 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Processing...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Stats Summary Component
const StatsSummary = ({ stats }: { stats: any }) => (
  <motion.div 
    className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay: 0.2 }}
  >
    {[
      { 
        label: 'Total Integrations', 
        value: stats.total, 
        icon: Zap, 
        color: 'blue',
        change: '+12%'
      },
      { 
        label: 'Active Connections', 
        value: stats.active, 
        icon: Wifi, 
        color: 'green',
        change: '+8%'
      },
      { 
        label: 'Data Synced', 
        value: `${stats.dataTransferred}TB`, 
        icon: Database, 
        color: 'purple',
        change: '+24%'
      },
      { 
        label: 'API Calls', 
        value: `${stats.apiCalls}M`, 
        icon: Activity, 
        color: 'orange',
        change: '+15%'
      }
    ].map((stat, index) => (
      <motion.div
        key={stat.label}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 + index * 0.1, duration: 0.6 }}
        whileHover={{ y: -2, scale: 1.02 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {stat.value}
            </p>
            <div className="flex items-center mt-2 text-sm text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              {stat.change}
            </div>
          </div>
          <div className={`p-3 rounded-full bg-${stat.color}-50 text-${stat.color}-600`}>
            <stat.icon className="h-5 w-5" />
          </div>
        </div>
      </motion.div>
    ))}
  </motion.div>
);

// Filter and Search Bar
const FilterBar = ({ 
  onSearch, 
  onFilter, 
  className = "" 
}: {
  onSearch: (query: string) => void;
  onFilter: (filters: any) => void;
  className?: string;
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  return (
    <motion.div 
      className={`space-y-4 ${className}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              onSearch(e.target.value);
            }}
            placeholder="Search integrations by name, type, or status..."
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>
        
        {/* Filter Toggle */}
        <motion.button
          className="flex items-center space-x-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          onClick={() => setShowFilters(!showFilters)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
        </motion.button>
        
        {/* Add Integration */}
        <motion.button
          className="flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition-colors"
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="h-4 w-4" />
          <span>Add Integration</span>
        </motion.button>
      </div>

      {/* Expanded Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option>All Statuses</option>
                  <option>Connected</option>
                  <option>Disconnected</option>
                  <option>Error</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option>All Categories</option>
                  <option>Cloud Services</option>
                  <option>Databases</option>
                  <option>Communication</option>
                  <option>Version Control</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Activity
                </label>
                <select className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option>Any Time</option>
                  <option>Last 24 Hours</option>
                  <option>Last Week</option>
                  <option>Last Month</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Main Enhanced Ecosystem Integration
export default function EnhancedEcosystemIntegration() {
  const [integrations, setIntegrations] = useState([
    {
      id: 1,
      name: 'AWS Services',
      description: 'Amazon Web Services integration for cloud resources',
      icon: Cloud,
      status: 'connected',
      version: '2.1.0',
      lastUpdated: '2 hours ago',
      metrics: {
        requests: { value: '12.5K', change: 15 },
        uptime: { value: '99.9%', change: 0.1 },
        latency: { value: '45ms', change: -8 }
      },
      configuration: {
        apiKeys: true,
        webhooks: true,
        encryption: true,
        monitoring: false
      }
    },
    {
      id: 2,
      name: 'GitHub',
      description: 'Version control and repository management',
      icon: GitBranch,
      status: 'connected',
      version: '1.8.2',
      lastUpdated: '1 day ago',
      metrics: {
        repositories: { value: '24', change: 12 },
        commits: { value: '1.2K', change: 8 },
        pullRequests: { value: '156', change: 23 }
      },
      configuration: {
        webhooks: true,
        apiAccess: true,
        sshKeys: true,
        secrets: true
      }
    },
    {
      id: 3,
      name: 'Slack',
      description: 'Team communication and notifications',
      icon: Slack,
      status: 'disconnected',
      version: '3.2.1',
      lastUpdated: '3 days ago',
      metrics: {
        channels: { value: '12', change: 0 },
        messages: { value: '2.1K', change: -5 },
        users: { value: '45', change: 2 }
      },
      configuration: {
        botToken: false,
        webhooks: true,
        permissions: false,
        channels: true
      }
    },
    {
      id: 4,
      name: 'PostgreSQL',
      description: 'Primary database connection',
      icon: Database,
      status: 'connected',
      version: '14.2',
      lastUpdated: '30 minutes ago',
      metrics: {
        connections: { value: '45', change: 5 },
        queries: { value: '8.9K', change: 18 },
        storage: { value: '2.4GB', change: 12 }
      },
      configuration: {
        connection: true,
        ssl: true,
        backups: true,
        monitoring: true
      }
    }
  ]);

  const [filteredIntegrations, setFilteredIntegrations] = useState(integrations);

  const stats = useMemo(() => ({
    total: integrations.length,
    active: integrations.filter(i => i.status === 'connected').length,
    dataTransferred: 45.2,
    apiCalls: 234
  }), [integrations]);

  const handleSearch = useCallback((query: string) => {
    const filtered = integrations.filter(integration =>
      integration.name.toLowerCase().includes(query.toLowerCase()) ||
      integration.description.toLowerCase().includes(query.toLowerCase()) ||
      integration.status.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredIntegrations(filtered);
  }, [integrations]);

  const handleFilter = useCallback((filters: any) => {
    console.log('Applying filters:', filters);
  }, []);

  const handleConnect = useCallback((integration: any) => {
    console.log('Connecting to:', integration.name);
    // Update integration status
    setIntegrations(prev => 
      prev.map(i => i.id === integration.id ? { ...i, status: 'connected' } : i)
    );
  }, []);

  const handleDisconnect = useCallback((integration: any) => {
    console.log('Disconnecting from:', integration.name);
    setIntegrations(prev => 
      prev.map(i => i.id === integration.id ? { ...i, status: 'disconnected' } : i)
    );
  }, []);

  const handleConfigure = useCallback((integration: any) => {
    console.log('Configuring:', integration.name);
  }, []);

  const handleTest = useCallback((integration: any) => {
    console.log('Testing:', integration.name);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        
        {/* Header */}
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <motion.h1 
                className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                Ecosystem Integration
              </motion.h1>
              <motion.p 
                className="text-gray-600 dark:text-gray-300 mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                Manage all your external service connections and data flows
              </motion.p>
            </div>
          </div>
        </motion.div>

        {/* Stats Summary */}
        <StatsSummary stats={stats} />

        {/* Filter Bar */}
        <FilterBar 
          onSearch={handleSearch}
          onFilter={handleFilter}
        />

        {/* Integrations Grid */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <AnimatePresence>
            {filteredIntegrations.map((integration, index) => (
              <motion.div
                key={integration.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
              >
                <IntegrationCard
                  integration={integration}
                  onConnect={handleConnect}
                  onDisconnect={handleDisconnect}
                  onConfigure={handleConfigure}
                  onTest={handleTest}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty State */}
        {filteredIntegrations.length === 0 && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <Zap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No integrations found
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Try adjusting your search or filter criteria
            </p>
            <motion.button
              className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition-colors"
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
            >
              Browse Integration Marketplace
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
} 