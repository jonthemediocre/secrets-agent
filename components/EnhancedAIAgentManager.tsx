import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Bot,
  Cpu,
  Activity,
  Play,
  Pause,
  Stop,
  Settings,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Target,
  Users,
  Database,
  Cloud,
  Shield,
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Eye,
  BarChart3,
  Layers,
  Sparkles,
  Code,
  Terminal,
  MessageSquare,
  FileText,
  Gauge
} from 'lucide-react';

// Agent Card Component
const AgentCard = ({
  agent,
  onStart,
  onStop,
  onPause,
  onConfigure,
  onDelete,
  className = ""
}: {
  agent: any;
  onStart: (agent: any) => void;
  onStop: (agent: any) => void;
  onPause: (agent: any) => void;
  onConfigure: (agent: any) => void;
  onDelete: (agent: any) => void;
  className?: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const statusConfig = {
    running: {
      color: 'text-green-600',
      bg: 'bg-green-50',
      dot: 'bg-green-500',
      label: 'Running',
      pulse: true
    },
    paused: {
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      dot: 'bg-yellow-500',
      label: 'Paused',
      pulse: false
    },
    stopped: {
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      dot: 'bg-gray-400',
      label: 'Stopped',
      pulse: false
    },
    error: {
      color: 'text-red-600',
      bg: 'bg-red-50',
      dot: 'bg-red-500',
      label: 'Error',
      pulse: false
    }
  };

  const config = statusConfig[agent.status] || statusConfig.stopped;

  const handleAction = async (action: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
    setIsLoading(false);
    
    switch (action) {
      case 'start':
        onStart(agent);
        break;
      case 'stop':
        onStop(agent);
        break;
      case 'pause':
        onPause(agent);
        break;
    }
  };

  return (
    <motion.div
      className={`relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden ${className}`}
      whileHover={{ y: -4, scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      layout
    >
      {/* Background Gradient */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0"
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Header */}
      <div className="relative flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          {/* Agent Avatar */}
          <motion.div 
            className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
            animate={{ 
              rotate: isHovered ? 360 : 0,
              scale: isHovered ? 1.1 : 1 
            }}
            transition={{ duration: 0.6, type: "spring" }}
          >
            <Brain className="h-8 w-8 text-white" />
            
            {/* Status Indicator */}
            <motion.div 
              className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${config.dot} border-2 border-white`}
              animate={{ 
                scale: config.pulse ? [1, 1.2, 1] : 1,
                opacity: config.pulse ? [1, 0.7, 1] : 1 
              }}
              transition={{ duration: 2, repeat: config.pulse ? Infinity : 0 }}
            />
          </motion.div>

          {/* Agent Info */}
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
              {agent.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {agent.description}
            </p>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.color}`}>
                <motion.div
                  className={`w-2 h-2 rounded-full ${config.dot} mr-1`}
                  animate={{ 
                    scale: config.pulse ? [1, 1.2, 1] : 1,
                    opacity: config.pulse ? [1, 0.8, 1] : 1 
                  }}
                  transition={{ duration: 1.5, repeat: config.pulse ? Infinity : 0 }}
                />
                {config.label}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                v{agent.version}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                {agent.type}
              </span>
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

      {/* Performance Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'CPU', value: `${agent.metrics.cpu}%`, icon: Cpu, trend: agent.metrics.cpuTrend },
          { label: 'Memory', value: `${agent.metrics.memory}MB`, icon: Database, trend: agent.metrics.memoryTrend },
          { label: 'Tasks', value: agent.metrics.tasks, icon: Target, trend: agent.metrics.tasksTrend },
          { label: 'Uptime', value: agent.metrics.uptime, icon: Clock, trend: 0 }
        ].map((metric, index) => (
          <motion.div
            key={metric.label}
            className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
          >
            <div className="flex items-center justify-center mb-1">
              <metric.icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              {metric.value}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {metric.label}
            </div>
            {metric.trend !== 0 && (
              <div className={`text-xs flex items-center justify-center mt-1 ${
                metric.trend > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.trend > 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(metric.trend)}%
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Agent Capabilities */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Capabilities
        </h4>
        <div className="flex flex-wrap gap-2">
          {agent.capabilities.map((capability: string, index: number) => (
            <motion.span
              key={capability}
              className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-full border border-blue-200"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.1 }}
            >
              {capability}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {agent.recentActivity && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Recent Activity
          </h4>
          <div className="space-y-2">
            {agent.recentActivity.slice(0, 3).map((activity: any, index: number) => (
              <motion.div
                key={index}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className={`w-2 h-2 rounded-full ${
                  activity.status === 'success' ? 'bg-green-500' :
                  activity.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <div className="flex-1">
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    {activity.action}
                  </p>
                  <p className="text-xs text-gray-500">
                    {activity.timestamp}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Control Actions */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center space-x-2">
          {agent.status === 'stopped' ? (
            <motion.button
              className="flex items-center space-x-1 px-3 py-2 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
              onClick={() => handleAction('start')}
              disabled={isLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isLoading ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              <span>Start</span>
            </motion.button>
          ) : agent.status === 'running' ? (
            <>
              <motion.button
                className="flex items-center space-x-1 px-3 py-2 text-sm bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors"
                onClick={() => handleAction('pause')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Pause className="h-3 w-3" />
                <span>Pause</span>
              </motion.button>
              
              <motion.button
                className="flex items-center space-x-1 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                onClick={() => handleAction('stop')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Stop className="h-3 w-3" />
                <span>Stop</span>
              </motion.button>
            </>
          ) : (
            <motion.button
              className="flex items-center space-x-1 px-3 py-2 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
              onClick={() => handleAction('start')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play className="h-3 w-3" />
              <span>Resume</span>
            </motion.button>
          )}
          
          <motion.button
            className="flex items-center space-x-1 px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => onConfigure(agent)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings className="h-3 w-3" />
            <span>Configure</span>
          </motion.button>
        </div>

        {/* Last Updated */}
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <Clock className="h-3 w-3 mr-1" />
          {agent.lastUpdated}
        </div>
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
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Processing...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Agent Deployment Modal
const DeploymentModal = ({ 
  isOpen, 
  onClose, 
  onDeploy 
}: {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (config: any) => void;
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [deploymentConfig, setDeploymentConfig] = useState({
    name: '',
    description: '',
    environment: 'production',
    resources: {
      cpu: 2,
      memory: 4096,
      storage: 20
    }
  });

  const agentTemplates = [
    {
      id: 'security-scanner',
      name: 'Security Scanner',
      description: 'Automated security vulnerability scanning',
      icon: Shield,
      capabilities: ['Vulnerability Detection', 'Compliance Checking', 'Risk Assessment'],
      difficulty: 'Beginner'
    },
    {
      id: 'data-processor',
      name: 'Data Processor',
      description: 'Advanced data processing and analysis',
      icon: Database,
      capabilities: ['Data Transformation', 'Pattern Recognition', 'Batch Processing'],
      difficulty: 'Intermediate'
    },
    {
      id: 'ai-assistant',
      name: 'AI Assistant',
      description: 'Intelligent conversational AI agent',
      icon: MessageSquare,
      capabilities: ['Natural Language Processing', 'Context Understanding', 'Task Automation'],
      difficulty: 'Advanced'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Deploy New AI Agent
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Plus className="h-5 w-5 rotate-45 text-gray-500" />
              </button>
            </div>

            {/* Agent Templates */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Choose Agent Template
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {agentTemplates.map((template) => {
                  const Icon = template.icon;
                  return (
                    <motion.div
                      key={template.id}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                          <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {template.name}
                          </h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            template.difficulty === 'Beginner' ? 'bg-green-100 text-green-600' :
                            template.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {template.difficulty}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {template.description}
                      </p>
                      <div className="space-y-1">
                        {template.capabilities.map((capability) => (
                          <div key={capability} className="flex items-center text-xs text-gray-500">
                            <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                            {capability}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Configuration Form */}
            {selectedTemplate && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Configuration
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Agent Name
                    </label>
                    <input
                      type="text"
                      value={deploymentConfig.name}
                      onChange={(e) => setDeploymentConfig(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter agent name..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Environment
                    </label>
                    <select
                      value={deploymentConfig.environment}
                      onChange={(e) => setDeploymentConfig(prev => ({ ...prev, environment: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="development">Development</option>
                      <option value="staging">Staging</option>
                      <option value="production">Production</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={deploymentConfig.description}
                    onChange={(e) => setDeploymentConfig(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Enter agent description..."
                  />
                </div>

                {/* Resource Configuration */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                    Resource Allocation
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        CPU Cores
                      </label>
                      <input
                        type="number"
                        value={deploymentConfig.resources.cpu}
                        onChange={(e) => setDeploymentConfig(prev => ({ 
                          ...prev, 
                          resources: { ...prev.resources, cpu: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="1"
                        max="16"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Memory (MB)
                      </label>
                      <input
                        type="number"
                        value={deploymentConfig.resources.memory}
                        onChange={(e) => setDeploymentConfig(prev => ({ 
                          ...prev, 
                          resources: { ...prev.resources, memory: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="512"
                        max="32768"
                        step="512"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Storage (GB)
                      </label>
                      <input
                        type="number"
                        value={deploymentConfig.resources.storage}
                        onChange={(e) => setDeploymentConfig(prev => ({ 
                          ...prev, 
                          resources: { ...prev.resources, storage: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="10"
                        max="1000"
                        step="10"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <motion.button
                    className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    onClick={onClose}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    onClick={() => onDeploy({ template: selectedTemplate, config: deploymentConfig })}
                    disabled={!deploymentConfig.name}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Deploy Agent
                  </motion.button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Main Enhanced AI Agent Manager
export default function EnhancedAIAgentManager() {
  const [agents, setAgents] = useState([
    {
      id: 1,
      name: 'Security Guardian',
      description: 'Advanced security monitoring and threat detection',
      type: 'Security',
      version: '2.1.0',
      status: 'running',
      lastUpdated: '5 minutes ago',
      capabilities: ['Threat Detection', 'Vulnerability Scanning', 'Compliance Monitoring', 'Risk Assessment'],
      metrics: {
        cpu: 45,
        cpuTrend: 5,
        memory: 2048,
        memoryTrend: -2,
        tasks: '2.4K',
        tasksTrend: 12,
        uptime: '15d 4h'
      },
      recentActivity: [
        { action: 'Detected potential threat', timestamp: '2 min ago', status: 'warning' },
        { action: 'Completed security scan', timestamp: '15 min ago', status: 'success' },
        { action: 'Updated threat signatures', timestamp: '1 hour ago', status: 'success' }
      ]
    },
    {
      id: 2,
      name: 'Data Processor Alpha',
      description: 'High-performance data processing and analysis',
      type: 'Analytics',
      version: '1.9.3',
      status: 'running',
      lastUpdated: '1 hour ago',
      capabilities: ['Data Transformation', 'Pattern Recognition', 'Batch Processing', 'Real-time Analytics'],
      metrics: {
        cpu: 72,
        cpuTrend: 8,
        memory: 4096,
        memoryTrend: 3,
        tasks: '5.8K',
        tasksTrend: 24,
        uptime: '8d 12h'
      },
      recentActivity: [
        { action: 'Processed data batch #1247', timestamp: '10 min ago', status: 'success' },
        { action: 'Generated analytics report', timestamp: '45 min ago', status: 'success' },
        { action: 'Detected data anomaly', timestamp: '2 hours ago', status: 'warning' }
      ]
    },
    {
      id: 3,
      name: 'API Orchestrator',
      description: 'Intelligent API management and optimization',
      type: 'Integration',
      version: '3.0.1',
      status: 'paused',
      lastUpdated: '3 hours ago',
      capabilities: ['API Routing', 'Load Balancing', 'Rate Limiting', 'Performance Optimization'],
      metrics: {
        cpu: 12,
        cpuTrend: -15,
        memory: 1024,
        memoryTrend: -8,
        tasks: '156',
        tasksTrend: -45,
        uptime: '22d 8h'
      },
      recentActivity: [
        { action: 'Paused for maintenance', timestamp: '3 hours ago', status: 'warning' },
        { action: 'Optimized API routes', timestamp: '4 hours ago', status: 'success' },
        { action: 'Balanced server load', timestamp: '6 hours ago', status: 'success' }
      ]
    },
    {
      id: 4,
      name: 'Content Curator',
      description: 'AI-powered content analysis and curation',
      type: 'Content',
      version: '1.5.2',
      status: 'stopped',
      lastUpdated: '1 day ago',
      capabilities: ['Content Analysis', 'Sentiment Detection', 'Topic Classification', 'Quality Assessment'],
      metrics: {
        cpu: 0,
        cpuTrend: 0,
        memory: 0,
        memoryTrend: 0,
        tasks: '0',
        tasksTrend: 0,
        uptime: '0h'
      },
      recentActivity: [
        { action: 'Agent stopped', timestamp: '1 day ago', status: 'warning' },
        { action: 'Curated content batch', timestamp: '1 day ago', status: 'success' },
        { action: 'Analyzed sentiment trends', timestamp: '1 day ago', status: 'success' }
      ]
    }
  ]);

  const [filteredAgents, setFilteredAgents] = useState(agents);
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);

  const stats = useMemo(() => ({
    total: agents.length,
    running: agents.filter(a => a.status === 'running').length,
    paused: agents.filter(a => a.status === 'paused').length,
    stopped: agents.filter(a => a.status === 'stopped').length,
    totalTasks: agents.reduce((acc, agent) => {
      const tasks = parseFloat(agent.metrics.tasks.replace(/[^\d.]/g, ''));
      return acc + (isNaN(tasks) ? 0 : tasks);
    }, 0)
  }), [agents]);

  const handleSearch = useCallback((query: string) => {
    const filtered = agents.filter(agent =>
      agent.name.toLowerCase().includes(query.toLowerCase()) ||
      agent.description.toLowerCase().includes(query.toLowerCase()) ||
      agent.type.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredAgents(filtered);
  }, [agents]);

  const handleStart = useCallback((agent: any) => {
    console.log('Starting agent:', agent.name);
    setAgents(prev => 
      prev.map(a => a.id === agent.id ? { ...a, status: 'running' } : a)
    );
  }, []);

  const handleStop = useCallback((agent: any) => {
    console.log('Stopping agent:', agent.name);
    setAgents(prev => 
      prev.map(a => a.id === agent.id ? { ...a, status: 'stopped' } : a)
    );
  }, []);

  const handlePause = useCallback((agent: any) => {
    console.log('Pausing agent:', agent.name);
    setAgents(prev => 
      prev.map(a => a.id === agent.id ? { ...a, status: 'paused' } : a)
    );
  }, []);

  const handleConfigure = useCallback((agent: any) => {
    console.log('Configuring agent:', agent.name);
  }, []);

  const handleDelete = useCallback((agent: any) => {
    console.log('Deleting agent:', agent.name);
  }, []);

  const handleDeploy = useCallback((deploymentData: any) => {
    console.log('Deploying new agent:', deploymentData);
    setShowDeploymentModal(false);
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
                AI Agent Manager
              </motion.h1>
              <motion.p 
                className="text-gray-600 dark:text-gray-300 mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                Deploy, monitor, and manage your intelligent automation agents
              </motion.p>
            </div>
            
            <motion.button
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition-colors"
              onClick={() => setShowDeploymentModal(true)}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <Sparkles className="h-5 w-5" />
              <span>Deploy New Agent</span>
            </motion.button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { label: 'Total Agents', value: stats.total, icon: Brain, color: 'blue' },
              { label: 'Running', value: stats.running, icon: Play, color: 'green' },
              { label: 'Paused', value: stats.paused, icon: Pause, color: 'yellow' },
              { label: 'Stopped', value: stats.stopped, icon: Stop, color: 'gray' },
              { label: 'Total Tasks', value: `${stats.totalTasks.toFixed(1)}K`, icon: Target, color: 'purple' }
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

        {/* Search and Filter */}
        <motion.div 
          className="flex items-center space-x-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search agents by name, type, or capabilities..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          
          <motion.button
            className="flex items-center space-x-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </motion.button>
        </motion.div>

        {/* Agents Grid */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <AnimatePresence>
            {filteredAgents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
              >
                <AgentCard
                  agent={agent}
                  onStart={handleStart}
                  onStop={handleStop}
                  onPause={handlePause}
                  onConfigure={handleConfigure}
                  onDelete={handleDelete}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty State */}
        {filteredAgents.length === 0 && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No agents found
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Try adjusting your search criteria or deploy a new agent
            </p>
            <motion.button
              className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition-colors"
              onClick={() => setShowDeploymentModal(true)}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
            >
              Deploy Your First Agent
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Deployment Modal */}
      <DeploymentModal
        isOpen={showDeploymentModal}
        onClose={() => setShowDeploymentModal(false)}
        onDeploy={handleDeploy}
      />
    </div>
  );
} 