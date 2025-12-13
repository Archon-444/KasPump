'use client';

// Enhanced UI Components with visual effects inspired by modern design patterns
import React from 'react';
import { cn } from '../../utils';

// ============================================================================
// AMBIENT BACKGROUND
// A layered background effect with glowing orbs, roof light, and starfield
// ============================================================================

export interface AmbientBackgroundProps {
  className?: string;
  /** Show roof light gradient at top */
  showRoofLight?: boolean;
  /** Show light beam conic gradient */
  showLightBeam?: boolean;
  /** Show breathing ambient orbs */
  showOrbs?: boolean;
  /** Show starfield texture */
  showStars?: boolean;
  /** Show noise/grain overlay */
  showNoise?: boolean;
  /** Custom color scheme: 'yellow' (default) | 'purple' | 'green' */
  colorScheme?: 'yellow' | 'purple' | 'green';
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({
  className,
  showRoofLight = true,
  showLightBeam = true,
  showOrbs = true,
  showStars = true,
  showNoise = true,
  colorScheme = 'yellow',
}) => {
  const orbColors = {
    yellow: {
      orb1: 'rgba(243, 186, 47, 0.15)',
      orb2: 'rgba(249, 115, 22, 0.12)',
      orb3: 'rgba(234, 179, 8, 0.1)',
    },
    purple: {
      orb1: 'rgba(168, 85, 247, 0.15)',
      orb2: 'rgba(139, 92, 246, 0.12)',
      orb3: 'rgba(124, 58, 237, 0.1)',
    },
    green: {
      orb1: 'rgba(34, 197, 94, 0.15)',
      orb2: 'rgba(22, 163, 74, 0.12)',
      orb3: 'rgba(21, 128, 61, 0.1)',
    },
  };

  const colors = orbColors[colorScheme];

  return (
    <div className={cn('fixed inset-0 z-0 pointer-events-none overflow-hidden', className)}>
      {/* Main Top Light Source */}
      {showRoofLight && <div className="roof-light" />}

      {/* Subtle Conic Beams */}
      {showLightBeam && <div className="light-beam" />}

      {/* Ambient Color Orbs */}
      {showOrbs && (
        <>
          <div
            className="ambient-orb ambient-orb-1"
            style={{ background: colors.orb1 }}
          />
          <div
            className="ambient-orb ambient-orb-2"
            style={{ background: colors.orb2 }}
          />
          <div
            className="ambient-orb ambient-orb-3"
            style={{ background: colors.orb3 }}
          />
        </>
      )}

      {/* Stars Overlay */}
      {showStars && <div className="absolute inset-0 starfield" />}

      {/* Grain/Noise */}
      {showNoise && <div className="noise-overlay" />}
    </div>
  );
};

// ============================================================================
// GLOW CARD
// A card with gradient border that glows on hover
// ============================================================================

export interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  /** Padding size */
  padding?: 'sm' | 'md' | 'lg' | 'none';
  /** Whether to show glow effect */
  glow?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** ARIA role */
  role?: string;
}

export const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className,
  innerClassName,
  padding = 'md',
  glow = true,
  onClick,
  role,
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={cn(
        'glow-card-wrapper',
        glow && 'group',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={role}
    >
      <div
        className={cn(
          'glow-card-inner',
          paddingClasses[padding],
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// GLOW BUTTON
// A button with animated gradient glow effect behind it
// ============================================================================

export interface GlowButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color scheme */
  colorScheme?: 'yellow' | 'green' | 'purple' | 'red';
  /** Full width */
  fullWidth?: boolean;
}

export const GlowButton: React.FC<GlowButtonProps> = ({
  children,
  className,
  onClick,
  disabled = false,
  loading = false,
  type = 'button' as const,
  size = 'md',
  colorScheme = 'yellow',
  fullWidth = false,
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const glowColors = {
    yellow: 'from-yellow-500 to-orange-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-violet-500',
    red: 'from-red-500 to-rose-500',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'relative group inline-flex',
        fullWidth && 'w-full',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {/* Glow effect */}
      <div
        className={cn(
          'absolute -inset-0.5 rounded-lg blur-sm transition-opacity duration-200',
          `bg-gradient-to-r ${glowColors[colorScheme]}`,
          disabled ? 'opacity-30' : 'opacity-60 group-hover:opacity-100'
        )}
      />

      {/* Button content */}
      <div
        className={cn(
          'relative z-10 inline-flex items-center justify-center rounded-md font-medium text-white transition-all duration-200',
          'bg-background border border-white/10',
          'group-hover:bg-background/90',
          sizeClasses[size],
          fullWidth && 'w-full'
        )}
      >
        {loading ? (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </div>
    </button>
  );
};

// ============================================================================
// ANIMATED BADGE
// A badge with animated ping indicator for live/active states
// ============================================================================

export interface AnimatedBadgeProps {
  children: React.ReactNode;
  className?: string;
  /** Show ping animation */
  animated?: boolean;
  /** Badge variant */
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' | 'live';
  /** Dot color override */
  dotColor?: string;
}

export const AnimatedBadge: React.FC<AnimatedBadgeProps> = ({
  children,
  className,
  animated = true,
  variant = 'default',
  dotColor,
}) => {
  const variantStyles = {
    default: {
      badge: 'bg-white/5 border-white/10 text-gray-300',
      dot: 'bg-gray-400',
      ping: 'bg-gray-400',
    },
    success: {
      badge: 'bg-green-500/10 border-green-500/20 text-green-400',
      dot: 'bg-green-500',
      ping: 'bg-green-400',
    },
    danger: {
      badge: 'bg-red-500/10 border-red-500/20 text-red-400',
      dot: 'bg-red-500',
      ping: 'bg-red-400',
    },
    warning: {
      badge: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
      dot: 'bg-yellow-500',
      ping: 'bg-yellow-400',
    },
    info: {
      badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      dot: 'bg-blue-500',
      ping: 'bg-blue-400',
    },
    live: {
      badge: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
      dot: 'bg-yellow-500',
      ping: 'bg-yellow-400',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1 rounded-full border',
        styles.badge,
        className
      )}
    >
      {animated && (
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              styles.ping
            )}
            style={dotColor ? { backgroundColor: dotColor } : undefined}
          />
          <span
            className={cn(
              'relative inline-flex rounded-full h-2 w-2',
              styles.dot
            )}
            style={dotColor ? { backgroundColor: dotColor } : undefined}
          />
        </span>
      )}
      <span className="text-xs font-medium tracking-wide uppercase">
        {children}
      </span>
    </div>
  );
};

// ============================================================================
// GLOW INPUT WRAPPER
// Wraps an input with a focus glow effect
// ============================================================================

export interface GlowInputWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const GlowInputWrapper: React.FC<GlowInputWrapperProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn('input-glow-wrapper', className)}>
      {children}
    </div>
  );
};

// ============================================================================
// GRADIENT TEXT
// Text with gradient color fill and optional glow
// ============================================================================

export interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  /** Color scheme */
  colorScheme?: 'yellow' | 'purple' | 'green' | 'blue' | 'white';
  /** Add text shadow glow */
  glow?: boolean;
  /** HTML element to render */
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'p';
}

export const GradientText: React.FC<GradientTextProps> = ({
  children,
  className,
  colorScheme = 'yellow',
  glow = false,
  as = 'span',
}) => {
  const gradients = {
    yellow: 'from-yellow-500 via-yellow-400 to-orange-500',
    purple: 'from-purple-500 via-violet-400 to-pink-500',
    green: 'from-green-500 via-emerald-400 to-teal-500',
    blue: 'from-blue-500 via-cyan-400 to-teal-500',
    white: 'from-white to-white/40',
  };

  const glowColors = {
    yellow: 'rgba(243, 186, 47, 0.5)',
    purple: 'rgba(168, 85, 247, 0.5)',
    green: 'rgba(34, 197, 94, 0.5)',
    blue: 'rgba(59, 130, 246, 0.5)',
    white: 'rgba(255, 255, 255, 0.3)',
  };

  const baseClassName = cn(
    'bg-clip-text text-transparent bg-gradient-to-r',
    gradients[colorScheme],
    className
  );

  const style = glow ? { textShadow: `0 0 30px ${glowColors[colorScheme]}` } : undefined;

  // Render appropriate element based on 'as' prop
  switch (as) {
    case 'h1':
      return <h1 className={baseClassName} style={style}>{children}</h1>;
    case 'h2':
      return <h2 className={baseClassName} style={style}>{children}</h2>;
    case 'h3':
      return <h3 className={baseClassName} style={style}>{children}</h3>;
    case 'h4':
      return <h4 className={baseClassName} style={style}>{children}</h4>;
    case 'p':
      return <p className={baseClassName} style={style}>{children}</p>;
    default:
      return <span className={baseClassName} style={style}>{children}</span>;
  }
};

// ============================================================================
// STAT CARD
// A card for displaying statistics with optional glow and animation
// ============================================================================

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
  /** Change indicator: positive, negative, or neutral */
  change?: {
    value: string | number;
    direction: 'up' | 'down' | 'neutral';
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  className,
  change,
}) => {
  return (
    <GlowCard className={className} padding="md">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-semibold text-white">
            {value}
          </p>
          {change && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                change.direction === 'up' && 'text-green-400',
                change.direction === 'down' && 'text-red-400',
                change.direction === 'neutral' && 'text-gray-400'
              )}
            >
              {change.direction === 'up' && (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
              {change.direction === 'down' && (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              {change.value}
            </div>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
            {icon}
          </div>
        )}
      </div>
    </GlowCard>
  );
};
