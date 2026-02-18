/**
 * useBadges Hook
 * Manages badge data for tokens and creators
 *
 * Features:
 * - Fetch badges from contract/API
 * - Calculate automatic badges
 * - Cache badge data
 *
 * @example
 * ```typescript
 * const { badges, isLoading, hasBadge } = useBadges(tokenAddress);
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BadgeType,
  getBadgeConfig,
  sortBadgesByPriority,
  calculateAutomaticBadges,
  BadgeConfig,
} from '../config/badges';
import { KasPumpToken } from '../types';

// ============ Types ============

export interface BadgeData {
  type: BadgeType;
  grantedAt?: number;
  expiresAt?: number;
  metadata?: string;
  config: BadgeConfig;
}

interface UseBadgesReturn {
  badges: BadgeData[];
  isLoading: boolean;
  error: string | null;
  hasBadge: (type: BadgeType) => boolean;
  refreshBadges: () => Promise<void>;
}

interface UseBadgesOptions {
  includeAutomatic?: boolean;
  token?: Partial<KasPumpToken>;
}

// ============ Cache ============

const badgeCache = new Map<string, {
  badges: BadgeType[];
  timestamp: number;
}>();

const CACHE_TTL = 60 * 1000; // 1 minute

// ============ Hook ============

export function useBadges(
  address: string | undefined,
  options: UseBadgesOptions = {}
): UseBadgesReturn {
  const { includeAutomatic = true, token } = options;

  const [contractBadges, setContractBadges] = useState<BadgeType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate automatic badges
  const automaticBadges = useMemo(() => {
    if (!includeAutomatic || !token) return [];

    return calculateAutomaticBadges({
      createdAt: token.createdAt ?? new Date(),
      holders: token.holders ?? 0,
      volume24h: token.volume24h ?? 0,
      marketCap: token.marketCap ?? 0,
      isGraduated: token.isGraduated ?? false,
    });
  }, [includeAutomatic, token]);

  // Combine and deduplicate badges
  const allBadges = useMemo(() => {
    const combined = Array.from(new Set([...contractBadges, ...automaticBadges]));
    const sorted = sortBadgesByPriority(combined);

    return sorted.map(type => ({
      type,
      config: getBadgeConfig(type),
    }));
  }, [contractBadges, automaticBadges]);

  // Fetch badges from contract/API
  const fetchBadges = useCallback(async () => {
    if (!address) {
      setContractBadges([]);
      return;
    }

    // Check cache
    const cached = badgeCache.get(address);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setContractBadges(cached.badges);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // In production, this would call the BadgeRegistry contract
      const response = await fetch(`/api/badges/${address}`);

      if (response.ok) {
        const data = await response.json();
        const badges = (data.badges || []) as BadgeType[];
        setContractBadges(badges);

        // Update cache
        badgeCache.set(address, {
          badges,
          timestamp: Date.now(),
        });
      } else {
        // No badges found - that's OK
        setContractBadges([]);
      }
    } catch (err) {
      console.error('Failed to fetch badges:', err);
      setError('Failed to load badges');
      setContractBadges([]);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Load badges on mount and address change
  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  // Check if has specific badge
  const hasBadge = useCallback((type: BadgeType): boolean => {
    return allBadges.some(b => b.type === type);
  }, [allBadges]);

  return {
    badges: allBadges,
    isLoading,
    error,
    hasBadge,
    refreshBadges: fetchBadges,
  };
}

/**
 * Hook for creator badges
 */
export function useCreatorBadges(
  creatorAddress: string | undefined
): UseBadgesReturn {
  return useBadges(creatorAddress, { includeAutomatic: false });
}

export default useBadges;
