/**
 * useReferral Hook
 * Manages referral link generation and referrer earnings tracking
 *
 * Features:
 * - Generate shareable referral links
 * - Track referrer earnings from TokenFactory
 * - Track per-token referral fees from BondingCurveAMM
 * - Copy referral link to clipboard
 *
 * @example
 * ```typescript
 * const { referralLink, stats, copyLink, isLoading } = useReferral();
 * ```
 */

import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useAccount } from 'wagmi';
import TokenFactoryABI from '@/abis/TokenFactory.json';
import { useMultichainWallet } from './useMultichainWallet';
import { supportedChains, getChainById, isTestnet } from '../config/chains';
import { getTokenFactoryAddress } from '../config/contracts';

export interface ReferralStats {
  /** Total BNB/ETH earned from creation fee referrals */
  totalCreationEarnings: number;
  /** Total number of tokens referred */
  totalTokensReferred: number;
  /** Referral link for sharing */
  referralLink: string;
}

export function useReferral() {
  const wallet = useMultichainWallet();
  const { address } = useAccount();
  const [stats, setStats] = useState<ReferralStats>({
    totalCreationEarnings: 0,
    totalTokensReferred: 0,
    referralLink: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate referral link
  const referralLink = address
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/launch?ref=${address}`
    : '';

  // Copy referral link to clipboard
  const copyLink = useCallback(async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [referralLink]);

  // Fetch referral stats from on-chain data
  const fetchStats = useCallback(async () => {
    if (!wallet.connected || !wallet.address) {
      setStats({ totalCreationEarnings: 0, totalTokensReferred: 0, referralLink });
      return;
    }

    setIsLoading(true);
    try {
      let totalEarnings = 0;
      let totalTokens = 0;

      const mainnetChains = supportedChains.filter(chain => !isTestnet(chain.id));

      for (const chain of mainnetChains) {
        try {
          const chainConfig = getChainById(chain.id);
          if (!chainConfig) continue;

          const rpcUrl = chainConfig.rpcUrls.default.http[0];
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          const factoryAddress = getTokenFactoryAddress(chain.id);
          if (!factoryAddress) continue;

          const factory = new ethers.Contract(factoryAddress, TokenFactoryABI.abi, provider);

          try {
            const [earnings, tokenCount] = await factory.getReferrerStats(wallet.address);
            totalEarnings += parseFloat(ethers.formatEther(earnings));
            totalTokens += Number(tokenCount);
          } catch {
            // Contract may not have referral functions yet (pre-upgrade)
          }
        } catch {
          // Skip chain on error
        }
      }

      setStats({
        totalCreationEarnings: totalEarnings,
        totalTokensReferred: totalTokens,
        referralLink,
      });
    } catch (err) {
      console.error('Failed to fetch referral stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [wallet.connected, wallet.address, referralLink]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    referralLink,
    copyLink,
    copied,
    isLoading,
    refresh: fetchStats,
  };
}
