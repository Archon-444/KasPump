/**
 * useRiskScore Hook
 * Calculates and displays risk metrics for tokens
 *
 * Risk Factors:
 * - Holder Concentration (30%): Top 10 holders % of supply
 * - Liquidity Depth (25%): LP value / market cap
 * - Creator Activity (15%): Creator's trade history
 * - Token Age (10%): Time since creation
 * - Volume Consistency (10%): Stddev of daily volume
 * - Graduation Progress (10%): % to DEX graduation
 *
 * @example
 * ```typescript
 * const { score, level, factors, isLoading } = useRiskScore(token);
 * ```
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { KasPumpToken } from '../types';

// ============ Types ============

export type RiskLevel = 'low' | 'moderate' | 'elevated' | 'high';

export interface RiskFactor {
  name: string;
  description: string;
  weight: number;
  score: number; // 0-100, higher is safer
  value: string; // Display value
  status: 'good' | 'warning' | 'danger';
}

export interface RiskAnalysis {
  overallScore: number; // 0-100, higher is safer
  level: RiskLevel;
  factors: RiskFactor[];
  summary: string;
  lastUpdated: number;
}

interface UseRiskScoreReturn {
  analysis: RiskAnalysis | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ============ Risk Calculation Config ============

const RISK_WEIGHTS = {
  holderConcentration: 0.30,
  liquidityDepth: 0.25,
  creatorActivity: 0.15,
  tokenAge: 0.10,
  volumeConsistency: 0.10,
  graduationProgress: 0.10,
};

const RISK_THRESHOLDS = {
  low: 80,
  moderate: 60,
  elevated: 40,
  // below 40 = high risk
};

// ============ Calculation Functions ============

/**
 * Calculate holder concentration score
 * Lower concentration = higher score (safer)
 */
function calculateHolderConcentrationScore(
  topHoldersPercentage: number
): { score: number; status: RiskFactor['status']; value: string } {
  // topHoldersPercentage is the % held by top 10 holders
  // If top 10 hold < 30%, that's good
  // If top 10 hold > 70%, that's dangerous

  let score: number;
  let status: RiskFactor['status'];

  if (topHoldersPercentage <= 30) {
    score = 100 - topHoldersPercentage;
    status = 'good';
  } else if (topHoldersPercentage <= 50) {
    score = 70 - (topHoldersPercentage - 30);
    status = 'warning';
  } else if (topHoldersPercentage <= 70) {
    score = 40 - (topHoldersPercentage - 50) * 0.5;
    status = 'warning';
  } else {
    score = Math.max(0, 30 - (topHoldersPercentage - 70));
    status = 'danger';
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    status,
    value: `${topHoldersPercentage.toFixed(1)}%`,
  };
}

/**
 * Calculate liquidity depth score
 * Higher liquidity relative to market cap = safer
 */
function calculateLiquidityScore(
  liquidityValue: number,
  marketCap: number
): { score: number; status: RiskFactor['status']; value: string } {
  if (marketCap === 0) {
    return { score: 0, status: 'danger', value: 'N/A' };
  }

  const ratio = (liquidityValue / marketCap) * 100;

  let score: number;
  let status: RiskFactor['status'];

  if (ratio >= 50) {
    score = 100;
    status = 'good';
  } else if (ratio >= 30) {
    score = 70 + (ratio - 30) * 1.5;
    status = 'good';
  } else if (ratio >= 15) {
    score = 40 + (ratio - 15) * 2;
    status = 'warning';
  } else if (ratio >= 5) {
    score = 20 + (ratio - 5) * 2;
    status = 'warning';
  } else {
    score = ratio * 4;
    status = 'danger';
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    status,
    value: `${ratio.toFixed(1)}%`,
  };
}

/**
 * Calculate creator activity score
 * Creators who haven't dumped = safer
 */
function calculateCreatorScore(
  creatorSoldPercentage: number,
  hasCreatorVerification: boolean
): { score: number; status: RiskFactor['status']; value: string } {
  let score: number;
  let status: RiskFactor['status'];

  // Bonus for verified creator
  const verificationBonus = hasCreatorVerification ? 10 : 0;

  if (creatorSoldPercentage === 0) {
    score = 100;
    status = 'good';
  } else if (creatorSoldPercentage <= 10) {
    score = 90 - creatorSoldPercentage;
    status = 'good';
  } else if (creatorSoldPercentage <= 30) {
    score = 80 - (creatorSoldPercentage - 10) * 1.5;
    status = 'warning';
  } else if (creatorSoldPercentage <= 50) {
    score = 50 - (creatorSoldPercentage - 30);
    status = 'warning';
  } else {
    score = Math.max(0, 30 - (creatorSoldPercentage - 50) * 0.6);
    status = 'danger';
  }

  return {
    score: Math.min(100, Math.max(0, score) + verificationBonus),
    status,
    value: hasCreatorVerification ? 'Verified' : `${creatorSoldPercentage.toFixed(0)}% sold`,
  };
}

/**
 * Calculate token age score
 * Older tokens have more track record = safer (but not always)
 */
function calculateAgeScore(
  createdAt: Date
): { score: number; status: RiskFactor['status']; value: string } {
  const ageInHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  const ageInDays = ageInHours / 24;

  let score: number;
  let status: RiskFactor['status'];

  if (ageInHours < 1) {
    score = 20;
    status = 'danger';
  } else if (ageInHours < 24) {
    score = 20 + (ageInHours / 24) * 30;
    status = 'warning';
  } else if (ageInDays < 7) {
    score = 50 + (ageInDays / 7) * 20;
    status = 'warning';
  } else if (ageInDays < 30) {
    score = 70 + ((ageInDays - 7) / 23) * 15;
    status = 'good';
  } else {
    score = 85 + Math.min(15, (ageInDays - 30) / 60 * 15);
    status = 'good';
  }

  const value = ageInDays < 1
    ? `${Math.floor(ageInHours)}h`
    : `${Math.floor(ageInDays)}d`;

  return {
    score: Math.max(0, Math.min(100, score)),
    status,
    value,
  };
}

/**
 * Calculate volume consistency score
 * Consistent volume = healthier market = safer
 */
function calculateVolumeScore(
  volume24h: number,
  avgVolume7d: number,
  volumeStdDev: number
): { score: number; status: RiskFactor['status']; value: string } {
  if (avgVolume7d === 0) {
    return { score: 30, status: 'warning', value: 'Low activity' };
  }

  // Coefficient of variation (lower = more consistent)
  const cv = volumeStdDev / avgVolume7d;

  // Check for sudden volume spike (potential manipulation)
  const volumeRatio = volume24h / avgVolume7d;

  let score: number;
  let status: RiskFactor['status'];

  if (cv < 0.3 && volumeRatio < 3) {
    score = 90;
    status = 'good';
  } else if (cv < 0.5 && volumeRatio < 5) {
    score = 70;
    status = 'good';
  } else if (cv < 1 && volumeRatio < 10) {
    score = 50;
    status = 'warning';
  } else {
    score = 30;
    status = 'danger';
  }

  const value = cv < 0.5 ? 'Stable' : cv < 1 ? 'Moderate' : 'Volatile';

  return {
    score: Math.max(0, Math.min(100, score)),
    status,
    value,
  };
}

/**
 * Calculate graduation progress score
 * Closer to graduation = safer (locked liquidity)
 */
function calculateGraduationScore(
  progress: number,
  isGraduated: boolean
): { score: number; status: RiskFactor['status']; value: string } {
  if (isGraduated) {
    return { score: 100, status: 'good', value: 'Graduated ✓' };
  }

  let score: number;
  let status: RiskFactor['status'];

  if (progress >= 80) {
    score = 70 + (progress - 80) * 1.5;
    status = 'good';
  } else if (progress >= 50) {
    score = 50 + (progress - 50) * 0.67;
    status = 'warning';
  } else if (progress >= 20) {
    score = 30 + (progress - 20) * 0.67;
    status = 'warning';
  } else {
    score = progress * 1.5;
    status = 'danger';
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    status,
    value: `${progress.toFixed(0)}%`,
  };
}

/**
 * Get risk level from score
 */
function getRiskLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.low) return 'low';
  if (score >= RISK_THRESHOLDS.moderate) return 'moderate';
  if (score >= RISK_THRESHOLDS.elevated) return 'elevated';
  return 'high';
}

/**
 * Generate risk summary text
 */
function generateSummary(level: RiskLevel, factors: RiskFactor[]): string {
  const dangerFactors = factors.filter(f => f.status === 'danger');
  const warningFactors = factors.filter(f => f.status === 'warning');

  if (level === 'low') {
    return 'This token shows healthy metrics with good liquidity and holder distribution.';
  }

  if (level === 'moderate') {
    if (warningFactors.length > 0) {
      return `Some caution advised. Watch: ${warningFactors.map(f => f.name).join(', ')}.`;
    }
    return 'Moderate risk profile. Consider doing additional research.';
  }

  if (level === 'elevated') {
    return `Elevated risk detected. Concerns: ${dangerFactors.concat(warningFactors).map(f => f.name).join(', ')}.`;
  }

  return `High risk token. Major concerns: ${dangerFactors.map(f => f.name).join(', ')}. Trade with extreme caution.`;
}

// ============ Hook ============

export function useRiskScore(
  token: Partial<KasPumpToken> | undefined
): UseRiskScoreReturn {
  const [analysis, setAnalysis] = useState<RiskAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateRisk = useCallback(async () => {
    if (!token) {
      setAnalysis(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // In production, fetch additional data from API/contract
      // For now, use available token data with mock values for missing data

      const topHoldersPercentage = 35; // Mock - would come from holder analysis
      const liquidityValue = (token.marketCap ?? 0) * 0.2; // Mock - 20% liquidity
      const creatorSoldPercentage = 5; // Mock - would track creator transactions
      const hasCreatorVerification = false; // Would come from badge system
      const avgVolume7d = token.volume24h ?? 0;
      const volumeStdDev = avgVolume7d * 0.4; // Mock variance

      // Calculate each factor
      const holderFactor = calculateHolderConcentrationScore(topHoldersPercentage);
      const liquidityFactor = calculateLiquidityScore(
        liquidityValue,
        token.marketCap ?? 0
      );
      const creatorFactor = calculateCreatorScore(
        creatorSoldPercentage,
        hasCreatorVerification
      );
      const ageFactor = calculateAgeScore(token.createdAt ?? new Date());
      const volumeFactor = calculateVolumeScore(
        token.volume24h ?? 0,
        avgVolume7d,
        volumeStdDev
      );
      const graduationFactor = calculateGraduationScore(
        token.bondingCurveProgress ?? 0,
        token.isGraduated ?? false
      );

      // Build factors array
      const factors: RiskFactor[] = [
        {
          name: 'Holder Distribution',
          description: 'Concentration of tokens among top holders',
          weight: RISK_WEIGHTS.holderConcentration,
          ...holderFactor,
        },
        {
          name: 'Liquidity Depth',
          description: 'Available liquidity relative to market cap',
          weight: RISK_WEIGHTS.liquidityDepth,
          ...liquidityFactor,
        },
        {
          name: 'Creator Activity',
          description: 'Creator selling behavior and verification',
          weight: RISK_WEIGHTS.creatorActivity,
          ...creatorFactor,
        },
        {
          name: 'Token Age',
          description: 'Time since token creation',
          weight: RISK_WEIGHTS.tokenAge,
          ...ageFactor,
        },
        {
          name: 'Volume Stability',
          description: 'Trading volume consistency',
          weight: RISK_WEIGHTS.volumeConsistency,
          ...volumeFactor,
        },
        {
          name: 'Graduation Progress',
          description: 'Progress toward DEX graduation',
          weight: RISK_WEIGHTS.graduationProgress,
          ...graduationFactor,
        },
      ];

      // Calculate weighted overall score
      const overallScore = factors.reduce(
        (sum, factor) => sum + factor.score * factor.weight,
        0
      );

      const level = getRiskLevel(overallScore);
      const summary = generateSummary(level, factors);

      setAnalysis({
        overallScore,
        level,
        factors,
        summary,
        lastUpdated: Date.now(),
      });
    } catch (err) {
      console.error('Risk calculation failed:', err);
      setError('Failed to calculate risk score');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    calculateRisk();
  }, [calculateRisk]);

  return {
    analysis,
    isLoading,
    error,
    refresh: calculateRisk,
  };
}

export default useRiskScore;
