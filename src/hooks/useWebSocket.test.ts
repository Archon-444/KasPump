/**
 * Tests for useWebSocket hook
 * Tests WebSocket connections, subscriptions, and event handling
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useWebSocket, useTradeEvents, usePriceUpdates, useTokenUpdates } from './useWebSocket';

// Mock WebSocket client
const mockWebSocketClient = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  isConnected: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  send: vi.fn(),
};

vi.mock('../lib/websocket', () => ({
  getWebSocketClient: () => mockWebSocketClient,
  WebSocketMessage: {},
  TradeEvent: {},
  PriceUpdate: {},
}));

describe('useWebSocket', () => {
  let subscriptionCallbacks: Map<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionCallbacks = new Map();

    // Mock isConnected to return false initially
    mockWebSocketClient.isConnected.mockReturnValue(false);

    // Mock connect to resolve successfully
    mockWebSocketClient.connect.mockResolvedValue(undefined);

    // Mock subscribe to store callbacks
    mockWebSocketClient.subscribe.mockImplementation((eventType: string, callback: Function) => {
      subscriptionCallbacks.set(eventType, callback);
      // Return unsubscribe function
      return () => {
        subscriptionCallbacks.delete(eventType);
      };
    });
  });

  afterEach(() => {
    subscriptionCallbacks.clear();
  });

  describe('Initial Connection', () => {
    it('should initialize with disconnected state', () => {
      const { result } = renderHook(() => useWebSocket('test'));

      expect(result.current.isConnected).toBe(false);
      expect(result.current.lastMessage).toBeNull();
    });

    it('should attempt to connect if not already connected', async () => {
      renderHook(() => useWebSocket('test'));

      await waitFor(() => {
        expect(mockWebSocketClient.connect).toHaveBeenCalled();
      });
    });

    it('should not attempt to connect if already connected', () => {
      mockWebSocketClient.isConnected.mockReturnValue(true);

      renderHook(() => useWebSocket('test'));

      expect(mockWebSocketClient.connect).not.toHaveBeenCalled();
    });

    it('should update connection status after successful connect', async () => {
      mockWebSocketClient.connect.mockResolvedValue(undefined);

      const { result } = renderHook(() => useWebSocket('test'));

      expect(result.current.isConnected).toBe(false);

      await waitFor(() => {
        expect(mockWebSocketClient.connect).toHaveBeenCalled();
      });

      // Simulate connection status update
      act(() => {
        mockWebSocketClient.isConnected.mockReturnValue(true);
        const statusCallback = subscriptionCallbacks.get('*');
        if (statusCallback) {
          statusCallback({ type: 'connected' });
        }
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('should handle connection failures gracefully', async () => {
      mockWebSocketClient.connect.mockRejectedValue(new Error('Connection failed'));

      const { result } = renderHook(() => useWebSocket('test'));

      await waitFor(() => {
        expect(mockWebSocketClient.connect).toHaveBeenCalled();
      });

      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('Event Subscription', () => {
    it('should subscribe to specified event type', () => {
      renderHook(() => useWebSocket('trade'));

      expect(mockWebSocketClient.subscribe).toHaveBeenCalledWith(
        'trade',
        expect.any(Function)
      );
    });

    it('should subscribe to connection status updates', () => {
      renderHook(() => useWebSocket('test'));

      // Should subscribe to both event type and status (*)
      expect(mockWebSocketClient.subscribe).toHaveBeenCalledWith(
        'test',
        expect.any(Function)
      );
      expect(mockWebSocketClient.subscribe).toHaveBeenCalledWith(
        '*',
        expect.any(Function)
      );
    });

    it('should update lastMessage when receiving data', () => {
      const { result } = renderHook(() => useWebSocket<{ value: string }>('test'));

      expect(result.current.lastMessage).toBeNull();

      // Simulate receiving message
      act(() => {
        const callback = subscriptionCallbacks.get('test');
        if (callback) {
          callback({ value: 'test data' });
        }
      });

      expect(result.current.lastMessage).toEqual({ value: 'test data' });
    });

    it('should call callback when receiving data', () => {
      const callback = vi.fn();
      renderHook(() => useWebSocket('test', callback));

      const testData = { id: 1, message: 'hello' };

      act(() => {
        const subscriptionCallback = subscriptionCallbacks.get('test');
        if (subscriptionCallback) {
          subscriptionCallback(testData);
        }
      });

      expect(callback).toHaveBeenCalledWith(testData);
    });

    it('should handle multiple messages', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useWebSocket<string>('test', callback));

      act(() => {
        const subscriptionCallback = subscriptionCallbacks.get('test');
        if (subscriptionCallback) {
          subscriptionCallback('message 1');
          subscriptionCallback('message 2');
          subscriptionCallback('message 3');
        }
      });

      expect(callback).toHaveBeenCalledTimes(3);
      expect(result.current.lastMessage).toBe('message 3');
    });
  });

  describe('Callback Updates', () => {
    it('should use updated callback when it changes', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const { rerender } = renderHook(
        ({ cb }) => useWebSocket('test', cb),
        { initialProps: { cb: callback1 } }
      );

      // Send message with first callback
      act(() => {
        const subscriptionCallback = subscriptionCallbacks.get('test');
        if (subscriptionCallback) {
          subscriptionCallback('test1');
        }
      });

      expect(callback1).toHaveBeenCalledWith('test1');
      expect(callback2).not.toHaveBeenCalled();

      // Update callback
      rerender({ cb: callback2 });

      // Send message with updated callback
      act(() => {
        const subscriptionCallback = subscriptionCallbacks.get('test');
        if (subscriptionCallback) {
          subscriptionCallback('test2');
        }
      });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledWith('test2');
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe on unmount', () => {
      const unsubscribeFn = vi.fn();
      mockWebSocketClient.subscribe.mockReturnValue(unsubscribeFn);

      const { unmount } = renderHook(() => useWebSocket('test'));

      unmount();

      // Should call both unsubscribe functions (event + status)
      expect(unsubscribeFn).toHaveBeenCalledTimes(2);
    });

    it('should unsubscribe when event type changes', () => {
      const unsubscribeFn = vi.fn();
      mockWebSocketClient.subscribe.mockReturnValue(unsubscribeFn);

      const { rerender } = renderHook(
        ({ eventType }) => useWebSocket(eventType),
        { initialProps: { eventType: 'trade' } }
      );

      expect(mockWebSocketClient.subscribe).toHaveBeenCalledWith(
        'trade',
        expect.any(Function)
      );

      // Change event type
      rerender({ eventType: 'price' });

      // Should unsubscribe from old event
      expect(unsubscribeFn).toHaveBeenCalled();

      // Should subscribe to new event
      expect(mockWebSocketClient.subscribe).toHaveBeenCalledWith(
        'price',
        expect.any(Function)
      );
    });
  });

  describe('Send Function', () => {
    it('should provide send function', () => {
      const { result } = renderHook(() => useWebSocket('test'));

      expect(result.current.send).toBeDefined();
      expect(typeof result.current.send).toBe('function');
    });

    it('should call client send when invoked', () => {
      const { result } = renderHook(() => useWebSocket('test'));

      const message = { type: 'subscribe', topic: 'tokens' };

      act(() => {
        result.current.send(message);
      });

      expect(mockWebSocketClient.send).toHaveBeenCalledWith(message);
    });

    it('should handle multiple send calls', () => {
      const { result } = renderHook(() => useWebSocket('test'));

      act(() => {
        result.current.send({ msg: 1 });
        result.current.send({ msg: 2 });
        result.current.send({ msg: 3 });
      });

      expect(mockWebSocketClient.send).toHaveBeenCalledTimes(3);
    });
  });

  describe('Type Safety', () => {
    it('should handle typed messages', () => {
      interface TradeMessage {
        tokenAddress: string;
        amount: number;
        price: number;
      }

      const callback = vi.fn();
      const { result } = renderHook(() => useWebSocket<TradeMessage>('trade', callback));

      const tradeData: TradeMessage = {
        tokenAddress: '0x123',
        amount: 100,
        price: 1.5,
      };

      act(() => {
        const subscriptionCallback = subscriptionCallbacks.get('trade');
        if (subscriptionCallback) {
          subscriptionCallback(tradeData);
        }
      });

      expect(callback).toHaveBeenCalledWith(tradeData);
      expect(result.current.lastMessage).toEqual(tradeData);
    });
  });
});

describe('useTradeEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocketClient.isConnected.mockReturnValue(false);
    mockWebSocketClient.connect.mockResolvedValue(undefined);
    mockWebSocketClient.subscribe.mockImplementation(() => {
      return () => {};
    });
  });

  it('should subscribe to trade events', () => {
    renderHook(() => useTradeEvents());

    expect(mockWebSocketClient.subscribe).toHaveBeenCalledWith(
      'trade',
      expect.any(Function)
    );
  });

  it('should call callback with trade data', () => {
    const callback = vi.fn();
    let tradeCallback: Function | undefined;

    mockWebSocketClient.subscribe.mockImplementation((eventType: string, cb: Function) => {
      if (eventType === 'trade') {
        tradeCallback = cb;
      }
      return () => {};
    });

    renderHook(() => useTradeEvents(callback));

    const tradeData = {
      tokenAddress: '0x123',
      trader: '0x456',
      isBuy: true,
      amount: 100,
      price: 1.5,
      timestamp: Date.now(),
    };

    act(() => {
      if (tradeCallback) {
        tradeCallback(tradeData);
      }
    });

    expect(callback).toHaveBeenCalledWith(tradeData);
  });
});

describe('usePriceUpdates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocketClient.isConnected.mockReturnValue(false);
    mockWebSocketClient.connect.mockResolvedValue(undefined);
    mockWebSocketClient.subscribe.mockImplementation(() => {
      return () => {};
    });
  });

  it('should subscribe to price events', () => {
    renderHook(() => usePriceUpdates());

    expect(mockWebSocketClient.subscribe).toHaveBeenCalledWith(
      'price',
      expect.any(Function)
    );
  });

  it('should call callback with price data', () => {
    const callback = vi.fn();
    let priceCallback: Function | undefined;

    mockWebSocketClient.subscribe.mockImplementation((eventType: string, cb: Function) => {
      if (eventType === 'price') {
        priceCallback = cb;
      }
      return () => {};
    });

    renderHook(() => usePriceUpdates(callback));

    const priceData = {
      tokenAddress: '0x789',
      chainId: 56,
      price: 2.5,
      change24h: 5.2,
      timestamp: Date.now(),
    };

    act(() => {
      if (priceCallback) {
        priceCallback(priceData);
      }
    });

    expect(callback).toHaveBeenCalledWith(priceData);
  });
});

describe('useTokenUpdates', () => {
  let tradeCallback: Function | undefined;
  let priceCallback: Function | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    tradeCallback = undefined;
    priceCallback = undefined;

    mockWebSocketClient.isConnected.mockReturnValue(false);
    mockWebSocketClient.connect.mockResolvedValue(undefined);
    mockWebSocketClient.subscribe.mockImplementation((eventType: string, cb: Function) => {
      if (eventType === 'trade') {
        tradeCallback = cb;
      } else if (eventType === 'price') {
        priceCallback = cb;
      }
      return () => {};
    });
  });

  it('should filter updates for specific token', () => {
    const callback = vi.fn();
    const targetAddress = '0xABC123';

    renderHook(() => useTokenUpdates(targetAddress, undefined, callback));

    // Send trade for different token
    act(() => {
      if (tradeCallback) {
        tradeCallback({ tokenAddress: '0xDEF456', amount: 100 });
      }
    });

    expect(callback).not.toHaveBeenCalled();

    // Send trade for target token
    act(() => {
      if (tradeCallback) {
        tradeCallback({ tokenAddress: targetAddress, amount: 100 });
      }
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should handle case-insensitive address matching', () => {
    const callback = vi.fn();

    renderHook(() => useTokenUpdates('0xabc123', undefined, callback));

    act(() => {
      if (tradeCallback) {
        tradeCallback({ tokenAddress: '0xABC123', amount: 100 });
      }
    });

    expect(callback).toHaveBeenCalled();
  });

  it('should filter by chain ID when provided', () => {
    const callback = vi.fn();
    const targetAddress = '0x123';

    renderHook(() => useTokenUpdates(targetAddress, 56, callback));

    // Send update for different chain
    act(() => {
      if (priceCallback) {
        priceCallback({ tokenAddress: targetAddress, chainId: 97, price: 1.5 });
      }
    });

    expect(callback).not.toHaveBeenCalled();

    // Send update for correct chain
    act(() => {
      if (priceCallback) {
        priceCallback({ tokenAddress: targetAddress, chainId: 56, price: 1.5 });
      }
    });

    expect(callback).toHaveBeenCalledWith({ tokenAddress: targetAddress, chainId: 56, price: 1.5 });
  });

  it('should store updates in state', () => {
    const { result } = renderHook(() => useTokenUpdates('0x123'));

    expect(result.current.updates).toEqual([]);

    act(() => {
      if (tradeCallback) {
        tradeCallback({ tokenAddress: '0x123', amount: 100 });
      }
    });

    expect(result.current.updates).toHaveLength(1);

    act(() => {
      if (priceCallback) {
        priceCallback({ tokenAddress: '0x123', price: 1.5 });
      }
    });

    expect(result.current.updates).toHaveLength(2);
  });

  it('should limit updates to last 50', () => {
    const { result } = renderHook(() => useTokenUpdates('0x123'));

    // Send 60 updates
    act(() => {
      for (let i = 0; i < 60; i++) {
        if (tradeCallback) {
          tradeCallback({ tokenAddress: '0x123', amount: i });
        }
      }
    });

    expect(result.current.updates).toHaveLength(50);
    // Most recent should be first
    expect((result.current.updates[0] as any).amount).toBe(59);
  });

  it('should handle both trade and price updates', () => {
    const { result } = renderHook(() => useTokenUpdates('0x123'));

    act(() => {
      if (tradeCallback) {
        tradeCallback({ tokenAddress: '0x123', type: 'trade', amount: 100 });
      }
      if (priceCallback) {
        priceCallback({ tokenAddress: '0x123', type: 'price', price: 1.5 });
      }
    });

    expect(result.current.updates).toHaveLength(2);
  });
});
