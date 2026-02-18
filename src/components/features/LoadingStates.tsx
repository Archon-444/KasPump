/**
 * Enhanced Loading State Components
 * Provides consistent, beautiful loading states throughout the app
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Skeleton, SkeletonGroup } from '../ui/Skeleton';
import { cn } from '../../utils';

/**
 * Spinner Component
 */
export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className,
  text,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className={cn('border-2 border-yellow-500 border-t-transparent rounded-full', sizeClasses[size])}
        aria-label="Loading"
        role="status"
      />
      {text && (
        <p className="mt-4 text-sm text-gray-400 animate-pulse">{text}</p>
      )}
    </div>
  );
};

/**
 * Page Loading State
 */
export interface PageLoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export const PageLoading: React.FC<PageLoadingProps> = ({
  message = 'Loading...',
  fullScreen = true,
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        fullScreen && 'min-h-screen'
      )}
    >
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-400">{message}</p>
      </div>
    </div>
  );
};

/**
 * Token List Skeleton
 */
export const TokenListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <div className="glow-card-wrapper animate-pulse">
            <div className="glow-card-inner p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Skeleton variant="circular" width={48} height={48} />
                  <div className="space-y-2">
                    <Skeleton variant="text" width={120} />
                    <Skeleton variant="text" width={80} />
                  </div>
                </div>
                <Skeleton variant="rounded" width={60} height={24} />
              </div>

              {/* Description */}
              <SkeletonGroup count={2} itemClassName="h-3" />

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="space-y-1">
                    <Skeleton variant="text" width={60} height={12} />
                    <Skeleton variant="text" width={80} height={16} />
                  </div>
                ))}
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Skeleton variant="rounded" width="100%" height={8} />
                <Skeleton variant="text" width={100} height={12} />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

/**
 * Stats Card Skeleton
 */
export const StatsCardSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glow-card-wrapper animate-pulse">
          <div className="glow-card-inner p-6 space-y-3">
            <Skeleton variant="rounded" width={40} height={40} />
            <Skeleton variant="text" width={100} height={16} />
            <Skeleton variant="text" width={80} height={24} />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Chart Skeleton
 */
export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 300 }) => {
  return (
    <div className="glow-card-wrapper animate-pulse">
      <div className="glow-card-inner p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width={120} height={20} />
          <Skeleton variant="rounded" width={100} height={32} />
        </div>
        <Skeleton variant="rounded" width="100%" height={height} />
      </div>
    </div>
  );
};

/**
 * Table Skeleton
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => {
  return (
    <div className="glow-card-wrapper animate-pulse">
      <div className="glow-card-inner p-6 space-y-4">
        {/* Header */}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} variant="text" width="100%" height={20} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} variant="text" width="100%" height={16} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Empty State Component
 */
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('text-center py-12', className)}
    >
      <div className="glow-card-wrapper inline-block"><div className="glow-card-inner p-8">
        {icon && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="mb-4 flex justify-center"
          >
            {icon}
          </motion.div>
        )}
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        {description && (
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            {description}
          </p>
        )}
        {action && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-medium hover:from-yellow-600 hover:to-orange-600 transition-all"
          >
            {action.icon}
            {action.label}
          </motion.button>
        )}
      </div></div>
    </motion.div>
  );
};

/**
 * Inline Loading Indicator
 */
export const InlineLoading: React.FC<{ text?: string }> = ({ text }) => {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
      {text && <span className="text-sm text-gray-400">{text}</span>}
    </div>
  );
};

