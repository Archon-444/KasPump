'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ExternalLink, 
  Share2, 
  Heart, 
  MessageCircle, 
  Users,
  TrendingUp,
  Clock,
  DollarSign,
  BarChart3
} from 'lucide-react';
// Import directly to avoid circular dependency with index.ts
import { TradingChart } from './TradingChart';
import { TradingInterface } from './TradingInterface';
import { TokenSocialShare } from './TokenSocialShare';
import { PriceAlertModal } from './PriceAlertModal';
import { FavoriteButton } from './FavoriteButton';
import { RecentTradesFeed } from './RecentTradesFeed';
import { HolderList } from './HolderList';
import { MobileTradingInterface } from '../mobile';
import { Card, Button, Badge, Progress } from '../ui';
import { KasPumpToken } from '../../types';
import { formatCurrency, formatPercentage, formatTimeAgo, cn } from '../../utils';
import { Bell } from 'lucide-react';

export interface TokenTradingPageProps {
  token: KasPumpToken;
  onBack?: () => void;
  className?: string;
}

export const TokenTradingPage: React.FC<TokenTradingPageProps> = ({
  token,
  onBack,
  className
}) => {
  const [timeframe, setTimeframe] = useState('1h');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(token.holders || 0);
  const [userBalance] = useState(1000); // Mock user KAS balance
  const [userTokenBalance] = useState(0); // Mock user token balance
  const [isMobile, setIsMobile] = useState(false);
  const [showPriceAlert, setShowPriceAlert] = useState(false);
  const [showSocialShare, setShowSocialShare] = useState(false);
  const chainId = (token as any).chainId;
  
  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const handleTrade = async (type: 'buy' | 'sell', amount: string, slippage: number) => {
    console.log(`${type.toUpperCase()} ${amount} ${token.symbol} with ${slippage}% slippage`);
    // TODO: Implement actual trading logic
  };

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };


  const isPositive = token.change24h >= 0;

  return (
    <div className={cn('min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900', className)}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center space-x-4">
            {onBack && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                className="flex items-center space-x-2"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </Button>
            )}

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {token.symbol.slice(0, 2)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{token.name}</h1>
                <p className="text-gray-400">${token.symbol}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <FavoriteButton
              tokenAddress={token.address}
              chainId={chainId}
              size="sm"
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPriceAlert(true)}
              className="flex items-center space-x-2"
            >
              <Bell size={16} />
              <span className="hidden sm:inline">Alert</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSocialShare(!showSocialShare)}
              className="flex items-center space-x-2"
            >
              <Share2 size={16} />
              <span className="hidden sm:inline">Share</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLike}
              className={cn(
                'flex items-center space-x-2',
                liked && 'border-red-500 text-red-500'
              )}
            >
              <Heart size={16} className={liked ? 'fill-current' : ''} />
              <span>{likeCount}</span>
            </Button>
          </div>
        </motion.div>

        {/* Token Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-white mb-1">
              {formatCurrency(token.price, 'KAS', 8)}
            </div>
            <div className="text-sm text-gray-400">Current Price</div>
            <div className={cn(
              'text-sm font-medium mt-2 flex items-center justify-center',
              isPositive ? 'text-green-500' : 'text-red-500'
            )}>
              <TrendingUp size={14} className="mr-1" />
              {isPositive ? '+' : ''}{formatPercentage(token.change24h)}
            </div>
          </Card>

          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-white mb-1">
              {formatCurrency(token.marketCap, 'KAS')}
            </div>
            <div className="text-sm text-gray-400">Market Cap</div>
            <div className="text-sm text-purple-400 mt-2">
              Rank #{Math.floor(Math.random() * 1000) + 1}
            </div>
          </Card>

          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-white mb-1">
              {formatCurrency(token.volume24h, 'KAS')}
            </div>
            <div className="text-sm text-gray-400">24h Volume</div>
            <div className="text-sm text-blue-400 mt-2 flex items-center justify-center">
              <BarChart3 size={14} className="mr-1" />
              Active
            </div>
          </Card>

          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-white mb-1 flex items-center justify-center">
              <Users size={20} className="mr-2" />
              {token.holders}
            </div>
            <div className="text-sm text-gray-400">Holders</div>
            <div className="text-sm text-green-400 mt-2">
              +{Math.floor(Math.random() * 50)} today
            </div>
          </Card>
        </motion.div>

        {/* Main Trading Interface */}
        <div className={cn(
          'gap-6 mb-6',
          isMobile 
            ? 'flex flex-col space-y-6' 
            : 'grid grid-cols-1 lg:grid-cols-3'
        )}>
          {/* Chart Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={cn(
              isMobile ? 'order-1' : 'lg:col-span-2'
            )}
          >
            <TradingChart
              token={token}
              height={isMobile ? 300 : 500}
              timeframe={timeframe as any}
              onTimeframeChange={setTimeframe}
              showVolume={true}
            />
          </motion.div>

          {/* Trading Interface */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className={cn(
              isMobile ? 'order-2' : ''
            )}
          >
            {isMobile ? (
              <MobileTradingInterface
                token={token}
                onTrade={handleTrade}
                userBalance={userBalance}
                userTokenBalance={userTokenBalance}
              />
            ) : (
              <TradingInterface
                token={token}
                onTrade={handleTrade}
                userBalance={userBalance}
                userTokenBalance={userTokenBalance}
              />
            )}
          </motion.div>
        </div>

        {/* Token Details Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Token Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <DollarSign className="mr-2 text-purple-500" />
                Token Information
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Description</label>
                  <p className="text-gray-300 mt-1">
                    {token.description || 'No description provided by the creator.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Contract Address</label>
                    <div className="text-sm text-purple-400 mt-1 font-mono break-all">
                      {token.address.slice(0, 8)}...{token.address.slice(-8)}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400">Created</label>
                    <div className="text-sm text-gray-300 mt-1 flex items-center">
                      <Clock size={14} className="mr-1" />
                      {formatTimeAgo(token.createdAt)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Curve Type</label>
                  <Badge variant="default" className="mt-1">
                    {token.curveType}
                  </Badge>
                </div>

                {/* Bonding Curve Progress */}
                {!token.isGraduated && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <label className="text-gray-400">Graduation Progress</label>
                      <span className="text-white font-medium">{token.bondingCurveProgress.toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={token.bondingCurveProgress} 
                      className="h-3"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      {(100 - token.bondingCurveProgress).toFixed(1)}% remaining until AMM graduation
                    </p>
                  </div>
                )}

                {token.isGraduated && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="text-green-400" size={16} />
                      <span className="text-green-400 font-medium">Graduated to AMM</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      This token has successfully completed its bonding curve and is now trading on the AMM.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Recent Trades Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <RecentTradesFeed
              tokenAddress={token.address}
              chainId={chainId}
              maxTrades={10}
            />
          </motion.div>
        </div>

        {/* Holders List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-6"
        >
          <HolderList
            tokenAddress={token.address}
            chainId={chainId}
            maxHolders={20}
          />
        </motion.div>

        {/* Social Share Panel */}
        {showSocialShare && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <TokenSocialShare token={token} chainId={chainId} />
          </motion.div>
        )}
      </div>

      {/* Price Alert Modal */}
      <PriceAlertModal
        isOpen={showPriceAlert}
        onClose={() => setShowPriceAlert(false)}
        token={token}
        chainId={chainId}
      />
    </div>
  );
};