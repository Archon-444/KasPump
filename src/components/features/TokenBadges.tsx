/**
 * TokenBadges Component
 * Displays verification badges for tokens
 *
 * Features:
 * - Multiple badge types with tooltips
 * - Automatic badges based on token data
 * - Compact and expanded display modes
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Shield, Star, Rocket, Gem, Flame, Sparkles, CheckCircle } from 'lucide-react';
import { BadgeType, getBadgeConfig, BadgeConfig } from '../../config/badges';
import { useBadges, BadgeData } from '../../hooks/useBadges';
import { KasPumpToken } from '../../types';
import { cn } from '../../utils';

// ============ Types ============

interface TokenBadgesProps {
  token?: Partial<KasPumpToken>;
  tokenAddress?: string;
  badges?: BadgeType[];
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  showTooltips?: boolean;
  className?: string;
}

interface SingleBadgeProps {
  badge: BadgeData;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

// ============ Icons ============

const BadgeIcons: Record<BadgeType, React.ReactNode> = {
  [BadgeType.NONE]: null,
  [BadgeType.VERIFIED_CREATOR]: <CheckCircle className="w-full h-full" />,
  [BadgeType.AUDITED]: <Shield className="w-full h-full" />,
  [BadgeType.COMMUNITY_CHOICE]: <Star className="w-full h-full" />,
  [BadgeType.GRADUATED]: <Rocket className="w-full h-full" />,
  [BadgeType.PARTNER]: <Gem className="w-full h-full" />,
  [BadgeType.NEW_LAUNCH]: <Sparkles className="w-full h-full" />,
  [BadgeType.TRENDING]: <Flame className="w-full h-full" />,
};

// ============ Size Classes ============

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const textSizeClasses = {
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
};

// ============ Single Badge Component ============

export function TokenBadge({ badge, size = 'md', showTooltip = true }: SingleBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const config = badge.config;

  if (!config || badge.type === BadgeType.NONE) return null;

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          'flex items-center justify-center rounded-full',
          config.bgColor,
          config.color,
          'border',
          config.borderColor,
          sizeClasses[size],
          'cursor-help'
        )}
        title={config.name}
      >
        {BadgeIcons[badge.type] || (
          <span className={cn(textSizeClasses[size], 'font-bold')}>
            {config.icon}
          </span>
        )}
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
          >
            <div className="bg-gray-900 border border-white/10 rounded-lg px-3 py-2 shadow-xl min-w-[180px]">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('text-sm', config.color)}>{config.icon}</span>
                <span className="text-white font-semibold text-sm">{config.name}</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                {config.description}
              </p>
              {config.criteria && (
                <p className="text-gray-500 text-[10px] mt-1 pt-1 border-t border-white/5">
                  Criteria: {config.criteria}
                </p>
              )}
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1">
                <div className="w-2 h-2 bg-gray-900 border-b border-r border-white/10 transform rotate-45" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ Badge Label Component ============

export function TokenBadgeLabel({ badge, size = 'md' }: SingleBadgeProps) {
  const config = badge.config;

  if (!config || badge.type === BadgeType.NONE) return null;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full',
        config.bgColor,
        config.color,
        'border',
        config.borderColor,
        textSizeClasses[size],
        'font-medium'
      )}
    >
      <span className={sizeClasses[size === 'lg' ? 'md' : 'sm']}>
        {BadgeIcons[badge.type] || config.icon}
      </span>
      <span>{config.name}</span>
    </motion.div>
  );
}

// ============ Multiple Badges Component ============

export function TokenBadges({
  token,
  tokenAddress,
  badges: providedBadges,
  maxDisplay = 5,
  size = 'md',
  showTooltips = true,
  className,
}: TokenBadgesProps) {
  const [showAll, setShowAll] = useState(false);

  // Use provided badges or fetch from hook
  const { badges: fetchedBadges } = useBadges(
    tokenAddress || token?.address,
    { includeAutomatic: true, token }
  );

  // Prefer provided badges over fetched
  const badgeData: BadgeData[] = providedBadges
    ? providedBadges.map(type => ({ type, config: getBadgeConfig(type) }))
    : fetchedBadges;

  if (badgeData.length === 0) return null;

  const displayBadges = showAll ? badgeData : badgeData.slice(0, maxDisplay);
  const hiddenCount = badgeData.length - maxDisplay;

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      {displayBadges.map((badge, index) => (
        <TokenBadge
          key={`${badge.type}-${index}`}
          badge={badge}
          size={size}
          showTooltip={showTooltips}
        />
      ))}

      {/* Show more indicator */}
      {hiddenCount > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className={cn(
            'flex items-center justify-center rounded-full',
            'bg-white/5 text-gray-400 border border-white/10',
            sizeClasses[size],
            'hover:bg-white/10 transition-colors',
            textSizeClasses[size],
            'font-medium'
          )}
          title={`Show ${hiddenCount} more badges`}
        >
          +{hiddenCount}
        </button>
      )}
    </div>
  );
}

// ============ Badge List Component ============

interface BadgeListProps {
  badges: BadgeData[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TokenBadgeList({ badges, size = 'md', className }: BadgeListProps) {
  if (badges.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {badges.map((badge, index) => (
        <TokenBadgeLabel key={`${badge.type}-${index}`} badge={badge} size={size} />
      ))}
    </div>
  );
}

// ============ Trust Score Summary ============

interface TrustScoreProps {
  token: Partial<KasPumpToken>;
  className?: string;
}

export function TrustScoreSummary({ token, className }: TrustScoreProps) {
  const { badges, hasBadge } = useBadges(token.address, {
    includeAutomatic: true,
    token,
  });

  // Calculate trust score based on badges
  const trustScore = badges.reduce((score, badge) => {
    const weights: Record<BadgeType, number> = {
      [BadgeType.NONE]: 0,
      [BadgeType.VERIFIED_CREATOR]: 25,
      [BadgeType.AUDITED]: 30,
      [BadgeType.COMMUNITY_CHOICE]: 15,
      [BadgeType.GRADUATED]: 20,
      [BadgeType.PARTNER]: 10,
      [BadgeType.NEW_LAUNCH]: 0,
      [BadgeType.TRENDING]: 0,
    };
    return score + (weights[badge.type] || 0);
  }, 0);

  const clampedScore = Math.min(100, trustScore);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-gray-400';
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-2">
        <Shield className={cn('w-5 h-5', getScoreColor(clampedScore))} />
        <span className={cn('font-bold', getScoreColor(clampedScore))}>
          {clampedScore}
        </span>
        <span className="text-gray-500 text-sm">Trust Score</span>
      </div>

      <div className="h-4 w-px bg-white/10" />

      <TokenBadges token={token} maxDisplay={3} size="sm" />
    </div>
  );
}

export default TokenBadges;
