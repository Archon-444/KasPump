'use client';

/**
 * FeeBadge — V2 (PR 5).
 *
 * Live trading-fee display for the bonding-curve AMM. Reads
 * `BondingCurveAMM.getPlatformFee()` (basis points) on mount and on every
 * `refreshTrigger` change; the parent `TradingInterface` flips the trigger
 * after a successful buy / sell so the badge re-reads against the new
 * post-trade supply. No interval polling.
 *
 * The fee is supply-linked + sniper-surcharge layered on the contract side
 * (see plan §6 / §1 in the PR 5 brief). We just render whatever the AMM
 * tells us — single source of truth.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Percent } from 'lucide-react';
import { useContracts } from '../../hooks/useContracts';
import { Badge } from '../ui';
import { cn } from '../../utils';

export interface FeeBadgeProps {
  /** AMM address to read getPlatformFee() from. */
  ammAddress: string;
  /**
   * Bumped by the parent on every successful trade so the badge re-reads.
   * Plain timestamp / counter — no semantics required beyond inequality.
   */
  refreshTrigger?: number;
  className?: string;
}

export const FeeBadge: React.FC<FeeBadgeProps> = ({
  ammAddress,
  refreshTrigger,
  className,
}) => {
  const contracts = useContracts();
  const [feeBps, setFeeBps] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    if (!ammAddress) {
      setLoading(false);
      setError(false);
      setFeeBps(null);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const amm = contracts.getBondingCurveContract(ammAddress);
      const bps = await amm.getPlatformFee();
      setFeeBps(BigInt(bps.toString()));
    } catch (err) {
      setError(true);
      console.warn('FeeBadge: getPlatformFee read failed', err);
    } finally {
      setLoading(false);
    }
  }, [ammAddress, contracts]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshTrigger]);

  const feePct =
    feeBps == null ? null : Number(feeBps) / 100; // 100 bps == 1.00%

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]',
        className
      )}
    >
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Percent size={12} className="text-yellow-400" />
        <span className="uppercase tracking-wider">Trading fee</span>
      </div>
      <div className="text-right">
        <div className="text-sm font-mono tabular-nums text-white">
          {loading ? 'Loading fee…' : error ? 'Fee unavailable' : feePct == null ? '—' : `${feePct.toFixed(2)}%`}
        </div>
        <div className="text-[10px] text-gray-500">
          {!ammAddress ? 'No AMM address' : 'decreases as token grows'}
        </div>
      </div>
      {feePct != null && feePct > 5 && (
        <Badge variant="warning" className="ml-2 text-[10px]">
          Sniper window
        </Badge>
      )}
    </div>
  );
};

export default FeeBadge;
