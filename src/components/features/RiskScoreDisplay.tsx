/**
 * RiskScoreDisplay Component
 * Visual representation of token risk analysis
 *
 * Features:
 * - Overall risk score gauge
 * - Risk level indicator with color coding
 * - Expandable factor breakdown
 * - Refresh capability
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useRiskScore, RiskLevel, RiskFactor } from '../../hooks/useRiskScore';
import { KasPumpToken } from '../../types';

// ============ Types ============

interface RiskScoreDisplayProps {
  token: Partial<KasPumpToken> | undefined;
  variant?: 'compact' | 'detailed' | 'card';
  showBreakdown?: boolean;
  className?: string;
}

interface RiskScoreBadgeProps {
  level: RiskLevel;
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

interface RiskFactorRowProps {
  factor: RiskFactor;
  index: number;
}

// ============ Config ============

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string; glow: string }> = {
  low: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
  },
  moderate: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    glow: 'shadow-yellow-500/20',
  },
  elevated: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    glow: 'shadow-orange-500/20',
  },
  high: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/30',
    glow: 'shadow-red-500/20',
  },
};

const RISK_ICONS: Record<RiskLevel, LucideIcon> = {
  low: ShieldCheck,
  moderate: Shield,
  elevated: ShieldAlert,
  high: ShieldX,
};

const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Low Risk',
  moderate: 'Moderate Risk',
  elevated: 'Elevated Risk',
  high: 'High Risk',
};

const STATUS_ICONS: Record<RiskFactor['status'], LucideIcon> = {
  good: CheckCircle,
  warning: AlertTriangle,
  danger: XCircle,
};

const STATUS_COLORS: Record<RiskFactor['status'], string> = {
  good: 'text-emerald-400',
  warning: 'text-yellow-400',
  danger: 'text-red-400',
};

// ============ Sub-Components ============

/**
 * Risk Score Badge - Compact score indicator
 */
export function RiskScoreBadge({
  level,
  score,
  size = 'md',
  showLabel = true,
  className = '',
}: RiskScoreBadgeProps) {
  const colors = RISK_COLORS[level];
  const Icon = RISK_ICONS[level];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div
      className={`
        inline-flex items-center rounded-full border backdrop-blur-sm
        ${colors.bg} ${colors.border} ${colors.text}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span className="font-medium">{RISK_LABELS[level]}</span>}
      <span className="opacity-70">({Math.round(score)})</span>
    </div>
  );
}

/**
 * Circular Score Gauge
 */
function ScoreGauge({ score, level, size = 120 }: { score: number; level: RiskLevel; size?: number }) {
  const colors = RISK_COLORS[level];
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={colors.text}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`text-2xl font-bold ${colors.text}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          {Math.round(score)}
        </motion.span>
        <span className="text-xs text-gray-400">/ 100</span>
      </div>
    </div>
  );
}

/**
 * Risk Factor Row
 */
function RiskFactorRow({ factor, index }: RiskFactorRowProps) {
  const StatusIcon = STATUS_ICONS[factor.status];
  const statusColor = STATUS_COLORS[factor.status];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
    >
      <div className="flex items-center gap-2 flex-1">
        <StatusIcon className={`w-4 h-4 ${statusColor}`} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white">{factor.name}</span>
            <span className="text-xs text-gray-500">({(factor.weight * 100).toFixed(0)}%)</span>
          </div>
          <p className="text-xs text-gray-500">{factor.description}</p>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-medium ${statusColor}`}>{factor.value}</div>
        <div className="text-xs text-gray-500">Score: {Math.round(factor.score)}</div>
      </div>
    </motion.div>
  );
}

/**
 * Factor Progress Bar
 */
function FactorProgressBar({ factor }: { factor: RiskFactor }) {
  const statusColor = STATUS_COLORS[factor.status];
  const barColors = {
    good: 'bg-emerald-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{factor.name}</span>
        <span className={statusColor}>{factor.value}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColors[factor.status]}`}
          initial={{ width: 0 }}
          animate={{ width: `${factor.score}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ============ Main Component ============

/**
 * RiskScoreDisplay - Full risk analysis display
 */
export function RiskScoreDisplay({
  token,
  variant = 'detailed',
  showBreakdown = true,
  className = '',
}: RiskScoreDisplayProps) {
  const { analysis, isLoading, error, refresh } = useRiskScore(token);
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
        <span className="ml-2 text-sm text-gray-400">Analyzing risk...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center p-4 text-red-400 ${className}`}>
        <AlertTriangle className="w-5 h-5 mr-2" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const colors = RISK_COLORS[analysis.level];
  const Icon = RISK_ICONS[analysis.level];

  // Compact variant - just badge
  if (variant === 'compact') {
    return (
      <RiskScoreBadge
        level={analysis.level}
        score={analysis.overallScore}
        size="sm"
        className={className}
      />
    );
  }

  // Card variant - score with mini breakdown
  if (variant === 'card') {
    return (
      <div
        className={`
          rounded-xl border backdrop-blur-sm p-4
          ${colors.bg} ${colors.border}
          ${className}
        `}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${colors.text}`} />
            <span className={`font-semibold ${colors.text}`}>{RISK_LABELS[analysis.level]}</span>
          </div>
          <span className={`text-2xl font-bold ${colors.text}`}>
            {Math.round(analysis.overallScore)}
          </span>
        </div>

        <p className="text-xs text-gray-400 mb-3">{analysis.summary}</p>

        <div className="space-y-2">
          {analysis.factors.slice(0, 3).map((factor) => (
            <FactorProgressBar key={factor.name} factor={factor} />
          ))}
        </div>

        {analysis.factors.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-2 text-xs text-gray-400 hover:text-white flex items-center justify-center gap-1"
          >
            {isExpanded ? (
              <>
                Show less <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                +{analysis.factors.length - 3} more factors <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        )}

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 mt-2">
                {analysis.factors.slice(3).map((factor) => (
                  <FactorProgressBar key={factor.name} factor={factor} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Detailed variant - full breakdown
  return (
    <div
      className={`
        rounded-2xl border backdrop-blur-xl p-6
        bg-white/[0.03] border-white/10
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${colors.bg} ${colors.border} border`}>
            <Icon className={`w-6 h-6 ${colors.text}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Risk Analysis</h3>
            <p className="text-sm text-gray-400">
              Last updated: {new Date(analysis.lastUpdated).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
          title="Refresh analysis"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Score and Level */}
      <div className="flex items-center gap-6 mb-6">
        <ScoreGauge score={analysis.overallScore} level={analysis.level} />
        <div className="flex-1">
          <RiskScoreBadge level={analysis.level} score={analysis.overallScore} size="lg" />
          <p className="mt-3 text-sm text-gray-300">{analysis.summary}</p>
        </div>
      </div>

      {/* Factor Breakdown */}
      {showBreakdown && (
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              Risk Factor Breakdown
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2 border-t border-white/10">
                  {analysis.factors.map((factor, index) => (
                    <RiskFactorRow key={factor.name} factor={factor} index={index} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

/**
 * MiniRiskIndicator - Inline risk indicator for lists/cards
 */
export function MiniRiskIndicator({
  token,
  className = '',
}: {
  token: Partial<KasPumpToken> | undefined;
  className?: string;
}) {
  const { analysis, isLoading } = useRiskScore(token);

  if (isLoading || !analysis) {
    return null;
  }

  const colors = RISK_COLORS[analysis.level];
  const Icon = RISK_ICONS[analysis.level];

  return (
    <div
      className={`
        inline-flex items-center gap-1 px-1.5 py-0.5 rounded
        ${colors.bg} ${colors.text}
        ${className}
      `}
      title={`${RISK_LABELS[analysis.level]} (${Math.round(analysis.overallScore)}/100)`}
    >
      <Icon className="w-3 h-3" />
      <span className="text-xs font-medium">{Math.round(analysis.overallScore)}</span>
    </div>
  );
}

export default RiskScoreDisplay;
