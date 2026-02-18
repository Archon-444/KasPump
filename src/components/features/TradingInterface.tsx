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
  Clock
} from 'lucide-react';
import { Button } from '../ui';
import { TransactionPreviewModal } from './TransactionPreviewModal';
import { KasPumpToken, TradeData } from '../../types';
import { useContracts } from '../../hooks/useContracts';
import { formatCurrency, cn } from '../../utils';

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

      // Calculate fees (1% platform fee on input amount)
      const platformFee = inputAmount * 0.01;
      setFees(platformFee);
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
  }, [amount, tradeType, token.address, getSwapQuote, slippage]);

  // Calculate trade details when amount or trade type changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateTradeDetails();
    }, 500); // Debounce to avoid too many contract calls

    return () => clearTimeout(timeoutId);
  }, [calculateTradeDetails]);

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

  return (
    <div className={cn('glow-card-wrapper', className)}>
      <div className="glow-card-inner p-6 space-y-6">
      {/* Trade Type Selector - Mobile optimized */}
      <div className="flex items-center space-x-2 p-1 rounded-xl bg-white/5 border border-white/5">
        <button
          onClick={() => setTradeType('buy')}
          className={cn(
            'flex-1 px-4 py-4 rounded-lg font-semibold transition-all duration-200',
            'min-h-[56px]',
            'touch-manipulation',
            tradeType === 'buy'
              ? 'bg-green-500/15 text-green-400 border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.15)] active:bg-green-500/25'
              : 'text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
          )}
        >
          <div className="flex items-center justify-center space-x-2">
            <TrendingUp size={20} />
            <span className="text-base sm:text-sm">Buy</span>
          </div>
        </button>
        <button
          onClick={() => setTradeType('sell')}
          className={cn(
            'flex-1 px-4 py-4 rounded-lg font-semibold transition-all duration-200',
            'min-h-[56px]',
            'touch-manipulation',
            tradeType === 'sell'
              ? 'bg-red-500/15 text-red-400 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)] active:bg-red-500/25'
              : 'text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
          )}
        >
          <div className="flex items-center justify-center space-x-2">
            <TrendingDown size={20} />
            <span className="text-base sm:text-sm">Sell</span>
          </div>
        </button>
      </div>

      {/* Amount Input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">
            {tradeType === 'buy' ? 'You pay' : 'You sell'}
          </label>
          <div className="text-sm text-gray-400">
            Balance: {formatCurrency(tradeType === 'buy' ? userBalance : userTokenBalance, tradeType === 'buy' ? 'BNB' : token.symbol)}
          </div>
        </div>

        <div className="input-glow-wrapper">
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              className={cn(
                'w-full px-4 py-5 sm:py-4 bg-[#111]/80 border border-white/10 rounded-xl',
                'text-2xl sm:text-xl font-mono text-white placeholder-gray-500',
                'focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30',
                'focus:shadow-[0_0_20px_rgba(234,179,8,0.15)]',
                'transition-all duration-300',
                'min-h-[56px]',
                'touch-manipulation',
                isInsufficientBalance() && 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30 focus:shadow-[0_0_20px_rgba(239,68,68,0.15)]'
              )}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm sm:text-base">
              {tradeType === 'buy' ? 'BNB' : token.symbol}
            </div>
          </div>
        </div>

        {/* Quick Amount Buttons - Mobile optimized */}
        <div className="grid grid-cols-4 gap-2">
          {amountPresets.map((preset) => (
            <button
              key={preset}
              onClick={() => handleQuickAmount(preset)}
              className={cn(
                'px-4 py-3 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 active:bg-white/15',
                'text-gray-300 font-medium rounded-lg transition-all duration-200',
                'text-sm sm:text-xs',
                'min-h-[48px]',
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
          className="space-y-3 p-4 bg-white/[0.02] rounded-xl border border-white/5"
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
                Platform Fee
              </span>
              <span className="text-gray-300 font-mono">
                {formatCurrency(fees, 'BNB', 6)}
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
                      'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      slippage === preset
                        ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                        : 'bg-white/5 border border-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
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
                    className="w-20 px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white text-center focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 transition-all duration-200"
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

      {/* Trade Button - Mobile optimized with glow */}
      <div className="relative group/trade">
        {/* Glow layer behind button */}
        <div className={cn(
          'absolute -inset-0.5 rounded-xl blur-md opacity-0 group-hover/trade:opacity-60 transition-opacity duration-300',
          (!amount || parseFloat(amount) <= 0 || isInsufficientBalance() || loading || quoteLoading) && '!opacity-0',
          tradeType === 'buy'
            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
            : 'bg-gradient-to-r from-red-500 to-orange-500'
        )} />
        <Button
          onClick={handleTradeClick}
          disabled={!amount || parseFloat(amount) <= 0 || isInsufficientBalance() || loading || quoteLoading}
          className={cn(
            'relative w-full min-h-[56px] text-base sm:text-lg font-bold transition-all duration-200',
            'touch-manipulation rounded-xl',
            tradeType === 'buy'
              ? 'bg-green-500/15 text-green-400 border border-green-500/20 hover:bg-green-500/25 hover:shadow-[0_0_30px_rgba(34,197,94,0.2)] active:bg-green-500/30'
              : 'bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 hover:shadow-[0_0_30px_rgba(239,68,68,0.2)] active:bg-red-500/30',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:shadow-none',
            'transform active:scale-[0.98]'
          )}
        >
          <div className="flex items-center justify-center space-x-2">
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current" />
            ) : (
              <Zap size={22} />
            )}
            <span>{getTradeButtonText()}</span>
          </div>
        </Button>
      </div>

      {/* Warning Messages */}
      {priceImpact > 10 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
        >
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
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
      </div>
    </div>
  );
};