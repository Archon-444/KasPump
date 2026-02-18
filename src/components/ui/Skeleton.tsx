/**
 * Skeleton Component
 * Provides shimmer loading states for better UX
 */

'use client';

import React from 'react';
import { cn } from '../../utils';

export interface SkeletonProps {
  className?: string | undefined;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  width,
  height,
  animate = true,
}) => {
  const baseStyles = 'bg-gray-700/50';
  
  const variantStyles = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded',
    rounded: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        animate && 'animate-pulse shimmer',
        className
      )}
      style={style}
      aria-label="Loading"
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

/**
 * Skeleton Group - Multiple skeletons with spacing
 */
export interface SkeletonGroupProps {
  count?: number;
  className?: string;
  itemClassName?: string;
  children?: React.ReactNode;
}

export const SkeletonGroup: React.FC<SkeletonGroupProps> = ({
  count = 1,
  className,
  itemClassName,
  children,
}) => {
  if (children) {
    return <div className={cn('space-y-2', className)}>{children}</div>;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={itemClassName} />
      ))}
    </div>
  );
};

