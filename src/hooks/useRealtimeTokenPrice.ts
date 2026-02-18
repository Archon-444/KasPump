/**
 * useRealtimeTokenPrice Hook
 * Provides real-time token price updates via WebSocket connection
 *
 * Features:
 * - Live price updates
 * - Price change tracking
 * - Update status monitoring
 * - Optional enable/disable control
 *
 * @example
 * ```typescript
 * const {
 *   currentPrice,
 *   priceChange,
 *   isUpdating
 * } = useRealtimeTokenPrice(token, chainId);
 *
 * // Display live price
 * <div className={priceChange > 0 ? 'text-green' : 'text-red'}>
 *   ${currentPrice.toFixed(6)}
 *   {priceChange > 0 ? '↑' : '↓'} {Math.abs(priceChange).toFixed(2)}%
 * </div>
 * ```
 *
 * @param token - Token to track price for
 * @param chainId - Optional chain ID to filter updates
 * @param enabled - Whether to enable real-time updates (default: true)
 * @returns Object containing current price, change, and update status
 */

import { useState } from 'react';
import { usePriceUpdates, PriceUpdate } from './useWebSocket';
import { KasPumpToken } from '../types';

export function useRealtimeTokenPrice(
  token: KasPumpToken,
  chainId?: number,
  enabled: boolean = true
) {
  const [currentPrice, setCurrentPrice] = useState<number>(token.price);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);

  usePriceUpdates((update: PriceUpdate) => {
    if (!enabled) return;

    if (
      update.tokenAddress.toLowerCase() === token.address.toLowerCase() &&
      (chainId === undefined || update.chainId === chainId)
    ) {
      const newPrice = parseFloat(update.price);
      const oldPrice = currentPrice;
      
      if (oldPrice > 0) {
        const change = ((newPrice - oldPrice) / oldPrice) * 100;
        setPriceChange(change);
        
        // Flash update indicator
        setIsUpdating(true);
        setTimeout(() => setIsUpdating(false), 500);
      }
      
      setCurrentPrice(newPrice);
    }
  });

  return {
    price: currentPrice,
    priceChange,
    isUpdating,
    // Return updated token object
    updatedToken: {
      ...token,
      price: currentPrice,
      change24h: priceChange !== 0 ? priceChange : token.change24h,
    } as KasPumpToken,
  };
}

