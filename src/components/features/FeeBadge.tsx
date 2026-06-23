'use client';

/**
 * FeeBadge — V2 (PR 5 + Lane 2 polish).
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
 *
 * Lane 2 polish (PR 6): explicit loading + error + empty states so smoke
 * testers never see a silent blank. The badge always shows something
 * useful — current fee, "Loading…", or an error tooltip.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Percent, AlertTriangle } from 'lucide-react';
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

type FeeBadgeStatus = 'loading' | 'ready' | 'error';

export const FeeBadge: React.FC<FeeBadgeProps> = ({
  ammAddress,
  refreshTrigger,
  className,
}) => {
  const contracts = useContracts();
  const [feeBps, setFeeBps] = useState<bigint | null>(null);
  const [status, setStatus] = useState<FeeBadgeStatus>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const refresh = useCallback(async () => {
    if (!ammAddress) {
      setStatus('error');
      setErrorMsg('No AMM address');
      return;
    }
    setStatus(prev => (prev === 'ready' ? 'ready' : 'loading'));
    try {
      const amm = contracts.getBondingCurveContract(ammAddress);
      const bps = await amm.getPlatformFee();
      setFeeBps(BigInt(bps.toString()));
      setStatus('ready');
      setErrorMsg('');
    } catch (err) {
      console.warn('FeeBadge: getPlatformFee read failed', err);
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Read failed');
    }
  }, [ammAddress, contracts]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshTrigger]);

  const feePct =
    feeBps == null ? null : Number(feeBps) / 100; // 100 bps == 1.00%

  const valueLabel = (() => {
    if (status === 'loading' && feePct == null) return 'Loading…';
    if (status === 'error' && feePct == null) return '—';
    return feePct == null ? '—' : `${feePct.toFixed(2)}%`;
  })();

  const subline =
    status === 'error'
      ? 'Live fee read failed — using last value'
      : 'decreases as token grows';

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]',
        status === 'error' && 'border-yellow-500/20 bg-yellow-500/[0.03]',
        className
      )}
      title={status === 'error' ? errorMsg : undefined}
    >
      <div className="flex items-center gap-2 text-xs text-gray-400">
        {status === 'error' ? (
          <AlertTriangle size={12} className="text-yellow-400" />
        ) : (
          <Percent size={12} className="text-yellow-400" />
        )}
        <span className="uppercase tracking-wider">Trading fee</span>
      </div>
      <div className="text-right">
        <div
          className={cn(
            'text-sm font-mono tabular-nums',
            status === 'error' ? 'text-yellow-300' : 'text-white'
          )}
        >
          {valueLabel}
        </div>
        <div className="text-[10px] text-gray-500">{subline}</div>
      </div>
      {feePct != null && feePct > 5 && status !== 'error' && (
        <Badge variant="warning" className="ml-2 text-[10px]">
          Sniper window
        </Badge>
      )}
    </div>
  );
};

export default FeeBadge;
