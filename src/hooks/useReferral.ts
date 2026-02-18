/**
 * useReferral Hook
 * Manages referral tracking, link generation, and reward display
 *
 * Features:
 * - Generate unique referral links
 * - Track referral attribution from URL params
 * - Display referral statistics
 * - Withdraw referral rewards
 *
 * @example
 * ```typescript
 * const {
 *   referralCode,
 *   referralLink,
 *   copyReferralLink,
 *   stats,
 *   withdrawRewards,
 *   isWithdrawing,
 *   referredBy,
 *   hasActiveReferral,
 * } = useReferral();
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';

// ============ Types ============

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  pendingRewards: string; // In native currency (BNB)
  lifetimeEarnings: string;
  referralCode: string;
}

export interface ReferralAttribution {
  referrer: string;
  timestamp: number;
  expiresAt: number;
  isActive: boolean;
}

interface UseReferralReturn {
  // Referral code & link
  referralCode: string;
  referralLink: string;
  copyReferralLink: () => Promise<boolean>;
  isCopied: boolean;

  // Stats
  stats: ReferralStats | null;
  isLoadingStats: boolean;
  refreshStats: () => Promise<void>;

  // Attribution
  referredBy: string | null;
  hasActiveReferral: boolean;
  attribution: ReferralAttribution | null;

  // Actions
  withdrawRewards: () => Promise<boolean>;
  isWithdrawing: boolean;
  withdrawError: string | null;

  // Registration
  registerReferral: (referrerCode: string) => Promise<boolean>;
}

// ============ Constants ============

const REFERRAL_STORAGE_KEY = 'kaspump_referral';
const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ============ Helper Functions ============

/**
 * Generate a short referral code from an address
 */
function generateReferralCode(address: string): string {
  if (!address) return '';
  // Use first 4 and last 4 characters for a memorable code
  return `${address.slice(2, 6)}${address.slice(-4)}`.toUpperCase();
}

/**
 * Validate a referral code format
 */
function isValidReferralCode(code: string): boolean {
  return /^[A-F0-9]{8}$/i.test(code);
}

/**
 * Extract referral code from URL
 */
function getReferralFromURL(): string | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');

  if (ref && (isValidReferralCode(ref) || ethers.isAddress(ref))) {
    return ref;
  }
  return null;
}

/**
 * Load stored referral attribution
 */
function loadStoredReferral(): ReferralAttribution | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored) as ReferralAttribution;

    // Check if still active
    if (Date.now() > data.expiresAt) {
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Store referral attribution
 */
function storeReferral(referrer: string): ReferralAttribution {
  const attribution: ReferralAttribution = {
    referrer,
    timestamp: Date.now(),
    expiresAt: Date.now() + ATTRIBUTION_WINDOW_MS,
    isActive: true,
  };

  localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(attribution));
  return attribution;
}

// ============ Hook ============

export function useReferral(): UseReferralReturn {
  const { address, isConnected } = useAccount();

  // State
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [attribution, setAttribution] = useState<ReferralAttribution | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Computed values
  const referralCode = useMemo(() => {
    return address ? generateReferralCode(address) : '';
  }, [address]);

  const referralLink = useMemo(() => {
    if (typeof window === 'undefined' || !address) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}?ref=${address}`;
  }, [address]);

  const referredBy = attribution?.referrer ?? null;
  const hasActiveReferral = attribution?.isActive ?? false;

  // Initialize attribution from URL or storage
  useEffect(() => {
    const urlRef = getReferralFromURL();
    const storedRef = loadStoredReferral();

    if (urlRef && !storedRef) {
      // New referral from URL
      const newAttribution = storeReferral(urlRef);
      setAttribution(newAttribution);

      // Clean URL without refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.toString());
    } else if (storedRef) {
      setAttribution(storedRef);
    }
  }, []);

  // Fetch referral stats
  const refreshStats = useCallback(async () => {
    if (!address || !isConnected) {
      setStats(null);
      return;
    }

    setIsLoadingStats(true);

    try {
      // In production, this would call the ReferralRegistry contract
      // For now, we'll use mock data or API
      const response = await fetch(`/api/referral/stats?address=${address}`);

      if (response.ok) {
        const data = await response.json();
        setStats({
          totalReferrals: data.totalReferrals ?? 0,
          activeReferrals: data.activeReferrals ?? 0,
          pendingRewards: data.pendingRewards ?? '0',
          lifetimeEarnings: data.lifetimeEarnings ?? '0',
          referralCode,
        });
      } else {
        // Default stats if API not available
        setStats({
          totalReferrals: 0,
          activeReferrals: 0,
          pendingRewards: '0',
          lifetimeEarnings: '0',
          referralCode,
        });
      }
    } catch (error) {
      console.error('Failed to fetch referral stats:', error);
      setStats({
        totalReferrals: 0,
        activeReferrals: 0,
        pendingRewards: '0',
        lifetimeEarnings: '0',
        referralCode,
      });
    } finally {
      setIsLoadingStats(false);
    }
  }, [address, isConnected, referralCode]);

  // Load stats on mount and when address changes
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Copy referral link to clipboard
  const copyReferralLink = useCallback(async (): Promise<boolean> => {
    if (!referralLink) return false;

    try {
      await navigator.clipboard.writeText(referralLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = referralLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      return true;
    }
  }, [referralLink]);

  // Register a referral (called when user makes first action)
  const registerReferral = useCallback(async (referrerCode: string): Promise<boolean> => {
    if (!address || !referrerCode) return false;

    try {
      const response = await fetch('/api/referral/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: address,
          referrer: referrerCode,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to register referral:', error);
      return false;
    }
  }, [address]);

  // Withdraw pending rewards
  const withdrawRewards = useCallback(async (): Promise<boolean> => {
    if (!address || !stats?.pendingRewards || parseFloat(stats.pendingRewards) === 0) {
      setWithdrawError('No rewards to withdraw');
      return false;
    }

    setIsWithdrawing(true);
    setWithdrawError(null);

    try {
      // In production, this would call the contract's withdrawRewards function
      const response = await fetch('/api/referral/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (response.ok) {
        await refreshStats();
        return true;
      } else {
        const error = await response.json();
        setWithdrawError(error.message || 'Withdrawal failed');
        return false;
      }
    } catch (error) {
      console.error('Withdrawal failed:', error);
      setWithdrawError('Network error. Please try again.');
      return false;
    } finally {
      setIsWithdrawing(false);
    }
  }, [address, stats?.pendingRewards, refreshStats]);

  return {
    referralCode,
    referralLink,
    copyReferralLink,
    isCopied,
    stats,
    isLoadingStats,
    refreshStats,
    referredBy,
    hasActiveReferral,
    attribution,
    withdrawRewards,
    isWithdrawing,
    withdrawError,
    registerReferral,
  };
}

export default useReferral;
