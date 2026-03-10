/**
 * useWebSocket Hook
 * React wrapper for Socket.IO WebSocket subscriptions with automatic cleanup
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  getWebSocketClient,
  TradeEvent,
  TokenCreatedEvent,
  GraduationEvent,
  PriceData,
} from '../lib/websocket/client';

export type { TradeEvent, TokenCreatedEvent, GraduationEvent, PriceData };

export interface PriceUpdate {
  tokenAddress: string;
  chainId?: number;
  price: string;
  change24h?: number;
  volume24h?: string;
  marketCap?: string;
  timestamp: number;
}

export function useWebSocket<T = unknown>(
  eventType: string,
  callback?: (data: T) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const client = getWebSocketClient();

    setIsConnected(client.isConnected());

    const unsubConnect = client.on('connection:established', () => {
      setIsConnected(true);
    });

    const unsubDisconnect = client.on('connection:lost', () => {
      setIsConnected(false);
    });

    const unsubEvent = client.on<T>(eventType, (data: T) => {
      setLastMessage(data);
      callbackRef.current?.(data);
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubEvent();
    };
  }, [eventType]);

  const send = useCallback((event: string, data?: any) => {
    const client = getWebSocketClient();
    if (client.isConnected()) {
      (client as any).socket?.emit(event, data);
    }
  }, []);

  return { isConnected, lastMessage, send };
}

export function useTradeEvents(callback?: (trade: TradeEvent) => void) {
  return useWebSocket<TradeEvent>('trade:new', callback);
}

export function usePriceUpdates(callback?: (update: PriceUpdate) => void) {
  return useWebSocket<PriceUpdate>('price:update', callback);
}

export function useTokenCreatedEvents(callback?: (event: TokenCreatedEvent) => void) {
  return useWebSocket<TokenCreatedEvent>('token:created', callback);
}

export function useGraduationEvents(callback?: (event: GraduationEvent) => void) {
  return useWebSocket<GraduationEvent>('token:graduated', callback);
}

export function useTokenUpdates(
  tokenAddress: string,
  chainId?: number,
  callback?: (update: PriceUpdate | TradeEvent) => void
) {
  const [updates, setUpdates] = useState<Array<PriceUpdate | TradeEvent>>([]);
  const client = getWebSocketClient();

  useEffect(() => {
    client.subscribeToToken(tokenAddress);
    return () => {
      client.unsubscribeFromToken(tokenAddress);
    };
  }, [tokenAddress, client]);

  const handleTrade = useCallback((trade: TradeEvent) => {
    if (trade.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()) {
      setUpdates(prev => [trade, ...prev].slice(0, 50));
      callback?.(trade);
    }
  }, [tokenAddress, callback]);

  useTradeEvents(handleTrade);

  return { updates };
}
