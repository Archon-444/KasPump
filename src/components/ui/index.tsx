'use client';

// Core UI Components for KasPump
import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/40 focus-visible:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]",
        success: "bg-green-600 text-white hover:bg-green-500 active:scale-[0.98] shadow-glow-green/0 hover:shadow-glow-green",
        danger: "bg-red-600 text-white hover:bg-red-500 active:scale-[0.98] shadow-glow-red/0 hover:shadow-glow-red",
        ghost: "hover:bg-white/[0.04] hover:text-accent-foreground active:scale-[0.98]",
        outline: "border border-white/[0.08] bg-transparent hover:bg-white/[0.04] hover:border-white/[0.12] active:scale-[0.98]",
        gradient: "bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-400 hover:to-orange-400 shadow-glow-sm hover:shadow-glow active:scale-[0.98]",
        glow: "relative bg-background border border-white/[0.08] text-white hover:bg-white/[0.04] hover:border-white/[0.12]"
      },
      size: {
        xs: "h-7 px-2.5 text-xs",
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 py-2",
        lg: "h-11 px-6",
        xl: "h-12 px-8 text-base"
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

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}> = ({ children, className, padding = 'md' }) => {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6'
  };

  return (
    <div className={cn(
      "rounded-2xl border border-white/[0.06] bg-card text-card-foreground shadow-card",
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
  error?: string;
  label?: string;
  disabled?: boolean;
  step?: string;
  'aria-label'?: string;
}>(({ type = "text", placeholder, value, onChange, className, error, label, disabled, step, 'aria-label': ariaLabel }, ref) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
          "flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/30 focus-visible:border-yellow-500/40 disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200",
          error && "border-red-500/50 focus-visible:ring-red-500/30",
          className
        )}
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
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
        <label className="text-sm font-medium leading-none">
          {label}
        </label>
      )}
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm ring-offset-background placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/30 focus-visible:border-yellow-500/40 disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200 resize-none",
          error && "border-red-500/50",
          className
        )}
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
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
        <label className="text-sm font-medium leading-none">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          "flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/30 focus-visible:border-yellow-500/40 disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200 appearance-none cursor-pointer",
          className
        )}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' | 'secondary';
  className?: string;
}> = ({ children, variant = 'default', className }) => {
  const variants = {
    default: 'bg-white/[0.06] text-gray-300 border border-white/[0.06]',
    secondary: 'bg-white/[0.04] text-gray-400 border border-white/[0.06]',
    success: 'bg-green-500/[0.1] text-green-400 border border-green-500/[0.15]',
    danger: 'bg-red-500/[0.1] text-red-400 border border-red-500/[0.15]',
    warning: 'bg-yellow-500/[0.1] text-yellow-400 border border-yellow-500/[0.15]',
    info: 'bg-blue-500/[0.1] text-blue-400 border border-blue-500/[0.15]'
  };

  return (
    <span className={cn(
      "inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};

export const Progress: React.FC<{
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
}> = ({ value, max = 100, className, showLabel = false }) => {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium text-gray-400 tabular-nums">
            {percentage.toFixed(1)}%
          </span>
        </div>
      )}
      <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-yellow-500 to-amber-400 h-full rounded-full transition-all duration-500 ease-out" 
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

export const Alert: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning';
  className?: string;
}> = ({ children, variant = 'default', className }) => {
  const variants = {
    default: 'border-white/[0.06] bg-white/[0.03] text-foreground',
    success: 'border-green-500/[0.15] bg-green-500/[0.06] text-green-400',
    danger: 'border-red-500/[0.15] bg-red-500/[0.06] text-red-400',
    warning: 'border-yellow-500/[0.15] bg-yellow-500/[0.06] text-yellow-400'
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
  className?: string;
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
