import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Database,
  Settings,
  Users,
  Activity,
  Brain,
  Zap,
  Lock,
  Key,
  Search,
  Bell,
  Menu,
  X,
  ChevronRight,
  Home,
  BarChart3,
  FileText,
  HelpCircle,
  LogOut,
  User,
  ChevronDown,
  Sparkles,
  Target,
  Layers,
  GitBranch,
  Command
} from 'lucide-react';

// Navigation Item Component
const NavItem = ({ 
  item, 
  isActive, 
  isCollapsed, 
  onClick, 
  level = 0 
}: {
  item: any;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
  level?: number;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showChildren, setShowChildren] = useState(false);

  const hasChildren = item.children && item.children.length > 0;
  const Icon = item.icon;

  return (
    <div className="relative">
      <motion.div
        className={`
          relative flex items-center w-full px-3 py-2.5 rounded-xl cursor-pointer group
          transition-all duration-200 ${level > 0 ? 'ml-4' : ''}
          ${isActive 
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
            : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
          }
        `}
        onClick={() => {
          onClick();
          if (hasChildren) {
            setShowChildren(!showChildren);
          }
        }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ scale: 1.02, x: 2 }}
        whileTap={{ scale: 0.98 }}
        layout
      >
        {/* Active Indicator */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              exit={{ scaleY: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        {/* Icon */}
        <motion.div 
          className={`
            flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200
            ${isActive 
              ? 'bg-blue-100 dark:bg-blue-800/30' 
              : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
            }
          `}
          animate={{ 
            rotate: isHovered && !isCollapsed ? 360 : 0,
            scale: isActive ? 1.1 : 1 
          }}
          transition={{ duration: 0.6, type: "spring" }}
        >
          <Icon className="h-4 w-4" />
        </motion.div>

        {/* Label */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              className="flex-1 ml-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{item.label}</span>
                
                {/* Badge */}
                {item.badge && (
                  <motion.span
                    className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    {item.badge}
                  </motion.span>
                )}

                {/* Chevron for expandable items */}
                {hasChildren && (
                  <motion.div
                    animate={{ rotate: showChildren ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </motion.div>
                )}
              </div>

              {/* Description */}
              {item.description && (
                <motion.p
                  className="text-xs text-gray-500 dark:text-gray-400 mt-0.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isHovered ? 1 : 0.7 }}
                  transition={{ duration: 0.2 }}
                >
                  {item.description}
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hover Indicator */}
        <motion.div
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 pointer-events-none"
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && showChildren && !isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-1 space-y-1"
          >
            {item.children.map((child: any) => (
              <NavItem
                key={child.id}
                item={child}
                isActive={false}
                isCollapsed={isCollapsed}
                onClick={() => console.log('Child clicked:', child)}
                level={level + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip for collapsed state */}
      <AnimatePresence>
        {isCollapsed && isHovered && (
          <motion.div
            className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-50 whitespace-nowrap"
            initial={{ opacity: 0, x: -10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {item.label}
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Navigation Section Header
const NavSection = ({ 
  title, 
  isCollapsed, 
  children 
}: {
  title: string;
  isCollapsed: boolean;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <AnimatePresence>
      {!isCollapsed && (
        <motion.h3
          className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {title}
        </motion.h3>
      )}
    </AnimatePresence>
    <div className="space-y-1">
      {children}
    </div>
  </div>
);

// User Profile Section
const UserProfile = ({ 
  user, 
  isCollapsed, 
  onProfileClick, 
  onLogout 
}: {
  user: any;
  isCollapsed: boolean;
  onProfileClick: () => void;
  onLogout: () => void;
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="relative">
      <motion.div
        className="flex items-center p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
        onClick={() => isCollapsed ? onProfileClick() : setShowDropdown(!showDropdown)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Avatar */}
        <motion.div 
          className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm"
          whileHover={{ scale: 1.1 }}
        >
          {user.name.charAt(0).toUpperCase()}
        </motion.div>

        {/* User Info */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              className="flex-1 ml-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.role}
                  </p>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {showDropdown && !isCollapsed && (
          <motion.div
            className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-2"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <motion.button
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={onProfileClick}
              whileHover={{ x: 4 }}
            >
              <User className="h-4 w-4 mr-3" />
              Profile Settings
            </motion.button>
            <motion.button
              className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={onLogout}
              whileHover={{ x: 4 }}
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// System Status Indicator
const SystemStatus = ({ isCollapsed }: { isCollapsed: boolean }) => {
  const [status, setStatus] = useState({
    overall: 'online',
    agents: 24,
    activeConnections: 156,
    lastSync: '2 mins ago'
  });

  return (
    <motion.div
      className="px-3 py-3 mx-3 rounded-xl bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5, duration: 0.3 }}
    >
      <div className="flex items-center space-x-3">
        {/* Status Indicator */}
        <motion.div 
          className="w-2 h-2 rounded-full bg-green-500"
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              className="flex-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-xs font-medium text-green-700 dark:text-green-400">
                All Systems Operational
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {status.agents} agents • {status.activeConnections} connections
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Main Enhanced Navigation
export default function EnhancedNavigation({ 
  activeItem = 'dashboard',
  onItemClick = (item: string) => console.log('Nav item clicked:', item),
  className = ""
}: {
  activeItem?: string;
  onItemClick?: (item: string) => void;
  className?: string;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const user = {
    name: 'John Doe',
    role: 'Security Admin',
    avatar: '/api/placeholder/32/32'
  };

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      description: 'Overview and metrics'
    },
    {
      id: 'secrets',
      label: 'Secrets Manager',
      icon: Shield,
      description: 'Manage application secrets',
      badge: '4'
    },
    {
      id: 'agents',
      label: 'AI Agents',
      icon: Brain,
      description: 'Agent orchestration',
      children: [
        { id: 'agents-active', label: 'Active Agents', icon: Activity },
        { id: 'agents-deploy', label: 'Deploy New', icon: Zap },
        { id: 'agents-training', label: 'Training', icon: Target }
      ]
    },
    {
      id: 'integrations',
      label: 'Integrations',
      icon: Layers,
      description: 'External connections',
      children: [
        { id: 'integrations-aws', label: 'AWS Services', icon: Database },
        { id: 'integrations-github', label: 'GitHub', icon: GitBranch },
        { id: 'integrations-slack', label: 'Slack', icon: Bell }
      ]
    },
    {
      id: 'monitoring',
      label: 'Monitoring',
      icon: BarChart3,
      description: 'System health & analytics'
    },
    {
      id: 'users',
      label: 'Team Management',
      icon: Users,
      description: 'Manage team access'
    }
  ];

  const settingsItems = [
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      description: 'Application preferences'
    },
    {
      id: 'security',
      label: 'Security',
      icon: Lock,
      description: 'Security policies'
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: HelpCircle,
      description: 'Documentation & support'
    }
  ];

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Navigation Sidebar */}
      <motion.nav
        className={`
          fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50
          flex flex-col shadow-lg lg:shadow-none
          ${isCollapsed ? 'w-20' : 'w-72'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          transition-all duration-300 ease-in-out
          ${className}
        `}
        initial={false}
        animate={{ width: isCollapsed ? 80 : 288 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <AnimatePresence mode="wait">
            {!isCollapsed ? (
              <motion.div
                key="full-logo"
                className="flex items-center space-x-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900 dark:text-white">VANTA</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Enterprise Vault</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed-logo"
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                whileHover={{ scale: 1.1, rotate: 360 }}
              >
                <Shield className="h-5 w-5 text-white" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toggle Button */}
          <motion.button
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={handleToggleCollapse}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </motion.div>
          </motion.button>

          {/* Mobile Close */}
          <button
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <motion.button
            className="w-full flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition-colors"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <Sparkles className="h-4 w-4" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  className="ml-2 font-medium"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  Quick Deploy
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 p-4 space-y-6 overflow-y-auto">
          {/* Main Navigation */}
          <NavSection title="Main" isCollapsed={isCollapsed}>
            {navigationItems.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                isActive={activeItem === item.id}
                isCollapsed={isCollapsed}
                onClick={() => onItemClick(item.id)}
              />
            ))}
          </NavSection>

          {/* Settings Navigation */}
          <NavSection title="Settings" isCollapsed={isCollapsed}>
            {settingsItems.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                isActive={activeItem === item.id}
                isCollapsed={isCollapsed}
                onClick={() => onItemClick(item.id)}
              />
            ))}
          </NavSection>
        </div>

        {/* System Status */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <SystemStatus isCollapsed={isCollapsed} />
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <UserProfile
            user={user}
            isCollapsed={isCollapsed}
            onProfileClick={() => onItemClick('profile')}
            onLogout={() => onItemClick('logout')}
          />
        </div>
      </motion.nav>

      {/* Mobile Menu Button */}
      <motion.button
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex items-center justify-center border border-gray-200 dark:border-gray-700"
        onClick={() => setIsMobileOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      </motion.button>
    </>
  );
} 