'use client';

// Core UI Components for KasPump — Dark Glassmorphic Design System
import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils';

// Button variants using class-variance-authority
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-yellow-500/30 focus-visible:ring-offset-0 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none",
  {
    variants: {
      variant: {
        primary: "bg-white/10 text-white border border-white/10 hover:bg-white/15 hover:border-white/20",
        secondary: "bg-white/5 text-gray-300 border border-white/5 hover:bg-white/10 hover:text-white",
        success: "bg-green-500/15 text-green-400 border border-green-500/20 hover:bg-green-500/25 hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]",
        danger: "bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]",
        ghost: "text-gray-400 hover:bg-white/5 hover:text-white",
        outline: "border border-white/10 bg-transparent text-gray-300 hover:bg-white/5 hover:text-white hover:border-white/20",
        gradient: "bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 hover:from-yellow-600 hover:to-orange-600 hover:shadow-[0_0_30px_rgba(243,186,47,0.2)]",
        glow: "relative bg-background border border-white/10 text-white hover:bg-background/90 animate-glow-pulse"
      },
      size: {
        xs: "h-7 px-2 text-xs",
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 py-2",
        lg: "h-11 px-8",
        xl: "h-12 px-10 text-lg"
      },
      fullWidth: {
        true: "w-full",
        false: "w-auto"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false
    }
  }
);

export interface ButtonComponent extends VariantProps<typeof buttonVariants> {
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  'aria-label'?: string;
}

export const Button: React.FC<ButtonComponent> = ({
  variant,
  size,
  fullWidth,
  loading = false,
  disabled = false,
  icon,
  onClick,
  children,
  className,
  type = 'button',
  ...props
}) => {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};

// Card component (legacy — prefer glow-card-wrapper/glow-card-inner CSS classes)
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}> = ({ children, className, padding = 'md' }) => {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div className={cn(
      "rounded-xl border border-white/5 bg-white/[0.02] text-white shadow-sm",
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
};

// Input component
export const Input = forwardRef<HTMLInputElement, {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  error?: string | undefined;
  label?: string;
  disabled?: boolean;
  step?: string;
  'aria-label'?: string;
}>(({ type = "text", placeholder, value, onChange, className, error, label, disabled, step, 'aria-label': ariaLabel }, ref) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-300 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        step={step}
        aria-label={ariaLabel}
        className={cn(
          "flex h-10 w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white",
          "placeholder:text-gray-500",
          "focus-visible:outline-none focus-visible:border-yellow-500/50 focus-visible:ring-1 focus-visible:ring-yellow-500/30",
          "focus-visible:shadow-[0_0_15px_rgba(234,179,8,0.1)]",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-white/[0.01]",
          "transition-all duration-200",
          error && "border-red-500/50 focus-visible:border-red-500/50 focus-visible:ring-red-500/30",
          className
        )}
      />
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// Textarea component
export const Textarea: React.FC<{
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  rows?: number;
  error?: string;
  label?: string;
}> = ({ placeholder, value, onChange, className, rows = 3, error, label }) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-300 leading-none">
          {label}
        </label>
      )}
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white",
          "placeholder:text-gray-500",
          "focus-visible:outline-none focus-visible:border-yellow-500/50 focus-visible:ring-1 focus-visible:ring-yellow-500/30",
          "focus-visible:shadow-[0_0_15px_rgba(234,179,8,0.1)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-200",
          error && "border-red-500/50",
          className
        )}
      />
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
};

// Select component
export const Select: React.FC<{
  value?: string;
  onChange?: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  label?: string;
}> = ({ value, onChange, options, placeholder, className, label }) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-300 leading-none">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          "flex h-10 w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white",
          "focus-visible:outline-none focus-visible:border-yellow-500/50 focus-visible:ring-1 focus-visible:ring-yellow-500/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-200",
          "[&>option]:bg-gray-900 [&>option]:text-white",
          className
        )}
      >
        {placeholder && (
          <option value="" className="bg-gray-900 text-gray-400">{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-gray-900 text-white">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

// Badge component
export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info';
  className?: string;
}> = ({ children, variant = 'default', className }) => {
  const variants = {
    default: 'bg-white/10 text-gray-300 border border-white/5',
    success: 'bg-green-500/15 text-green-400 border border-green-500/20',
    danger: 'bg-red-500/15 text-red-400 border border-red-500/20',
    warning: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
    info: 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
  };

  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};

// Progress component with color prop for bonding curve theming
export const Progress: React.FC<{
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  color?: 'default' | 'green' | 'yellow' | 'red' | 'auto';
}> = ({ value, max = 100, className, showLabel = false, color = 'default' }) => {
  const percentage = Math.min((value / max) * 100, 100);

  const getBarColor = () => {
    if (color === 'auto') {
      if (percentage >= 80) return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]';
      if (percentage >= 50) return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.3)]';
      return 'bg-gray-400';
    }
    const colors = {
      default: 'bg-yellow-500',
      green: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]',
      yellow: 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.3)]',
      red: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]',
    };
    return colors[color];
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between items-center mb-1">
        {showLabel && (
          <span className="text-sm font-medium text-gray-300">
            {percentage.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="w-full bg-white/5 rounded-full h-2.5">
        <div
          className={cn("h-2.5 rounded-full transition-all duration-500 ease-out", getBarColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Loading Spinner
export const Spinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={cn("animate-spin rounded-full border-2 border-current border-t-transparent", sizes[size], className)} />
  );
};

// Alert component
export const Alert: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning';
  className?: string;
}> = ({ children, variant = 'default', className }) => {
  const variants = {
    default: 'border-white/10 bg-white/[0.02] text-gray-300',
    success: 'border-green-500/20 bg-green-500/10 text-green-400',
    danger: 'border-red-500/20 bg-red-500/10 text-red-400',
    warning: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400'
  };

  return (
    <div className={cn(
      "relative w-full rounded-xl border p-4",
      variants[variant],
      className
    )}>
      {children}
    </div>
  );
};

// Skeleton Component
export interface SkeletonProps {
  className?: string | undefined;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded' | undefined;
  width?: string | number | undefined;
  height?: string | number | undefined;
  animate?: boolean | undefined;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  width,
  height,
  animate = true,
}) => {
  const baseStyles = 'bg-white/5';

  const variantStyles = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded',
    rounded: 'rounded-xl',
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

// Skeleton Group - Multiple skeletons with spacing
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
