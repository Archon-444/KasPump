'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui';
import { PortfolioStats } from '../../hooks/usePortfolio';
import { cn, formatCurrency } from '../../utils';
import { getChainMetadata, getChainById } from '../../config/chains';

export interface ChainBalanceCardProps {
  chainData: PortfolioStats['chains'][0];
  onClick?: () => void;
  className?: string;
}

const ChainBalanceCardComponent: React.FC<ChainBalanceCardProps> = ({
  chainData,
  onClick,
  className
}) => {
  const chainMetadata = getChainMetadata(chainData.chainId);
  const chainConfig = getChainById(chainData.chainId);
  const chainColor = chainMetadata?.color || '#6B7280';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={onClick}
      className={cn(onClick && 'cursor-pointer', className)}
    >
      <div style={{ borderColor: `${chainColor}40` }}>
        <Card className={cn(
          'glassmorphism transition-all duration-300',
          'hover:border-opacity-50 hover:shadow-lg border-2'
        )}>
          <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: chainColor }}
            />
            <h3 className="font-semibold text-white">{chainData.chainName}</h3>
          </div>
          <div className="text-sm text-gray-400">
            {chainData.tokenCount} token{chainData.tokenCount !== 1 ? 's' : ''}
          </div>
        </div>
        
        <div className="text-2xl font-bold text-white mb-1">
          {formatCurrency(chainData.value, chainConfig?.nativeCurrency?.symbol || 'ETH', 2)}
        </div>
        
        <div className="text-xs text-gray-500">
          {formatCurrency(chainData.value, 'USD', 2)} USD
        </div>
        </Card>
      </div>
    </motion.div>
  );
};

// Memoize to prevent re-renders when chain balance hasn't changed
export const ChainBalanceCard = memo(ChainBalanceCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.chainData.chainId === nextProps.chainData.chainId &&
    prevProps.chainData.value === nextProps.chainData.value &&
    prevProps.chainData.tokenCount === nextProps.chainData.tokenCount &&
    prevProps.onClick === nextProps.onClick
  );
});

ChainBalanceCard.displayName = 'ChainBalanceCard';
