import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Key,
  Eye,
  EyeOff,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Clock,
  User,
  Calendar,
  Activity,
  TrendingUp,
  Database,
  Settings
} from 'lucide-react';

// Enhanced Secret Card Component
const SecretCard = ({ 
  secret, 
  onEdit, 
  onDelete, 
  onCopy,
  className = "" 
}: {
  secret: any;
  onEdit: (secret: any) => void;
  onDelete: (secret: any) => void;
  onCopy: (secret: any) => void;
  className?: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColors = {
    active: 'text-green-600 bg-green-50',
    expired: 'text-red-600 bg-red-50',
    expiring: 'text-yellow-600 bg-yellow-50',
    rotated: 'text-blue-600 bg-blue-50'
  };

  return (
    <motion.div
      className={`relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-all duration-200 ${className}`}
      whileHover={{ y: -2, scale: 1.01 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      layout
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <motion.div 
            className="p-2 rounded-lg bg-blue-50 text-blue-600"
            animate={{ rotate: isHovered ? 360 : 0 }}
            transition={{ duration: 0.6 }}
          >
            <Key className="h-4 w-4" />
          </motion.div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {secret.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {secret.type} • {secret.environment}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <motion.span 
            className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[secret.status]}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {secret.status}
          </motion.span>
          
          <motion.button
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <MoreHorizontal className="h-4 w-4 text-gray-500" />
          </motion.button>
        </div>
      </div>

      {/* Secret Value */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Secret Value
          </label>
          <motion.button
            className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
            onClick={() => setIsVisible(!isVisible)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span>{isVisible ? 'Hide' : 'Show'}</span>
          </motion.button>
        </div>
        
        <div className="relative">
          <motion.div 
            className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg font-mono text-sm"
            animate={{ 
              backgroundColor: copied ? '#10B981' : undefined,
              color: copied ? '#ffffff' : undefined 
            }}
            transition={{ duration: 0.2 }}
          >
            {isVisible ? secret.value : '•'.repeat(32)}
          </motion.div>
          
          <motion.button
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            onClick={handleCopy}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Copy className="h-4 w-4 text-gray-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>Created {secret.createdAt}</span>
          </div>
          <div className="flex items-center space-x-1">
            <User className="h-3 w-3" />
            <span>{secret.createdBy}</span>
          </div>
        </div>
        
        {secret.expiresAt && (
          <div className="flex items-center space-x-1 text-yellow-600">
            <Clock className="h-3 w-3" />
            <span>Expires {secret.expiresAt}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <motion.div 
        className="flex items-center space-x-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isHovered ? 1 : 0.7, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.button
          className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          onClick={() => onEdit(secret)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Edit className="h-3 w-3" />
          <span>Edit</span>
        </motion.button>
        
        <motion.button
          className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={handleCopy}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Copy className="h-3 w-3" />
          <span>Copy</span>
        </motion.button>
        
        <motion.button
          className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
          onClick={() => onDelete(secret)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Trash2 className="h-3 w-3" />
          <span>Delete</span>
        </motion.button>
      </motion.div>

      {/* Hover Effect */}
      <motion.div
        className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 pointer-events-none"
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
};

// Enhanced Filter Bar
const FilterBar = ({ 
  onSearch, 
  onFilter, 
  filters, 
  className = "" 
}: {
  onSearch: (query: string) => void;
  onFilter: (filters: any) => void;
  filters: any;
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
            placeholder="Search secrets by name, type, or environment..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>
        
        {/* Filter Toggle */}
        <motion.button
          className="flex items-center space-x-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          onClick={() => setShowFilters(!showFilters)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
        </motion.button>
        
        {/* Add New */}
        <motion.button
          className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="h-4 w-4" />
          <span>Add Secret</span>
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
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <select className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option>All Types</option>
                  <option>API Key</option>
                  <option>Database</option>
                  <option>Certificate</option>
                  <option>Token</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Environment
                </label>
                <select className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option>All Environments</option>
                  <option>Production</option>
                  <option>Staging</option>
                  <option>Development</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option>All Statuses</option>
                  <option>Active</option>
                  <option>Expired</option>
                  <option>Expiring Soon</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Created By
                </label>
                <select className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option>All Users</option>
                  <option>Current User</option>
                  <option>System</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Main Enhanced Secrets Manager
export default function EnhancedSecretsManager() {
  const [secrets, setSecrets] = useState([
    {
      id: 1,
      name: 'AWS_ACCESS_KEY',
      type: 'API Key',
      environment: 'Production',
      value: 'AKIAIOSFODNN7EXAMPLE',
      status: 'active',
      createdAt: '2 days ago',
      createdBy: 'john.doe',
      expiresAt: '30 days'
    },
    {
      id: 2,
      name: 'DATABASE_PASSWORD',
      type: 'Database',
      environment: 'Production',
      value: 'super-secret-password-123',
      status: 'expiring',
      createdAt: '1 week ago',
      createdBy: 'admin',
      expiresAt: '7 days'
    },
    {
      id: 3,
      name: 'STRIPE_SECRET_KEY',
      type: 'API Key',
      environment: 'Production',
      value: 'sk_live_51234567890abcdef',
      status: 'active',
      createdAt: '1 month ago',
      createdBy: 'jane.smith',
      expiresAt: null
    }
  ]);

  const [filteredSecrets, setFilteredSecrets] = useState(secrets);
  const [selectedSecrets, setSelectedSecrets] = useState<number[]>([]);

  const handleSearch = useCallback((query: string) => {
    const filtered = secrets.filter(secret =>
      secret.name.toLowerCase().includes(query.toLowerCase()) ||
      secret.type.toLowerCase().includes(query.toLowerCase()) ||
      secret.environment.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredSecrets(filtered);
  }, [secrets]);

  const handleFilter = useCallback((filters: any) => {
    // Implement filtering logic
    console.log('Applying filters:', filters);
  }, []);

  const handleEdit = useCallback((secret: any) => {
    console.log('Editing secret:', secret);
  }, []);

  const handleDelete = useCallback((secret: any) => {
    console.log('Deleting secret:', secret);
  }, []);

  const handleCopy = useCallback(async (secret: any) => {
    try {
      await navigator.clipboard.writeText(secret.value);
      console.log('Copied secret to clipboard');
    } catch (err) {
      console.error('Failed to copy secret:', err);
    }
  }, []);

  const stats = useMemo(() => ({
    total: secrets.length,
    active: secrets.filter(s => s.status === 'active').length,
    expiring: secrets.filter(s => s.status === 'expiring').length,
    expired: secrets.filter(s => s.status === 'expired').length
  }), [secrets]);

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
                Secrets Manager
              </motion.h1>
              <motion.p 
                className="text-gray-600 dark:text-gray-300 mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                Securely manage and monitor your application secrets
              </motion.p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Secrets', value: stats.total, color: 'blue', icon: Database },
              { label: 'Active', value: stats.active, color: 'green', icon: CheckCircle },
              { label: 'Expiring', value: stats.expiring, color: 'yellow', icon: Clock },
              { label: 'Expired', value: stats.expired, color: 'red', icon: AlertTriangle }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1, duration: 0.6 }}
                whileHover={{ y: -2, scale: 1.02 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full bg-${stat.color}-50 text-${stat.color}-600`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Filter Bar */}
        <FilterBar 
          onSearch={handleSearch}
          onFilter={handleFilter}
          filters={{}}
        />

        {/* Secrets Grid */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <AnimatePresence>
            {filteredSecrets.map((secret, index) => (
              <motion.div
                key={secret.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
              >
                <SecretCard
                  secret={secret}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onCopy={handleCopy}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty State */}
        {filteredSecrets.length === 0 && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No secrets found
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Try adjusting your search or filter criteria
            </p>
            <motion.button
              className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
            >
              Add Your First Secret
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
} 