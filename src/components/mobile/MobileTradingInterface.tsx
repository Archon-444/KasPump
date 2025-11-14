'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  ArrowUp, 
  ArrowDown,
  Settings,
  Shield,
  AlertTriangle,
  Vibrate
} from 'lucide-react';
import { cn } from '../../utils';
import { KasPumpToken, TradeData } from '../../types';
import { useContracts } from '../../hooks/useContracts';
import { Button } from '../ui';

export interface MobileTradingInterfaceProps {
  token: KasPumpToken;
  onTrade?: (trade: TradeData) => Promise<void> | void;
  userBalance?: number;
  userTokenBalance?: number;
  className?: string;
}

export const MobileTradingInterface: React.FC<MobileTradingInterfaceProps> = ({
  token,
  onTrade,
  userBalance = 0,
  userTokenBalance = 0,
  className
}) => {
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(1.0);
  const [showSettings, setShowSettings] = useState(false);
  const [expectedOutput, setExpectedOutput] = useState(0);
  const [priceImpact, setPriceImpact] = useState(0);
  const [minimumReceived, setMinimumReceived] = useState(0);
  const [fees, setFees] = useState(0);
  const [gasFee, setGasFee] = useState(0);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const contracts = useContracts();
  const getSwapQuote = contracts.getSwapQuote;

  // Touch interaction refs
  const constraintsRef = useRef(null);
  const buyButtonY = useMotionValue(0);
  const sellButtonY = useMotionValue(0);
  
  // Transform for button scaling based on drag
  const buyButtonScale = useTransform(buyButtonY, [-50, 0, 50], [1.1, 1, 0.9]);
  const sellButtonScale = useTransform(sellButtonY, [-50, 0, 50], [0.9, 1, 1.1]);

  const quickAmounts = [
    { label: '25%', value: 25, color: 'bg-blue-500' },
    { label: '50%', value: 50, color: 'bg-green-500' },
    { label: '75%', value: 75, color: 'bg-orange-500' },
    { label: 'MAX', value: 100, color: 'bg-yellow-500' }
  ];

  // Calculate trade details using live contract quotes
  useEffect(() => {
    let cancelled = false;

    if (!amount || parseFloat(amount) <= 0 || !getSwapQuote) {
      setExpectedOutput(0);
      setPriceImpact(0);
      setMinimumReceived(0);
      setFees(0);
      setGasFee(0);
      setQuoteLoading(false);
      return;
    }

    const inputAmount = parseFloat(amount);
    setQuoteLoading(true);

    const timeoutId = setTimeout(async () => {
      try {
        const quote = await getSwapQuote(token.address, inputAmount, tradeType);
        if (cancelled) return;

        setExpectedOutput(quote.outputAmount);
        setPriceImpact(quote.priceImpact);
        const minimum = Math.min(
          quote.minimumOutput,
          quote.outputAmount * (1 - slippage / 100)
        );
        setMinimumReceived(minimum);
        setFees(inputAmount * 0.01);
        setGasFee(quote.gasFee);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to get swap quote:', error);
          setExpectedOutput(0);
          setPriceImpact(0);
          setMinimumReceived(0);
          setFees(0);
          setGasFee(0);
        }
      } finally {
        if (!cancelled) {
          setQuoteLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [amount, tradeType, token.address, getSwapQuote, slippage]);

  const handleQuickAmount = (percentage: number) => {
    const maxAmount = tradeType === 'buy' ? userBalance : userTokenBalance;
    const quickAmount = (maxAmount * percentage / 100).toString();
    setAmount(quickAmount);
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleTrade = async () => {
    if (!amount || parseFloat(amount) <= 0 || quoteLoading) return;

    setLoading(true);

    // Haptic feedback for trade
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

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

  const handleDragEnd = (event: any, info: PanInfo, type: 'buy' | 'sell') => {
    const threshold = 30;
    
    if (Math.abs(info.offset.y) > threshold) {
      setTradeType(type);
      
      // Strong haptic feedback for trade type change
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }
    }
  };

  const isInsufficientBalance = () => {
    const inputAmount = parseFloat(amount) || 0;
    return tradeType === 'buy' ? inputAmount > userBalance : inputAmount > userTokenBalance;
  };

  return (
    <div className={cn('bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 space-y-6', className)}>
      {/* Token Info Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-white">{token.symbol}/BNB</h3>
        <p className="text-2xl font-mono text-yellow-400 mt-1">
          {token.price.toFixed(8)}
        </p>
        <p className={cn(
          'text-sm font-medium',
          token.change24h >= 0 ? 'text-green-400' : 'text-red-400'
        )}>
          {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}% (24h)
        </p>
      </div>

      {/* Trade Type Toggle with Drag Interaction */}
      <div className="relative" ref={constraintsRef}>
        <div className="bg-gray-800/50 rounded-2xl p-2 flex">
          {/* Buy Button */}
          <motion.button
            style={{ y: buyButtonY, scale: buyButtonScale }}
            drag="y"
            dragConstraints={{ top: -50, bottom: 50 }}
            dragElastic={0.3}
            onDragEnd={(e, info) => handleDragEnd(e, info, 'buy')}
            onClick={() => setTradeType('buy')}
            className={cn(
              'flex-1 py-4 rounded-xl font-bold text-lg transition-all duration-200',
              'flex items-center justify-center space-x-2',
              tradeType === 'buy'
                ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                : 'text-green-400 hover:bg-gray-700/50'
            )}
          >
            <TrendingUp size={24} />
            <span>BUY</span>
          </motion.button>

          {/* Sell Button */}
          <motion.button
            style={{ y: sellButtonY, scale: sellButtonScale }}
            drag="y"
            dragConstraints={{ top: -50, bottom: 50 }}
            dragElastic={0.3}
            onDragEnd={(e, info) => handleDragEnd(e, info, 'sell')}
            onClick={() => setTradeType('sell')}
            className={cn(
              'flex-1 py-4 rounded-xl font-bold text-lg transition-all duration-200',
              'flex items-center justify-center space-x-2',
              tradeType === 'sell'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'text-red-400 hover:bg-gray-700/50'
            )}
          >
            <TrendingDown size={24} />
            <span>SELL</span>
          </motion.button>
        </div>
        
        {/* Drag hint */}
        <div className="text-center mt-2">
          <p className="text-xs text-gray-500">Drag buttons to switch • Tap to select</p>
        </div>
      </div>

      {/* Amount Input */}
      <div className="space-y-4">
        <div className="text-center">
          <label className="text-sm text-gray-400 block mb-2">
            {tradeType === 'buy' ? 'You Pay (BNB)' : `You Sell (${token.symbol})`}
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={cn(
              'w-full text-center text-3xl font-mono bg-transparent border-none',
              'text-white placeholder-gray-600 focus:outline-none',
              'pb-2 border-b-2 transition-colors',
              isInsufficientBalance() 
                ? 'border-red-500' 
                : 'border-yellow-500/30 focus:border-yellow-500'
            )}
          />
        </div>

        {/* Quick Amount Buttons */}
        <div className="grid grid-cols-4 gap-3">
          {quickAmounts.map((quick) => (
            <motion.button
              key={quick.label}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleQuickAmount(quick.value)}
              className={cn(
                'py-3 px-4 rounded-xl text-white font-bold transition-all',
                'flex items-center justify-center',
                quick.color,
                'hover:shadow-lg active:shadow-md'
              )}
            >
              {quick.label}
            </motion.button>
          ))}
        </div>

        {/* Balance Display */}
        <div className="text-center text-sm text-gray-400">
          Available: {(tradeType === 'buy' ? userBalance : userTokenBalance).toFixed(4)} {tradeType === 'buy' ? 'BNB' : token.symbol}
        </div>
      </div>

      {/* Trade Preview */}
      {amount && parseFloat(amount) > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-800/30 rounded-xl p-4 space-y-3"
        >
          <div className="flex justify-between items-center">
            <span className="text-gray-400">You Receive</span>
            <span className="text-white font-mono text-lg">
              {expectedOutput.toFixed(tradeType === 'buy' ? 2 : 6)}
              <span className="text-gray-400 ml-1">
                {tradeType === 'buy' ? token.symbol : 'BNB'}
              </span>
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400 flex items-center">
              <Shield size={14} className="mr-1" />
              Price Impact
            </span>
            <span className={cn(
              'font-medium',
              priceImpact > 5 ? 'text-red-400' : priceImpact > 2 ? 'text-yellow-400' : 'text-green-400'
            )}>
              {priceImpact.toFixed(2)}%
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Min received</span>
            <span className="text-white font-mono">
              {minimumReceived.toFixed(tradeType === 'buy' ? 2 : 6)} {tradeType === 'buy' ? token.symbol : 'BNB'}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Platform fee</span>
            <span className="text-white font-mono">
              {fees.toFixed(4)} {tradeType === 'buy' ? 'BNB' : token.symbol}
            </span>
          </div>

          {gasFee > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Estimated gas</span>
              <span className="text-white font-mono">{gasFee.toFixed(4)} BNB</span>
            </div>
          )}

          {priceImpact > 5 && (
            <div className="flex items-center space-x-2 p-2 bg-yellow-500/10 rounded-lg">
              <AlertTriangle size={16} className="text-yellow-400" />
              <span className="text-yellow-400 text-sm">High price impact</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Slippage Settings */}
      <motion.div
        initial={false}
        animate={{ height: showSettings ? 'auto' : 0 }}
        className="overflow-hidden"
      >
        <div className="space-y-3 pt-4 border-t border-gray-700/30">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Slippage Tolerance</span>
            <span className="text-white font-mono">{slippage}%</span>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {[0.1, 0.5, 1.0, 3.0].map((preset) => (
              <motion.button
                key={preset}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSlippage(preset)}
                className={cn(
                  'py-2 px-3 rounded-lg text-sm font-medium transition-colors',
                  slippage === preset
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                )}
              >
                {preset}%
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Settings Toggle */}
      <div className="flex justify-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <Settings size={16} />
          <span className="text-sm">Advanced Settings</span>
        </motion.button>
      </div>

      {/* Trade Button */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button
          onClick={handleTrade}
          disabled={!amount || parseFloat(amount) <= 0 || isInsufficientBalance() || loading || quoteLoading}
          className={cn(
            'w-full h-16 text-xl font-bold transition-all duration-200',
            'flex items-center justify-center space-x-3',
            tradeType === 'buy'
              ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/30'
              : 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
          )}
        >
          {loading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
            />
          ) : (
            <>
              <Zap size={24} />
              <span>
                {!amount || parseFloat(amount) <= 0
                  ? 'Enter Amount'
                  : isInsufficientBalance()
                  ? 'Insufficient Balance'
                  : quoteLoading
                  ? 'Fetching quote...'
                  : `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${token.symbol}`
                }
              </span>
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
};