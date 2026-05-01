'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Settings,
  Zap,
  Shield,
  AlertTriangle,
  DollarSign,
  Percent,
  Clock,
  Calculator
} from 'lucide-react';
import { Card, Button, Badge, Progress } from '../ui';
import { TransactionPreviewModal } from './TransactionPreviewModal';
import { FeeBadge } from './FeeBadge';
import { KasPumpToken, TradeData } from '../../types';
import { useContracts } from '../../hooks/useContracts';
import { formatCurrency, formatPercentage, cn } from '../../utils';

export interface TradingInterfaceProps {
  token: KasPumpToken;
  onTrade?: (trade: TradeData) => Promise<void> | void;
  userBalance?: number;
  userTokenBalance?: number;
  className?: string;
}

export const TradingInterface: React.FC<TradingInterfaceProps> = ({
  token,
  onTrade,
  userBalance = 0,
  userTokenBalance = 0,
  className
}) => {
  const contracts = useContracts();
  const getSwapQuote = contracts.getSwapQuote;
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(1.0);
  const [showSettings, setShowSettings] = useState(false);
  const [expectedOutput, setExpectedOutput] = useState(0);
  const [priceImpact, setPriceImpact] = useState(0);
  const [minimumReceived, setMinimumReceived] = useState(0);
  const [fees, setFees] = useState(0);
  const [gasFee, setGasFee] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  // PR 5 — bumped on every successful trade so <FeeBadge /> re-reads
  // `getPlatformFee()` against the new post-trade supply. No interval polling.
  const [lastTradeAt, setLastTradeAt] = useState<number>(0);
  const [feeBps, setFeeBps] = useState<number>(0);
  const [sniperProtectionRemaining, setSniperProtectionRemaining] = useState<number>(0);

  const slippagePresets = [0.1, 0.5, 1.0, 3.0];
  const amountPresets = [25, 50, 75, 100];

  // Calculate trade details using real bonding curve math
  const calculateTradeDetails = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0 || !getSwapQuote) {
      setExpectedOutput(0);
      setPriceImpact(0);
      setMinimumReceived(0);
      setFees(0);
      setGasFee(0);
      return;
    }

    const inputAmount = parseFloat(amount);
    setQuoteLoading(true);

    try {
      // Get real quote from bonding curve contract
      const quote = await getSwapQuote(token.address, inputAmount, tradeType);

      setExpectedOutput(quote.outputAmount);
      setPriceImpact(quote.priceImpact);
      setMinimumReceived(quote.minimumOutput);

      // PR 5: live fee from the AMM. The hardcoded MCAP-tier fallback that
      // used to live here mirrored the pre-V2 fee model; the V2 contract
      // exposes the continuous-decay value directly via getPlatformFee()
      // (basis points), and the FeeBadge already displays it. Here we just
      // mirror it onto the trade-preview "Total fee" cell.
      const feeRate = feeBps / 10000;
      setFees(inputAmount * feeRate);
      setGasFee(quote.gasFee);
    } catch (error) {
      console.error('Failed to get swap quote:', error);
      // Reset on error
      setExpectedOutput(0);
      setPriceImpact(0);
      setMinimumReceived(0);
      setFees(0);
      setGasFee(0);
    } finally {
      setQuoteLoading(false);
    }
  }, [amount, tradeType, token.address, getSwapQuote, slippage, feeBps]);

  // Calculate trade details when amount or trade type changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateTradeDetails();
    }, 500); // Debounce to avoid too many contract calls

    return () => clearTimeout(timeoutId);
  }, [calculateTradeDetails]);

  // PR 5 — keep `feeBps` in sync with the AMM's live continuous-decay
  // fee. Re-reads on mount and after every successful trade (lastTradeAt
  // bump). The on-chain value is the single source of truth; the
  // FeeBadge above renders the same value via its own read.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!token.ammAddress) return;
        const amm = contracts.getBondingCurveContract(token.ammAddress);
        const bps = await amm.getPlatformFee();
        if (!cancelled) setFeeBps(Number(bps.toString()));
      } catch (err) {
        console.warn('TradingInterface: getPlatformFee read failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contracts, token.ammAddress, lastTradeAt]);

  const handleQuickAmount = (percentage: number) => {
    const maxAmount = tradeType === 'buy' ? userBalance : userTokenBalance;
    const quickAmount = (maxAmount * percentage / 100).toString();
    setAmount(quickAmount);
  };

  const handleTradeClick = () => {
    if (!amount || parseFloat(amount) <= 0 || isInsufficientBalance() || quoteLoading) return;
    setShowPreview(true);
  };

  const handleConfirmTrade = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setShowPreview(false);
    setLoading(true);
    try {
      const tradePayload: TradeData = {
        tokenAddress: token.address,
        action: tradeType,
        baseAmount: parseFloat(amount),
        slippageTolerance: slippage,
        expectedOutput,
        priceImpact,
        gasFee,
      };

      await onTrade?.(tradePayload);
      // PR 5 — bump on success so FeeBadge + the local feeBps mirror
      // re-read against post-trade supply.
      setLastTradeAt(Date.now());
    } catch (error) {
      console.error('Trade error:', error);
    } finally {
      setLoading(false);
    }
  };

  const isInsufficientBalance = () => {
    const inputAmount = parseFloat(amount) || 0;
    return tradeType === 'buy' ? inputAmount > userBalance : inputAmount > userTokenBalance;
  };

  const getTradeButtonText = () => {
    if (!amount || parseFloat(amount) <= 0) return `Enter ${tradeType === 'buy' ? 'BNB' : token.symbol} amount`;
    if (isInsufficientBalance()) return 'Insufficient Balance';
    if (quoteLoading) return 'Fetching quote...';
    if (loading) return `${tradeType === 'buy' ? 'Buying' : 'Selling'}...`;
    return `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${token.symbol}`;
  };

  useEffect(() => {
    let cancelled = false;
    if (!token.ammAddress) {
      setSniperProtectionRemaining(0);
      return;
    }
    (async () => {
      try {
        const amm = contracts.getBondingCurveContract(token.ammAddress);
        const [active, remaining] = await Promise.all([
          amm.isSniperProtectionActive(),
          amm.sniperProtectionRemaining(),
        ]);
        if (!cancelled) {
          setSniperProtectionRemaining(
            active ? Number(remaining.toString()) : 0
          );
        }
      } catch (error) {
        // TODO(PR7): replace heuristic fallback with contract read once universally exposed.
        if (!token.createdAt || cancelled) return;
        const elapsed = (Date.now() - token.createdAt.getTime()) / 1000;
        setSniperProtectionRemaining(Math.max(0, Math.ceil(60 - elapsed)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contracts, token.ammAddress, token.createdAt, lastTradeAt]);

  const sniperProtectionActive = sniperProtectionRemaining > 0;
  const sniperSecondsLeft = sniperProtectionRemaining;

  return (
    <Card className={cn('p-5 space-y-5', className)}>
      {/* PR 5 — Live fee badge. Reads getPlatformFee() from the AMM on
          mount and on every successful-trade trigger (lastTradeAt bump).
          Visually attached to the anti-sniper banner so the surcharge
          during the window reads as connected to its source. */}
      {token.ammAddress && (
        <FeeBadge ammAddress={token.ammAddress} refreshTrigger={lastTradeAt} />
      )}

      {/* Anti-sniper protection banner */}
      {sniperProtectionActive && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-yellow-500/[0.08] border border-yellow-500/[0.15] rounded-xl">
          <Shield size={14} className="text-yellow-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-yellow-400">Anti-sniper protection active</p>
            <p className="text-[10px] text-yellow-400/60">Higher fees for {sniperSecondsLeft}s to prevent bot sniping</p>
          </div>
          <span className="text-xs font-bold text-yellow-400 tabular-nums">{sniperSecondsLeft}s</span>
        </div>
      )}

      {/* Trade Type Selector */}
      <div className="flex items-center gap-1.5 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
        <button
          onClick={() => setTradeType('buy')}
          className={cn(
            'flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200',
            'touch-manipulation',
            tradeType === 'buy'
              ? 'bg-green-500/15 text-green-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <TrendingUp size={17} />
            <span className="text-sm">Buy</span>
          </div>
        </button>
        <button
          onClick={() => setTradeType('sell')}
          className={cn(
            'flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200',
            'touch-manipulation',
            tradeType === 'sell'
              ? 'bg-red-500/15 text-red-400 shadow-sm'
              : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <TrendingDown size={17} />
            <span className="text-sm">Sell</span>
          </div>
        </button>
      </div>

      {/* Amount Input */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {tradeType === 'buy' ? 'You pay' : 'You sell'}
          </label>
          <div className="text-xs text-gray-500 tabular-nums">
            Balance: {formatCurrency(tradeType === 'buy' ? userBalance : userTokenBalance, tradeType === 'buy' ? 'BNB' : token.symbol)}
          </div>
        </div>

        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            className={cn(
              'w-full px-4 py-4 bg-white/[0.03] border border-white/[0.08] rounded-xl',
              'text-xl font-mono text-white placeholder-gray-600',
              'focus:outline-none focus:border-yellow-500/40 focus:ring-2 focus:ring-yellow-500/20',
              'transition-all duration-200',
              'touch-manipulation',
              isInsufficientBalance() && 'border-red-500/40 focus:border-red-500/40 focus:ring-red-500/20'
            )}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-xs uppercase tracking-wider">
            {tradeType === 'buy' ? 'BNB' : token.symbol}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {amountPresets.map((preset) => (
            <button
              key={preset}
              onClick={() => handleQuickAmount(preset)}
              className={cn(
                'py-2 bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12]',
                'text-gray-400 hover:text-gray-200 font-medium rounded-lg transition-all duration-150',
                'text-xs',
                'touch-manipulation'
              )}
            >
              {preset === 100 ? 'Max' : `${preset}%`}
            </button>
          ))}
        </div>
      </div>

      {/* Expected Output */}
      {amount && parseFloat(amount) > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3 p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.06]"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              {tradeType === 'buy' ? 'You receive (est.)' : 'You receive'}
            </span>
            <span className="text-lg font-mono text-white">
              {formatCurrency(expectedOutput, tradeType === 'buy' ? token.symbol : 'BNB')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 flex items-center">
                <Percent size={12} className="mr-1" />
                Price Impact
              </span>
              <span className={cn(
                'font-medium',
                priceImpact > 5 ? 'text-red-400' : priceImpact > 2 ? 'text-yellow-400' : 'text-green-400'
              )}>
                {priceImpact.toFixed(2)}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400 flex items-center">
                <Shield size={12} className="mr-1" />
                Min. Received
              </span>
              <span className="text-gray-300 font-mono">
                {formatCurrency(minimumReceived, tradeType === 'buy' ? token.symbol : 'BNB', 6)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400 flex items-center">
                <DollarSign size={12} className="mr-1" />
                Total Fee
              </span>
              <span className="text-gray-300 font-mono">
                {formatCurrency(fees, 'BNB', 6)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 ml-4">
                50% to creator / 45% platform / 5% referrer
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400 flex items-center">
                <Clock size={12} className="mr-1" />
                Est. Time
              </span>
              <span className="text-green-400 font-medium">
                ~10s
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Slippage Settings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300 flex items-center">
            <Settings size={16} className="mr-2" />
            Slippage Tolerance
          </span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            <Settings size={16} />
          </button>
        </div>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2">
                {slippagePresets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setSlippage(preset)}
                    className={cn(
                      'px-3 py-2 rounded-md text-sm font-medium transition-all',
                      slippage === preset
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    )}
                  >
                    {preset}%
                  </button>
                ))}
                
                <div className="relative">
                  <input
                    type="number"
                    value={slippage}
                    onChange={(e) => setSlippage(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white text-center focus:outline-none focus:border-yellow-500"
                    step="0.1"
                    min="0.1"
                    max="50"
                  />
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                </div>
              </div>

              {slippage > 5 && (
                <div className="flex items-center space-x-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <AlertTriangle size={16} className="text-yellow-400" />
                  <span className="text-yellow-400 text-sm">
                    High slippage tolerance may result in unfavorable trades
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Trade Button */}
      <Button
        onClick={handleTradeClick}
        disabled={!amount || parseFloat(amount) <= 0 || isInsufficientBalance() || loading || quoteLoading}
        className={cn(
          'w-full h-12 text-sm font-semibold transition-all duration-200',
          'touch-manipulation rounded-xl',
          tradeType === 'buy'
            ? 'bg-green-500 hover:bg-green-400 text-white shadow-glow-green'
            : 'bg-red-500 hover:bg-red-400 text-white shadow-glow-red',
          'disabled:opacity-35 disabled:cursor-not-allowed disabled:shadow-none',
          'active:scale-[0.98]'
        )}
      >
        <div className="flex items-center justify-center gap-2">
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
          ) : (
            <Zap size={16} />
          )}
          <span>{getTradeButtonText()}</span>
        </div>
      </Button>

      {/* Warning Messages */}
      {priceImpact > 10 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
        >
          <AlertTriangle size={16} className="text-red-400" />
          <span className="text-red-400 text-sm">
            High price impact ({priceImpact.toFixed(1)}%). Consider reducing trade size.
          </span>
        </motion.div>
      )}

      {/* Transaction Preview Modal */}
      <TransactionPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={handleConfirmTrade}
        token={token}
        type={tradeType}
        amount={amount}
        expectedOutput={expectedOutput}
        priceImpact={priceImpact}
        slippage={slippage}
        minimumReceived={minimumReceived}
        fees={fees}
        gasFee={gasFee}
        chainId={(token as any).chainId}
        loading={loading}
      />
    </Card>
  );
};
