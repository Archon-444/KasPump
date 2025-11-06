'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui';
import { cn, formatCurrency } from '../../utils';
import { getChainMetadata, supportedChains, isTestnet } from '../../config/chains';

export interface ChainComparisonChartProps {
  data: {
    chains: {
      chainId: number;
      tokens: number;
      volume: number;
      users: number;
    }[];
  };
  className?: string;
}

export const ChainComparisonChart: React.FC<ChainComparisonChartProps> = ({
  data,
  className
}) => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get mainnet chains only for comparison
  const mainnetChains = supportedChains.filter(chain => !isTestnet(chain.id));
  
  // Create chain data with metadata
  const chainData = mainnetChains.map(chain => {
    const chainStats = data.chains.find(c => c.chainId === chain.id) || {
      chainId: chain.id,
      tokens: 0,
      volume: 0,
      users: 0,
    };
    const metadata = getChainMetadata(chain.id);
    return {
      ...chainStats,
      name: metadata?.shortName || chain.name,
      color: metadata?.color || '#6B7280',
    };
  }).filter(chain => chain.tokens > 0 || chain.volume > 0); // Only show chains with activity

  if (chainData.length === 0) {
    return (
      <Card className="glassmorphism">
        <div className="text-center py-8 text-gray-400">
          No chain data available for comparison
        </div>
      </Card>
    );
  }

  const maxVolume = Math.max(...chainData.map(c => c.volume), 1);
  const maxTokens = Math.max(...chainData.map(c => c.tokens), 1);

  return (
    <Card className={cn('glassmorphism', className, isMobile && 'p-4')}>
      <h3 className={cn('font-semibold text-white mb-4', isMobile ? 'text-base' : 'text-lg')}>Chain Comparison</h3>
      
      <div className={cn('space-y-4', isMobile && 'space-y-3')}>
        {chainData.map((chain, index) => (
          <motion.div
            key={chain.chainId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="space-y-3"
          >
            {/* Chain Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className={cn('rounded-full', isMobile ? 'w-3 h-3' : 'w-4 h-4')}
                  style={{ backgroundColor: chain.color }}
                />
                <span className={cn('font-semibold text-white', isMobile ? 'text-sm' : 'text-base')}>{chain.name}</span>
              </div>
              <div className="text-right">
                <div className={cn('font-semibold text-white', isMobile ? 'text-xs' : 'text-sm')}>
                  {chain.tokens.toLocaleString()} tokens
                </div>
                <div className={cn('text-gray-400', isMobile ? 'text-[10px]' : 'text-xs')}>
                  {formatCurrency(chain.volume, 'USD', 0)}
                </div>
              </div>
            </div>

            {/* Volume Bar */}
            <div className="space-y-1">
              <div className="text-xs text-gray-400">Volume</div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(chain.volume / maxVolume) * 100}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className="h-full rounded-full"
                  style={{ 
                    background: `linear-gradient(90deg, ${chain.color}80, ${chain.color})`
                  }}
                />
              </div>
            </div>

            {/* Tokens Bar */}
            <div className="space-y-1">
              <div className="text-xs text-gray-400">Tokens</div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(chain.tokens / maxTokens) * 100}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
                  className="h-full rounded-full"
                  style={{ 
                    background: `linear-gradient(90deg, ${chain.color}60, ${chain.color}CC)`
                  }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
};

