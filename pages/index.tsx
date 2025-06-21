import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { 
  Shield, 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Brain,
  Activity,
  Users,
  Database,
  Search,
  Filter,
  Settings,
  Plus,
  MoreHorizontal,
  ChevronRight,
  Star,
  Heart,
  Target
} from 'lucide-react';

// Enhanced Metric Card with micro-interactions
const MetricCard = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon, 
  color = 'blue',
  interactive = true,
  onClick 
}: {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down';
  icon: any;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  interactive?: boolean;
  onClick?: () => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const colorVariants = {
    blue: 'from-blue-500/10 to-blue-600/10 border-blue-500/20',
    green: 'from-green-500/10 to-green-600/10 border-green-500/20',
    purple: 'from-purple-500/10 to-purple-600/10 border-purple-500/20',
    orange: 'from-orange-500/10 to-orange-600/10 border-orange-500/20',
    red: 'from-red-500/10 to-red-600/10 border-red-500/20'
  };

  const iconColorVariants = {
    blue: 'text-blue-500',
    green: 'text-green-500', 
    purple: 'text-purple-500',
    orange: 'text-orange-500',
    red: 'text-red-500'
  };

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br backdrop-blur-sm ${colorVariants[color]} ${
        interactive ? 'cursor-pointer' : ''
      }`}
      whileHover={interactive ? { scale: 1.02, y: -2 } : {}}
      whileTap={interactive ? { scale: 0.98 } : {}}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onTap={() => setIsPressed(true)}
      onClick={onClick}
      layout
    >
      {/* Animated background gradient */}
      <motion.div 
        className={`absolute inset-0 bg-gradient-to-r ${colorVariants[color]} opacity-0`}
        animate={{ opacity: isHovered ? 0.1 : 0 }}
        transition={{ duration: 0.3 }}
      />
      
      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {title}
            </p>
            <div className="flex items-baseline space-x-2">
              <motion.span 
                className="text-3xl font-bold text-gray-900 dark:text-white"
                animate={{ scale: isPressed ? 1.05 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {value}
              </motion.span>
              {change && (
                <motion.div 
                  className={`flex items-center text-sm font-medium ${
                    trend === 'up' ? 'text-green-600' : 
                    trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <TrendingUp className={`mr-1 h-3 w-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
                  {change}%
                </motion.div>
              )}
            </div>
          </div>
          
          <motion.div 
            className={`rounded-full p-3 ${iconColorVariants[color]} bg-white/10 backdrop-blur-sm`}
            animate={{ 
              rotate: isHovered ? 360 : 0,
              scale: isHovered ? 1.1 : 1 
            }}
            transition={{ duration: 0.6, type: "spring" }}
          >
            <Icon className="h-6 w-6" />
          </motion.div>
        </div>

        {/* Progress indicator */}
        <motion.div 
          className="mt-4 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <motion.div 
            className={`h-full bg-gradient-to-r ${colorVariants[color].replace('from-', 'from-').replace('to-', 'to-').replace('/10', '')}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (parseInt(value.replace(/\D/g, '')) / 100) * 100)}%` }}
            transition={{ delay: 0.5, duration: 0.8, type: "spring" }}
          />
        </motion.div>

        {/* Hover overlay */}
        <AnimatePresence>
          {isHovered && interactive && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
              >
                Click for details
                <ChevronRight className="ml-1 h-4 w-4" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Enhanced Search Component with smart suggestions
const SmartSearch = ({ onSearch, suggestions = [], className = "" }: {
  onSearch: (query: string) => void;
  suggestions?: string[];
  className?: string;
}) => {
  const [query, setQuery] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const filteredSuggestions = useMemo(() => 
    suggestions.filter(item => 
      item.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5),
    [query, suggestions]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        setQuery(filteredSuggestions[selectedIndex]);
        onSearch(filteredSuggestions[selectedIndex]);
      } else {
        onSearch(query);
      }
      setIsActive(false);
    } else if (e.key === 'Escape') {
      setIsActive(false);
      setSelectedIndex(-1);
    }
  }, [selectedIndex, filteredSuggestions, onSearch, query]);

  return (
    <div className={`relative ${className}`}>
      <motion.div 
        className="relative"
        animate={{ scale: isActive ? 1.02 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsActive(true)}
          onBlur={() => setTimeout(() => setIsActive(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Search secrets, agents, or configurations..."
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
        
        {query && (
          <motion.button
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setQuery('')}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Plus className="h-3 w-3 rotate-45 text-gray-400" />
          </motion.button>
        )}
      </motion.div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {isActive && filteredSuggestions.length > 0 && (
          <motion.div
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-50"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {filteredSuggestions.map((suggestion, index) => (
              <motion.button
                key={suggestion}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
                onClick={() => {
                  setQuery(suggestion);
                  onSearch(suggestion);
                  setIsActive(false);
                }}
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="flex items-center">
                  <Search className="h-4 w-4 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {suggestion}
                  </span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Enhanced Action Button with success states
const ActionButton = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  loading = false,
  success = false,
  onClick = () => {},
  icon: Icon,
  className = "",
  ...props 
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  success?: boolean;
  onClick?: () => void;
  icon?: any;
  className?: string;
  [key: string]: any;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const variants = {
    primary: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700',
    secondary: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
    success: 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <motion.button
      className={`
        relative inline-flex items-center justify-center font-medium rounded-xl
        shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      disabled={loading}
      {...props}
    >
      {/* Background glow effect */}
      <motion.div
        className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 blur-xl"
        animate={{ opacity: isHovered ? 0.3 : 0 }}
        transition={{ duration: 0.3 }}
      />

      <div className="relative flex items-center space-x-2">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center"
            >
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            </motion.div>
          ) : success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <CheckCircle className="h-4 w-4" />
            </motion.div>
          ) : Icon ? (
            <motion.div
              key="icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Icon className="h-4 w-4" />
            </motion.div>
          ) : null}
        </AnimatePresence>
        
        <motion.span
          animate={{ opacity: loading ? 0.7 : 1 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.span>
      </div>
    </motion.button>
  );
};

// Enhanced Status Badge with pulse animation
const StatusBadge = ({ status, pulse = false, size = 'md' }: {
  status: 'online' | 'offline' | 'warning' | 'error' | 'learning';
  pulse?: boolean;
  size?: 'sm' | 'md';
}) => {
  const statusConfig = {
    online: { color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', label: 'Online' },
    offline: { color: 'bg-gray-500', text: 'text-gray-700', bg: 'bg-gray-50', label: 'Offline' },
    warning: { color: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50', label: 'Warning' },
    error: { color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', label: 'Error' },
    learning: { color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', label: 'Learning' }
  };

  const config = statusConfig[status] || statusConfig.offline;
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  return (
    <motion.div
      className={`inline-flex items-center rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className={`w-2 h-2 rounded-full mr-2 ${config.color}`}
        animate={pulse ? { scale: [1, 1.2, 1], opacity: [1, 0.8, 1] } : {}}
        transition={pulse ? { duration: 2, repeat: Infinity } : {}}
      />
      {config.label}
    </motion.div>
  );
};

// Main Enhanced Dashboard
export default function EnhancedDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMetric, setSelectedMetric] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const mockSuggestions: string[] = [
    'AWS credentials',
    'API keys rotation',
    'Security agents',
    'Vault synchronization',
    'Agent deployment',
    'System health check'
  ];

  const metrics = [
    { 
      title: 'Active Agents', 
      value: '24', 
      change: '+12', 
      trend: 'up' as const, 
      icon: Brain, 
      color: 'blue' as const
    },
    { 
      title: 'Secrets Managed', 
      value: '1,247', 
      change: '+8', 
      trend: 'up' as const, 
      icon: Shield, 
      color: 'green' as const
    },
    { 
      title: 'System Health', 
      value: '98', 
      change: '+2', 
      trend: 'up' as const, 
      icon: Activity, 
      color: 'purple' as const
    },
    { 
      title: 'Integrations', 
      value: '16', 
      change: '+3', 
      trend: 'up' as const, 
      icon: Zap, 
      color: 'orange' as const
    }
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRefreshing(false);
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // Implement search logic
    console.log('Searching for:', query);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        
        {/* Header with enhanced search */}
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
                VANTA Enterprise Vault
              </motion.h1>
              <motion.p 
                className="text-gray-600 dark:text-gray-300 mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                Manage your enterprise security infrastructure with AI-powered automation
              </motion.p>
            </div>
            
            <div className="flex items-center space-x-4">
              <StatusBadge status="online" pulse={true} />
              <ActionButton
                variant="secondary"
                icon={Settings}
                onClick={() => console.log('Settings')}
              >
                Settings
              </ActionButton>
              <ActionButton
                variant="primary"
                icon={Plus}
                onClick={() => console.log('New Agent')}
              >
                Deploy Agent
              </ActionButton>
            </div>
          </div>

          <SmartSearch 
            onSearch={handleSearch}
            suggestions={mockSuggestions}
            className="max-w-2xl"
          />
        </motion.div>

        {/* Enhanced Metrics Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.6 }}
            >
              <MetricCard
                {...metric}
                onClick={() => setSelectedMetric(metric)}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Quick Actions
            </h2>
            <ActionButton
              variant="secondary"
              size="sm"
              loading={refreshing}
              onClick={handleRefresh}
              icon={Activity}
            >
              Refresh
            </ActionButton>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionButton 
              variant="primary" 
              icon={Shield} 
              className="justify-start"
              onClick={() => console.log('Scan for secrets')}
            >
              Scan for Secrets
            </ActionButton>
            <ActionButton 
              variant="secondary" 
              icon={Users} 
              className="justify-start"
              onClick={() => console.log('Manage teams')}
            >
              Manage Teams
            </ActionButton>
            <ActionButton 
              variant="secondary" 
              icon={Database} 
              className="justify-start"
              onClick={() => console.log('Sync vaults')}
            >
              Sync Vaults
            </ActionButton>
          </div>
        </motion.div>

        {/* Selected Metric Detail */}
        <AnimatePresence>
          {selectedMetric && (
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedMetric.title} Details
                </h3>
                <button
                  onClick={() => setSelectedMetric(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Plus className="h-4 w-4 rotate-45 text-gray-500" />
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Detailed view for {selectedMetric.title} would be implemented here with
                charts, trends, and actionable insights.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 