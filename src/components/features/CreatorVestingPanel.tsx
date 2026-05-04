'use client';

/**
 * CreatorVestingPanel — V2 (PR 5).
 *
 * Surfaces the post-graduation creator vesting drip on the token detail
 * page. The 20%-of-remainder allocation is held in the per-token
 * `CreatorVesting` contract (deployed at graduation by the AMM); this
 * component displays its state and exposes the `claim()` CTA.
 *
 * Per the PR 5 plan:
 *   - The Claim button is always visible while the panel renders.
 *   - It is enabled only when `connectedWallet === beneficiary && claimable > 0`.
 *   - For non-beneficiary viewers it shows a disabled button with the
 *     sub-line "Only the creator can claim vested tokens." (visible trust
 *     cue, not hidden).
 *   - The panel hides only when `creatorVesting === address(0)`
 *     (token has not graduated yet).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { Lock, Loader, CheckCircle, ExternalLink } from 'lucide-react';
import { useAccount } from 'wagmi';
import { Card, Button, Progress } from '../ui';
import { useContracts } from '../../hooks/useContracts';
import { getExplorerUrl } from '../../config/chains';
import { cn } from '../../utils';
import CreatorVestingABI from '../../abis/CreatorVesting.json';
import type { KasPumpToken } from '../../types';

// Local minimal typings — typechain types don't include the PR 3
// additions (`creatorVesting()` on the AMM, the CreatorVesting contract
// itself) until a hardhat compile + typechain regen runs. Until then we
// cast contract handles through these interfaces so the rest of this
// component is statically checked.
interface AmmWithVesting {
  creatorVesting(): Promise<string>;
}
interface CreatorVestingContract {
  beneficiary(): Promise<string>;
  totalAmount(): Promise<bigint>;
  vested(): Promise<bigint>;
  claimable(): Promise<bigint>;
  claimed(): Promise<bigint>;
  startTime(): Promise<bigint>;
  endTime(): Promise<bigint>;
  claim(): Promise<{ wait(): Promise<unknown> }>;
}

export interface CreatorVestingPanelProps {
  token: KasPumpToken;
  className?: string;
}

interface VestingState {
  vestingAddress: string;
  beneficiary: string;
  totalAmount: bigint;
  vested: bigint;
  claimable: bigint;
  claimed: bigint;
  startTime: bigint;
  endTime: bigint;
}

export const CreatorVestingPanel: React.FC<CreatorVestingPanelProps> = ({
  token,
  className,
}) => {
  const contracts = useContracts();
  const { address: connectedWallet, chainId } = useAccount();

  const [state, setState] = useState<VestingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string>('');

  const refresh = useCallback(async () => {
    if (!token.ammAddress) {
      setLoading(false);
      return;
    }
    try {
      const amm = contracts.getBondingCurveContract(token.ammAddress) as unknown as AmmWithVesting;
      const vestingAddress: string = await amm.creatorVesting();
      if (!vestingAddress || vestingAddress === ethers.ZeroAddress) {
        setState(null);
        return;
      }
      // Read-only provider is sufficient for these views.
      const runner = contracts.signer ?? contracts.readProvider ?? contracts.provider;
      if (!runner) return;
      const vesting = new ethers.Contract(
        vestingAddress,
        CreatorVestingABI.abi,
        runner
      ) as unknown as CreatorVestingContract;
      const [
        beneficiary,
        totalAmount,
        vested,
        claimable,
        claimed,
        startTime,
        endTime,
      ] = await Promise.all([
        vesting.beneficiary(),
        vesting.totalAmount(),
        vesting.vested(),
        vesting.claimable(),
        vesting.claimed(),
        vesting.startTime(),
        vesting.endTime(),
      ]);
      setState({
        vestingAddress,
        beneficiary,
        totalAmount: BigInt(totalAmount.toString()),
        vested: BigInt(vested.toString()),
        claimable: BigInt(claimable.toString()),
        claimed: BigInt(claimed.toString()),
        startTime: BigInt(startTime.toString()),
        endTime: BigInt(endTime.toString()),
      });
    } catch (err) {
      console.warn('CreatorVestingPanel: refresh failed', err);
    } finally {
      setLoading(false);
    }
  }, [contracts, token.ammAddress]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleClaim = useCallback(async () => {
    if (!state || !contracts.signer) return;
    setClaiming(true);
    setClaimError('');
    try {
      const vesting = new ethers.Contract(
        state.vestingAddress,
        CreatorVestingABI.abi,
        contracts.signer
      ) as unknown as CreatorVestingContract;
      const tx = await vesting.claim();
      await tx.wait();
      await refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Claim failed.';
      setClaimError(message);
    } finally {
      setClaiming(false);
    }
  }, [contracts.signer, refresh, state]);

  if (loading) {
    return (
      <Card className={cn('p-4 flex items-center gap-2 text-sm text-gray-500', className)}>
        <Loader size={14} className="animate-spin" />
        <span>Loading creator vesting…</span>
      </Card>
    );
  }

  // No vesting deployed yet (token not graduated). Hide entirely.
  if (!state) return null;

  const isBeneficiary =
    connectedWallet != null &&
    state.beneficiary.toLowerCase() === connectedWallet.toLowerCase();
  const hasClaimable = state.claimable > 0n;
  const fullyClaimed = state.claimed >= state.totalAmount && state.totalAmount > 0n;
  const progressPct =
    state.totalAmount === 0n
      ? 0
      : Number((state.vested * 10000n) / state.totalAmount) / 100;

  const fmt = (v: bigint) => parseFloat(ethers.formatEther(v));

  const explorerUrl =
    chainId && state.vestingAddress
      ? getExplorerUrl(chainId, 'address', state.vestingAddress)
      : '';

  return (
    <Card className={cn('p-5 space-y-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <Lock size={15} className="text-yellow-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Creator vesting</div>
            <div className="text-xs text-gray-400">
              Linear drip over 6 months · cliff at graduation
            </div>
          </div>
        </div>
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 whitespace-nowrap"
          >
            Contract
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-gray-400 uppercase tracking-wider">Vested</span>
          <span className="font-mono tabular-nums text-white">
            {progressPct.toFixed(1)}%
          </span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <Stat label="Total" value={`${fmt(state.totalAmount).toLocaleString()} ${token.symbol}`} />
        <Stat label="Vested" value={`${fmt(state.vested).toLocaleString()} ${token.symbol}`} />
        <Stat label="Claimable" value={`${fmt(state.claimable).toLocaleString()} ${token.symbol}`} />
        <Stat label="Already claimed" value={`${fmt(state.claimed).toLocaleString()} ${token.symbol}`} />
      </div>

      <div>
        <Button
          variant="gradient"
          fullWidth
          loading={claiming}
          disabled={!isBeneficiary || !hasClaimable || claiming || fullyClaimed}
          onClick={() => void handleClaim()}
          icon={fullyClaimed ? <CheckCircle size={14} /> : undefined}
        >
          {fullyClaimed
            ? 'Fully claimed'
            : hasClaimable
            ? `Claim ${fmt(state.claimable).toLocaleString()} ${token.symbol}`
            : 'Nothing claimable yet'}
        </Button>
        {!isBeneficiary && (
          <p className="text-[11px] text-gray-500 mt-2 text-center">
            Only the creator can claim vested tokens.
          </p>
        )}
        {claimError && (
          <p className="text-[11px] text-red-400 mt-2 text-center break-all">
            {claimError}
          </p>
        )}
      </div>
    </Card>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col gap-0.5 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
    <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
    <span className="text-xs text-gray-200 font-mono tabular-nums break-all">{value}</span>
  </div>
);

export default CreatorVestingPanel;
