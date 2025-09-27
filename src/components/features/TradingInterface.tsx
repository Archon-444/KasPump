'use client';

import React, { useState, useEffect } from 'react';
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
import { KasPumpToken } from '../../types';
import { formatCurrency, formatPercentage, cn } from '../../utils';

export interface TradingInterfaceProps {
  token: KasPumpToken;
  onTrade?: (type: 'buy' | 'sell', amount: string, slippage: number) => void;
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
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(1.0);
  const [showSettings, setShowSettings] = useState(false);
  const [expectedOutput, setExpectedOutput] = useState(0);
  const [priceImpact, setPriceImpact] = useState(0);
  const [minimumReceived, setMinimumReceived] = useState(0);
  const [fees, setFees] = useState(0);
  const [loading, setLoading] = useState(false);

  const slippagePresets = [0.1, 0.5, 1.0, 3.0];
  const amountPresets = [25, 50, 75, 100];

  // Calculate trade details when amount or slippage changes
  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setExpectedOutput(0);
      setPriceImpact(0);
      setMinimumReceived(0);
      setFees(0);
      return;
    }

    const inputAmount = parseFloat(amount);
    
    // Mock calculations (replace with real bonding curve math)
    if (tradeType === 'buy') {
      const tokensReceived = inputAmount / token.price;
      const impact = Math.min((inputAmount / token.volume24h) * 100, 5);
      const platformFee = inputAmount * 0.01; // 1% platform fee
      
      setExpectedOutput(tokensReceived);
      setPriceImpact(impact);
      setMinimumReceived(tokensReceived * (1 - slippage / 100));
      setFees(platformFee);
    } else {
      const kasReceived = inputAmount * token.price;
      const impact = Math.min((kasReceived / token.volume24h) * 100, 5);
      const platformFee = kasReceived * 0.01; // 1% platform fee
      
      setExpectedOutput(kasReceived - platformFee);
      setPriceImpact(impact);
      setMinimumReceived((kasReceived - platformFee) * (1 - slippage / 100));
      setFees(platformFee);
    }
  }, [amount, slippage, tradeType, token.price, token.volume24h]);

  const handleQuickAmount = (percentage: number) => {
    const maxAmount = tradeType === 'buy' ? userBalance : userTokenBalance;
    const quickAmount = (maxAmount * percentage / 100).toString();
    setAmount(quickAmount);
  };

  const handleTrade = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    setLoading(true);
    try {
      await onTrade?.(tradeType, amount, slippage);
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
    if (!amount || parseFloat(amount) <= 0) return `Enter ${tradeType === 'buy' ? 'KAS' : token.symbol} amount`;
    if (isInsufficientBalance()) return 'Insufficient Balance';
    if (loading) return `${tradeType === 'buy' ? 'Buying' : 'Selling'}...`;
    return `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${token.symbol}`;
  };

  return (
    <Card className={cn('p-6 space-y-6', className)}>
      {/* Trade Type Selector */}
      <div className=\"flex items-center space-x-2 bg-gray-800/50 p-1 rounded-lg\">
        <button
          onClick={() => setTradeType('buy')}
          className={cn(
            'flex-1 px-4 py-3 rounded-md font-medium transition-all duration-200',
            tradeType === 'buy'
              ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          )}
        >
          <div className=\"flex items-center justify-center space-x-2\">
            <TrendingUp size={18} />
            <span>Buy</span>
          </div>
        </button>
        <button
          onClick={() => setTradeType('sell')}
          className={cn(
            'flex-1 px-4 py-3 rounded-md font-medium transition-all duration-200',
            tradeType === 'sell'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          )}
        >
          <div className=\"flex items-center justify-center space-x-2\">
            <TrendingDown size={18} />
            <span>Sell</span>
          </div>
        </button>
      </div>

      {/* Amount Input */}
      <div className=\"space-y-3\">
        <div className=\"flex items-center justify-between\">
          <label className=\"text-sm font-medium text-gray-300\">
            {tradeType === 'buy' ? 'You pay' : 'You sell'}
          </label>
          <div className=\"text-sm text-gray-400\">
            Balance: {formatCurrency(tradeType === 'buy' ? userBalance : userTokenBalance, tradeType === 'buy' ? 'KAS' : token.symbol)}
          </div>
        </div>

        <div className=\"relative\">
          <input
            type=\"number\"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder=\"0.00\"
            className={cn(
              'w-full px-4 py-4 bg-gray-800/50 border border-gray-600 rounded-lg',
              'text-2xl font-mono text-white placeholder-gray-500',
              'focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500',
              'transition-all duration-200',
              isInsufficientBalance() && 'border-red-500 focus:border-red-500 focus:ring-red-500'
            )}
          />
          <div className=\"absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium\">
            {tradeType === 'buy' ? 'KAS' : token.symbol}
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className=\"flex items-center space-x-2\">
          {amountPresets.map((preset) => (
            <button
              key={preset}
              onClick={() => handleQuickAmount(preset)}
              className=\"px-3 py-1 bg-gray-700/50 hover:bg-gray-600 text-gray-300 text-xs rounded-md transition-colors\"
            >
              {preset}%
            </button>
          ))}
        </div>
      </div>

      {/* Expected Output */}
      {amount && parseFloat(amount) > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className=\"space-y-3 p-4 bg-gray-800/20 rounded-lg border border-gray-700/30\"
        >
          <div className=\"flex items-center justify-between\">
            <span className=\"text-sm text-gray-400\">
              {tradeType === 'buy' ? 'You receive (est.)' : 'You receive'}
            </span>
            <span className=\"text-lg font-mono text-white\">
              {formatCurrency(expectedOutput, tradeType === 'buy' ? token.symbol : 'KAS')}
            </span>
          </div>

          <div className=\"grid grid-cols-2 gap-4 text-xs\">
            <div className=\"flex items-center justify-between\">
              <span className=\"text-gray-400 flex items-center\">
                <Percent size={12} className=\"mr-1\" />
                Price Impact
              </span>
              <span className={cn(
                'font-medium',
                priceImpact > 5 ? 'text-red-400' : priceImpact > 2 ? 'text-yellow-400' : 'text-green-400'
              )}>
                {priceImpact.toFixed(2)}%
              </span>
            </div>

            <div className=\"flex items-center justify-between\">
              <span className=\"text-gray-400 flex items-center\">
                <Shield size={12} className=\"mr-1\" />
                Min. Received
              </span>
              <span className=\"text-gray-300 font-mono\">
                {formatCurrency(minimumReceived, tradeType === 'buy' ? token.symbol : 'KAS', 6)}
              </span>
            </div>

            <div className=\"flex items-center justify-between\">
              <span className=\"text-gray-400 flex items-center\">
                <DollarSign size={12} className=\"mr-1\" />
                Platform Fee
              </span>
              <span className=\"text-gray-300 font-mono\">
                {formatCurrency(fees, 'KAS', 6)}
              </span>
            </div>

            <div className=\"flex items-center justify-between\">
              <span className=\"text-gray-400 flex items-center\">
                <Clock size={12} className=\"mr-1\" />
                Est. Time
              </span>
              <span className=\"text-green-400 font-medium\">
                ~10s
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Slippage Settings */}
      <div className=\"space-y-3\">
        <div className=\"flex items-center justify-between\">
          <span className=\"text-sm font-medium text-gray-300 flex items-center\">
            <Settings size={16} className=\"mr-2\" />
            Slippage Tolerance
          </span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className=\"text-purple-400 hover:text-purple-300 transition-colors\"
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
              className=\"space-y-3\"
            >
              <div className=\"flex items-center space-x-2\">
                {slippagePresets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setSlippage(preset)}
                    className={cn(
                      'px-3 py-2 rounded-md text-sm font-medium transition-all',
                      slippage === preset
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    )}
                  >
                    {preset}%
                  </button>
                ))}
                
                <div className=\"relative\">
                  <input
                    type=\"number\"
                    value={slippage}
                    onChange={(e) => setSlippage(parseFloat(e.target.value) || 0)}
                    className=\"w-20 px-2 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white text-center focus:outline-none focus:border-purple-500\"
                    step=\"0.1\"
                    min=\"0.1\"
                    max=\"50\"
                  />
                  <span className=\"absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 text-xs\">%</span>
                </div>
              </div>

              {slippage > 5 && (
                <div className=\"flex items-center space-x-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg\">
                  <AlertTriangle size={16} className=\"text-yellow-400\" />
                  <span className=\"text-yellow-400 text-sm\">
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
        onClick={handleTrade}
        disabled={!amount || parseFloat(amount) <= 0 || isInsufficientBalance() || loading}
        className={cn(
          'w-full h-14 text-lg font-semibold transition-all duration-200',
          tradeType === 'buy'
            ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20'
            : 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
        )}
      >
        <div className=\"flex items-center justify-center space-x-2\">
          {loading ? (
            <div className=\"animate-spin rounded-full h-5 w-5 border-b-2 border-white\" />
          ) : (
            <Zap size={20} />
          )}
          <span>{getTradeButtonText()}</span>
        </div>
      </Button>

      {/* Warning Messages */}
      {priceImpact > 10 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className=\"flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg\"
        >
          <AlertTriangle size={16} className=\"text-red-400\" />
          <span className=\"text-red-400 text-sm\">
            High price impact ({priceImpact.toFixed(1)}%). Consider reducing trade size.
          </span>
        </motion.div>
      )}

      {/* Trade Success/Error Toast would go here */}
    </Card>
  );
};