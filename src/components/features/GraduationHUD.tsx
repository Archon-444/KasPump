'use client';

/**
 * GraduationHUD — V2 (PR 5 + Lane 2 polish).
 *
 * Promotes the bonding-curve graduation progress out of the right-side
 * info card and into the buy/sell HUD so traders see how close the token
 * is to "graduates to real liquidity automatically" without scrolling.
 *
 * Pre-graduation: progress bar + "X% to graduation" + native-left-to-graduate.
 * Post-graduation: "Graduated — LP active" with a link to the DEX pair.
 *
 * Lane 2 polish (PR 6): explicit loading + error states with a Retry CTA so
 * smoke testers see something useful instead of a half-rendered HUD when a
 * contract read transiently fails. The progress bar always renders from the
 * `token.bondingCurveProgress` value (which is read from the API and cached
 * client-side), so the bar never disappears — only the native-left readout
 * shows the loading/error.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Rocket, ExternalLink, Target, AlertTriangle, Loader, RefreshCw } from 'lucide-react';
import { ethers } from 'ethers';
import { useAccount } from 'wagmi';
import { Card, Progress } from '../ui';
import { useContracts } from '../../hooks/useContracts';
import { getExplorerUrl } from '../../config/chains';
import { formatCurrency, cn } from '../../utils';
import type { KasPumpToken } from '../../types';

export interface GraduationHUDProps {
  token: KasPumpToken;
  /** Bumped on every successful trade so the HUD re-reads native-left. */
  refreshTrigger?: number;
  className?: string;
}

type ReadStatus = 'loading' | 'ready' | 'error';

export const GraduationHUD: React.FC<GraduationHUDProps> = ({
  token,
  refreshTrigger,
  className,
}) => {
  const { chainId } = useAccount();
  const contracts = useContracts();

  const [nativeLeftToGraduate, setNativeLeftToGraduate] = useState<bigint | null>(null);
  const [nativeLeftStatus, setNativeLeftStatus] = useState<ReadStatus>('loading');
  const [nativeLeftError, setNativeLeftError] = useState<string>('');

  const [lpPair, setLpPair] = useState<string>('');
  const [lpStatus, setLpStatus] = useState<ReadStatus>('loading');

  // Pre-graduation read: cumulative-cost integrals at threshold and at the
  // current supply, derive the gap. Naming mirrors the plan spec verbatim
  // so future readers don't mistake this for a sell-proceeds calc.
  const refreshNativeLeft = useCallback(async () => {
    if (!token.ammAddress || token.isGraduated) return;
    setNativeLeftStatus(prev => (prev === 'ready' ? 'ready' : 'loading'));
    try {
      const amm = contracts.getBondingCurveContract(token.ammAddress);
      const [graduationThreshold, currentSupply] = await Promise.all([
        amm.graduationThreshold(),
        amm.currentSupply(),
      ]);
      const [cumulativeCostAtThreshold, cumulativeCostAtCurrentSupply] = await Promise.all([
        amm.calculateNativeOut(graduationThreshold, graduationThreshold),
        amm.calculateNativeOut(currentSupply, currentSupply),
      ]);
      const nativeLeft =
        BigInt(cumulativeCostAtThreshold.toString()) -
        BigInt(cumulativeCostAtCurrentSupply.toString());
      setNativeLeftToGraduate(nativeLeft);
      setNativeLeftStatus('ready');
      setNativeLeftError('');
    } catch (err) {
      console.warn('GraduationHUD: native-left read failed', err);
      setNativeLeftStatus('error');
      setNativeLeftError(err instanceof Error ? err.message : 'Read failed');
    }
  }, [contracts, token.ammAddress, token.isGraduated]);

  useEffect(() => {
    void refreshNativeLeft();
  }, [refreshNativeLeft, refreshTrigger]);

  // Post-graduation: pull the LP pair address for the DEX link.
  useEffect(() => {
    if (!token.ammAddress || !token.isGraduated) return;
    let cancelled = false;
    (async () => {
      setLpStatus('loading');
      try {
        const amm = contracts.getBondingCurveContract(token.ammAddress);
        const pair = await amm.lpTokenAddress();
        if (!cancelled) {
          setLpPair(pair);
          setLpStatus('ready');
        }
      } catch (err) {
        console.warn('GraduationHUD: lpTokenAddress read failed', err);
        if (!cancelled) setLpStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contracts, token.ammAddress, token.isGraduated]);

  if (token.isGraduated) {
    const explorerUrl =
      lpPair && chainId ? getExplorerUrl(chainId, 'address', lpPair) : '';
    return (
      <Card className={cn('p-4 border-green-500/20 bg-green-500/[0.04]', className)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center">
              <Rocket size={16} className="text-green-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Graduated — LP active</div>
              <div className="text-xs text-gray-400">
                Liquidity is paired at the curve&apos;s final price and LP tokens are
                locked for 6 months.
              </div>
            </div>
          </div>
          {lpStatus === 'loading' && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Loader size={12} className="animate-spin" /> Loading pair…
            </span>
          )}
          {lpStatus === 'ready' && explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 whitespace-nowrap"
            >
              View pair
              <ExternalLink size={12} />
            </a>
          )}
          {lpStatus === 'error' && (
            <span
              className="flex items-center gap-1 text-xs text-yellow-300"
              title="Could not read the LP pair address"
            >
              <AlertTriangle size={12} /> Pair link unavailable
            </span>
          )}
        </div>
      </Card>
    );
  }

  // Pre-graduation HUD. The bar always renders from the cached
  // `bondingCurveProgress`; the native-left readout layers on top.
  const progressPct = Math.max(0, Math.min(100, token.bondingCurveProgress));
  const remainingPct = Math.max(0, 100 - progressPct);
  const nativeLeftFmt =
    nativeLeftToGraduate == null
      ? null
      : parseFloat(ethers.formatEther(nativeLeftToGraduate));

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-yellow-400" />
          <span className="text-xs uppercase tracking-wider text-gray-400">
            Graduation progress
          </span>
        </div>
        <span className="text-sm font-mono tabular-nums text-white">
          {progressPct.toFixed(1)}%
        </span>
      </div>
      <Progress value={progressPct} className="h-2.5" />
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <span>{remainingPct.toFixed(1)}% sold left until graduation</span>
        {nativeLeftStatus === 'loading' && (
          <span className="flex items-center gap-1 text-gray-400">
            <Loader size={10} className="animate-spin" /> calculating…
          </span>
        )}
        {nativeLeftStatus === 'ready' && nativeLeftFmt != null && (
          <span className="text-gray-300">
            ~{formatCurrency(nativeLeftFmt, 'BNB', 4)} to go
          </span>
        )}
        {nativeLeftStatus === 'error' && (
          <button
            onClick={() => void refreshNativeLeft()}
            className="flex items-center gap-1 text-yellow-300 hover:text-yellow-200"
            title={nativeLeftError || 'Read failed'}
          >
            <RefreshCw size={10} /> Retry
          </button>
        )}
      </div>
    </Card>
  );
};

export default GraduationHUD;
