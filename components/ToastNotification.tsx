import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { createLogger } from '../src/utils/logger';

const logger = createLogger('ToastNotification');

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // Duration in milliseconds, 0 means no auto-dismiss
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
  defaultDuration?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ 
  children, 
  maxToasts = 5,
  defaultDuration = 5000 
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toastData: Omit<Toast, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      ...toastData,
      id,
      duration: toastData.duration ?? defaultDuration
    };

    setToasts(prevToasts => {
      const updatedToasts = [newToast, ...prevToasts];
      // Keep only the most recent toasts if we exceed maxToasts
      if (updatedToasts.length > maxToasts) {
        return updatedToasts.slice(0, maxToasts);
      }
      return updatedToasts;
    });

    // Auto-dismiss if duration is set
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    logger.info('Toast notification added', { id, type: newToast.type, title: newToast.title });
    return id;
  };

  const removeToast = (id: string): void => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    logger.debug('Toast notification removed', { id });
  };

  const clearAllToasts = (): void => {
    setToasts([]);
    logger.debug('All toast notifications cleared');
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAllToasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts } = useToast();

  return (
    <div 
      className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast }) => {
  const { removeToast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = (): void => {
    setIsLeaving(true);
    setTimeout(() => {
      removeToast(toast.id);
    }, 300); // Animation duration
  };

  const getToastStyles = (): string => {
    const baseStyles = `
      transform transition-all duration-300 ease-in-out pointer-events-auto
      bg-white rounded-lg shadow-lg border-l-4 p-4 max-w-sm w-full
    `;
    
    const typeStyles = {
      success: 'border-green-400',
      error: 'border-red-400', 
      warning: 'border-yellow-400',
      info: 'border-blue-400'
    };

    const animationStyles = isLeaving 
      ? 'translate-x-full opacity-0' 
      : isVisible 
        ? 'translate-x-0 opacity-100' 
        : 'translate-x-full opacity-0';

    return `${baseStyles} ${typeStyles[toast.type]} ${animationStyles}`;
  };

  const getIcon = () => {
    const iconClasses = "h-5 w-5 flex-shrink-0";
    
    switch (toast.type) {
      case 'success':
        return <CheckCircleIcon className={`${iconClasses} text-green-500`} />;
      case 'error':
        return <XCircleIcon className={`${iconClasses} text-red-500`} />;
      case 'warning':
        return <ExclamationTriangleIcon className={`${iconClasses} text-yellow-500`} />;
      case 'info':
        return <InformationCircleIcon className={`${iconClasses} text-blue-500`} />;
      default:
        return <InformationCircleIcon className={`${iconClasses} text-gray-500`} />;
    }
  };

  return (
    <div 
      className={getToastStyles()}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h4 className="text-sm font-medium text-gray-900">
            {toast.title}
          </h4>
          {toast.message && (
            <p className="mt-1 text-sm text-gray-600">
              {toast.message}
            </p>
          )}
          {toast.action && (
            <div className="mt-2">
              <button
                onClick={toast.action.onClick}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline"
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-md"
            aria-label="Close notification"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Utility hooks for common toast patterns
export const useToastHelpers = () => {
  const { addToast } = useToast();

  return {
    success: (title: string, message?: string, action?: Toast['action']) => 
      addToast({ type: 'success', title, message, action }),
    
    error: (title: string, message?: string, action?: Toast['action']) => 
      addToast({ type: 'error', title, message, action, duration: 0 }), // Errors don't auto-dismiss
    
    warning: (title: string, message?: string, action?: Toast['action']) => 
      addToast({ type: 'warning', title, message, action, duration: 7000 }), // Warnings stay longer
    
    info: (title: string, message?: string, action?: Toast['action']) => 
      addToast({ type: 'info', title, message, action }),
  };
};

export default ToastItem; 