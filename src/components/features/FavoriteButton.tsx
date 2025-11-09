'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useFavorites } from '../../hooks/useFavorites';
import { cn } from '../../utils';

export interface FavoriteButtonProps {
  tokenAddress: string;
  chainId?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

const FavoriteButtonComponent: React.FC<FavoriteButtonProps> = ({
  tokenAddress,
  chainId,
  size = 'md',
  className,
  showLabel = false,
}) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(tokenAddress, chainId);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(tokenAddress, chainId);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      className={cn(
        'flex items-center space-x-2 transition-all',
        'rounded-lg p-1',
        favorited
          ? 'text-yellow-400 hover:text-yellow-300'
          : 'text-gray-400 hover:text-yellow-400',
        className
      )}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <div className={cn('relative', sizeClasses[size])}>
        <Star
          size={iconSizes[size]}
          className={cn(
            'transition-all',
            favorited ? 'fill-current' : 'stroke-current fill-none'
          )}
        />
        {favorited && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute inset-0 bg-yellow-400/20 rounded-full blur-sm"
          />
        )}
      </div>
      {showLabel && (
        <span className="text-sm font-medium">
          {favorited ? 'Favorited' : 'Favorite'}
        </span>
      )}
    </motion.button>
  );
};

// Memoize to prevent unnecessary re-renders in token lists
export const FavoriteButton = memo(FavoriteButtonComponent, (prevProps, nextProps) => {
  return (
    prevProps.tokenAddress === nextProps.tokenAddress &&
    prevProps.chainId === nextProps.chainId &&
    prevProps.size === nextProps.size &&
    prevProps.className === nextProps.className &&
    prevProps.showLabel === nextProps.showLabel
  );
});

FavoriteButton.displayName = 'FavoriteButton';
