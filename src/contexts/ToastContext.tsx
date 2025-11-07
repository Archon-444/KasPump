/**
 * Toast Notification Context
 * Centralized toast notification system for the entire app
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SuccessToast } from '../components/features/SuccessToast';
import { ErrorToast } from '../components/features/ErrorToast';
import { motion } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  txHash?: string;
  explorerUrl?: string;
  onRetry?: () => void;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showSuccess: (title: string, message?: string, options?: Partial<Toast>) => void;
  showError: (error: Error | string, options?: Partial<Toast>) => void;
  showInfo: (title: string, message?: string, options?: Partial<Toast>) => void;
  showWarning: (title: string, message?: string, options?: Partial<Toast>) => void;
  dismissToast: (id: string) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    };
    
    setToasts((prev) => [...prev, newToast]);
    
    // Auto-dismiss
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, newToast.duration);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showSuccess = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    showToast({
      type: 'success',
      title,
      message,
      ...options,
    });
  }, [showToast]);

  const showError = useCallback((error: Error | string, options?: Partial<Toast>) => {
    const message = typeof error === 'string' ? error : error.message;
    showToast({
      type: 'error',
      title: 'Error',
      message,
      ...options,
    });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    showToast({
      type: 'info',
      title,
      message,
      ...options,
    });
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    showToast({
      type: 'warning',
      title,
      message,
      ...options,
    });
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        dismissToast,
        toasts,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC<{
  toasts: Toast[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-md w-full">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast, index) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
              delay: index * 0.05,
            }}
            layout
          >
            {toast.type === 'success' ? (
              <SuccessToast
                isOpen={true}
                onClose={() => onDismiss(toast.id)}
                title={toast.title}
                message={toast.message}
                txHash={toast.txHash}
                explorerUrl={toast.explorerUrl}
                duration={toast.duration}
                onAction={toast.action?.onClick}
                actionLabel={toast.action?.label}
              />
            ) : toast.type === 'error' ? (
              <ErrorToast
                error={toast.message || toast.title}
                onDismiss={() => onDismiss(toast.id)}
                onRetry={toast.onRetry}
                duration={toast.duration}
                action={toast.action}
              />
            ) : (
              <InfoToast
                type={toast.type}
                title={toast.title}
                message={toast.message}
                onDismiss={() => onDismiss(toast.id)}
                duration={toast.duration}
                action={toast.action}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const InfoToast: React.FC<{
  type: 'info' | 'warning';
  title: string;
  message?: string;
  onDismiss: () => void;
  duration?: number;
  action?: { label: string; onClick: () => void; icon?: React.ReactNode };
}> = ({ type, title, message, onDismiss, duration = 5000, action }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  const colors = {
    info: 'border-blue-500/30 bg-blue-500/10',
    warning: 'border-yellow-500/30 bg-yellow-500/10',
  };

  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
  };

  return (
    <div className={`glassmorphism rounded-xl p-4 border-2 ${colors[type]} shadow-2xl`}>
      <div className="flex items-start space-x-3">
        <div className="text-2xl">{icons[type]}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
          {message && <p className="text-sm text-gray-300">{message}</p>}
          {action && (
            <button
              onClick={() => {
                action.onClick();
                onDismiss();
              }}
              className="mt-2 text-sm text-yellow-400 hover:text-yellow-300 font-medium"
            >
              {action.icon} {action.label}
            </button>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 hover:bg-gray-700 rounded transition-colors"
          aria-label="Dismiss"
        >
          <span className="text-gray-400">×</span>
        </button>
      </div>
    </div>
  );
};

