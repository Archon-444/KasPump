/**
 * useWebSocket Hook
 * React wrapper for WebSocket subscriptions with automatic cleanup
 *
 * Features:
 * - Automatic subscription/unsubscription
 * - Connection status tracking
 * - Type-safe event handling
 * - Last message caching
 * - Specialized hooks for trades and prices
 *
 * @example
 * ```typescript
 * // Generic WebSocket subscription
 * const { isConnected, lastMessage } = useWebSocket('trade', (data) => {
 *   console.log('New trade:', data);
 * });
 *
 * // Trade-specific hook
 * useTradeUpdates(token.address, (trade) => {
 *   setRecentTrades(prev => [trade, ...prev]);
 * });
 *
 * // Price-specific hook
 * usePriceUpdates((update) => {
 *   if (update.tokenAddress === token.address) {
 *     setPrice(update.price);
 *   }
 * });
 * ```
 *
 * @param eventType - Type of event to subscribe to
 * @param callback - Optional callback for handling events
 * @returns Object containing connection status and last message
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { getWebSocketClient, WebSocketMessage, TradeEvent, PriceUpdate } from '../lib/websocket';

// Re-export types for convenience
export type { TradeEvent, PriceUpdate, WebSocketMessage };

export function useWebSocket<T = unknown>(
  eventType: string,
  callback?: (data: T) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const callbackRef = useRef(callback);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const client = getWebSocketClient();

    // Check connection status
    const checkConnection = () => {
      setIsConnected(client.isConnected());
    };

    checkConnection();

    // Try to connect if not connected
    if (!client.isConnected()) {
      client.connect().then(() => {
        setIsConnected(true);
      }).catch(() => {
        setIsConnected(false);
      });
    }

    // Subscribe to events
    const unsubscribe = client.subscribe(eventType, (data: T) => {
      setLastMessage(data);
      if (callbackRef.current) {
        callbackRef.current(data);
      }
    });

    unsubscribeRef.current = unsubscribe;

    // Subscribe to connection status changes (using wildcard)
    const statusUnsubscribe = client.subscribe('*', (_message: WebSocketMessage) => {
      checkConnection();
    });

    // Cleanup
    return () => {
      unsubscribe();
      statusUnsubscribe();
    };
  }, [eventType]);

  const send = useCallback((message: any) => {
    const client = getWebSocketClient();
    client.send(message);
  }, []);

  return {
    isConnected,
    lastMessage,
    send,
  };
}

// Specialized hooks for common event types
export function useTradeEvents(callback?: (trade: TradeEvent) => void) {
  return useWebSocket<TradeEvent>('trade', callback);
}

export function usePriceUpdates(callback?: (update: PriceUpdate) => void) {
  return useWebSocket<PriceUpdate>('price', callback);
}

// Hook for subscribing to a specific token's updates
export function useTokenUpdates(
  tokenAddress: string,
  chainId?: number,
  callback?: (update: PriceUpdate | TradeEvent) => void
) {
  const [updates, setUpdates] = useState<Array<PriceUpdate | TradeEvent>>([]);

  const handleTrade = useCallback((trade: TradeEvent) => {
    if (
      trade.tokenAddress.toLowerCase() === tokenAddress.toLowerCase() &&
      (chainId === undefined || trade.chainId === chainId)
    ) {
      setUpdates(prev => [trade, ...prev].slice(0, 50)); // Keep last 50 updates
      callback?.(trade);
    }
  }, [tokenAddress, chainId, callback]);

  const handlePrice = useCallback((price: PriceUpdate) => {
    if (
      price.tokenAddress.toLowerCase() === tokenAddress.toLowerCase() &&
      (chainId === undefined || price.chainId === chainId)
    ) {
      setUpdates(prev => [price, ...prev].slice(0, 50));
      callback?.(price);
    }
  }, [tokenAddress, chainId, callback]);

  useTradeEvents(handleTrade);
  usePriceUpdates(handlePrice);

  return { updates };
}

