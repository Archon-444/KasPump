/**
 * Tests for useWebSocket hook
 * Tests WebSocket connections, subscriptions, and event handling
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useWebSocket, useTradeEvents, usePriceUpdates, useTokenUpdates } from './useWebSocket';

// Mock WebSocket client (singleton returned by getWebSocketClient)
type EventCallback = (data: any) => void;

let eventCallbacks: Map<string, Set<EventCallback>>;

const mockSocket = {
  emit: vi.fn(),
};

const mockWebSocketClient = {
  isConnected: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  subscribeToToken: vi.fn(),
  unsubscribeFromToken: vi.fn(),
  socket: mockSocket,
};

vi.mock('../lib/websocket/client', () => ({
  getWebSocketClient: () => mockWebSocketClient,
}));

// Helper to emit an event to all registered listeners
function emitEvent(event: string, data: any) {
  eventCallbacks.get(event)?.forEach(cb => cb(data));
}

function setupMockClient() {
  vi.clearAllMocks();
  eventCallbacks = new Map();

  mockWebSocketClient.isConnected.mockReturnValue(false);

  mockWebSocketClient.on.mockImplementation((event: string, callback: EventCallback) => {
    if (!eventCallbacks.has(event)) {
      eventCallbacks.set(event, new Set());
    }
    eventCallbacks.get(event)!.add(callback);
    // Return unsubscribe function
    return () => {
      eventCallbacks.get(event)?.delete(callback);
    };
  });
}

describe('useWebSocket', () => {
  beforeEach(() => {
    setupMockClient();
  });

  afterEach(() => {
    eventCallbacks.clear();
  });

  describe('Initial Connection', () => {
    it('should initialize with disconnected state when client is not connected', () => {
      const { result } = renderHook(() => useWebSocket('test'));

      expect(result.current.isConnected).toBe(false);
      expect(result.current.lastMessage).toBeNull();
    });

    it('should initialize with connected state when client is already connected', () => {
      mockWebSocketClient.isConnected.mockReturnValue(true);

      const { result } = renderHook(() => useWebSocket('test'));

      expect(result.current.isConnected).toBe(true);
    });

    it('should update connection status when connection is established', () => {
      const { result } = renderHook(() => useWebSocket('test'));

      expect(result.current.isConnected).toBe(false);

      act(() => {
        emitEvent('connection:established', null);
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('should update connection status when connection is lost', () => {
      mockWebSocketClient.isConnected.mockReturnValue(true);

      const { result } = renderHook(() => useWebSocket('test'));

      expect(result.current.isConnected).toBe(true);

      act(() => {
        emitEvent('connection:lost', { reason: 'transport close' });
      });

      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('Event Subscription', () => {
    it('should subscribe to specified event type', () => {
      renderHook(() => useWebSocket('trade:new'));

      expect(mockWebSocketClient.on).toHaveBeenCalledWith(
        'trade:new',
        expect.any(Function)
      );
    });

    it('should subscribe to connection lifecycle events', () => {
      renderHook(() => useWebSocket('test'));

      expect(mockWebSocketClient.on).toHaveBeenCalledWith(
        'connection:established',
        expect.any(Function)
      );
      expect(mockWebSocketClient.on).toHaveBeenCalledWith(
        'connection:lost',
        expect.any(Function)
      );
      expect(mockWebSocketClient.on).toHaveBeenCalledWith(
        'test',
        expect.any(Function)
      );
    });

    it('should update lastMessage when receiving data', () => {
      const { result } = renderHook(() => useWebSocket<{ value: string }>('test'));

      expect(result.current.lastMessage).toBeNull();

      act(() => {
        emitEvent('test', { value: 'test data' });
      });

      expect(result.current.lastMessage).toEqual({ value: 'test data' });
    });

    it('should call callback when receiving data', () => {
      const callback = vi.fn();
      renderHook(() => useWebSocket('test', callback));

      const testData = { id: 1, message: 'hello' };

      act(() => {
        emitEvent('test', testData);
      });

      expect(callback).toHaveBeenCalledWith(testData);
    });

    it('should handle multiple messages', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useWebSocket<string>('test', callback));

      act(() => {
        emitEvent('test', 'message 1');
        emitEvent('test', 'message 2');
        emitEvent('test', 'message 3');
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
        emitEvent('test', 'test1');
      });

      expect(callback1).toHaveBeenCalledWith('test1');
      expect(callback2).not.toHaveBeenCalled();

      // Update callback
      rerender({ cb: callback2 });

      // Send message with updated callback
      act(() => {
        emitEvent('test', 'test2');
      });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledWith('test2');
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe on unmount', () => {
      const unsubscribeFn = vi.fn();
      mockWebSocketClient.on.mockReturnValue(unsubscribeFn);

      const { unmount } = renderHook(() => useWebSocket('test'));

      unmount();

      // Should call all unsubscribe functions (event + connection established/lost)
      expect(unsubscribeFn).toHaveBeenCalledTimes(3);
    });

    it('should unsubscribe when event type changes', () => {
      const unsubscribeFn = vi.fn();
      mockWebSocketClient.on.mockReturnValue(unsubscribeFn);

      const { rerender } = renderHook(
        ({ eventType }) => useWebSocket(eventType),
        { initialProps: { eventType: 'trade:new' } }
      );

      expect(mockWebSocketClient.on).toHaveBeenCalledWith(
        'trade:new',
        expect.any(Function)
      );

      // Change event type
      rerender({ eventType: 'price:update' });

      // Should unsubscribe from old event
      expect(unsubscribeFn).toHaveBeenCalled();

      // Should subscribe to new event
      expect(mockWebSocketClient.on).toHaveBeenCalledWith(
        'price:update',
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

    it('should emit on the socket when connected', () => {
      mockWebSocketClient.isConnected.mockReturnValue(true);

      const { result } = renderHook(() => useWebSocket('test'));

      const message = { topic: 'tokens' };

      act(() => {
        result.current.send('subscribe', message);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', message);
    });

    it('should not emit when disconnected', () => {
      mockWebSocketClient.isConnected.mockReturnValue(false);

      const { result } = renderHook(() => useWebSocket('test'));

      act(() => {
        result.current.send('subscribe', { topic: 'tokens' });
      });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should handle multiple send calls', () => {
      mockWebSocketClient.isConnected.mockReturnValue(true);

      const { result } = renderHook(() => useWebSocket('test'));

      act(() => {
        result.current.send('event', { msg: 1 });
        result.current.send('event', { msg: 2 });
        result.current.send('event', { msg: 3 });
      });

      expect(mockSocket.emit).toHaveBeenCalledTimes(3);
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
      const { result } = renderHook(() => useWebSocket<TradeMessage>('trade:new', callback));

      const tradeData: TradeMessage = {
        tokenAddress: '0x123',
        amount: 100,
        price: 1.5,
      };

      act(() => {
        emitEvent('trade:new', tradeData);
      });

      expect(callback).toHaveBeenCalledWith(tradeData);
      expect(result.current.lastMessage).toEqual(tradeData);
    });
  });
});

describe('useTradeEvents', () => {
  beforeEach(() => {
    setupMockClient();
  });

  it('should subscribe to trade:new events', () => {
    renderHook(() => useTradeEvents());

    expect(mockWebSocketClient.on).toHaveBeenCalledWith(
      'trade:new',
      expect.any(Function)
    );
  });

  it('should call callback with trade data', () => {
    const callback = vi.fn();

    renderHook(() => useTradeEvents(callback));

    const tradeData = {
      network: 'base',
      tokenAddress: '0x123',
      ammAddress: '0xAMM',
      trader: '0x456',
      type: 'buy' as const,
      nativeAmount: '100',
      tokenAmount: '1000',
      price: '1.5',
      fee: '0.1',
      timestamp: Date.now(),
      txHash: '0xhash',
      blockNumber: 1,
    };

    act(() => {
      emitEvent('trade:new', tradeData);
    });

    expect(callback).toHaveBeenCalledWith(tradeData);
  });
});

describe('usePriceUpdates', () => {
  beforeEach(() => {
    setupMockClient();
  });

  it('should subscribe to price:update events', () => {
    renderHook(() => usePriceUpdates());

    expect(mockWebSocketClient.on).toHaveBeenCalledWith(
      'price:update',
      expect.any(Function)
    );
  });

  it('should call callback with price data', () => {
    const callback = vi.fn();

    renderHook(() => usePriceUpdates(callback));

    const priceData = {
      tokenAddress: '0x789',
      chainId: 8453,
      price: '2.5',
      change24h: 5.2,
      timestamp: Date.now(),
    };

    act(() => {
      emitEvent('price:update', priceData);
    });

    expect(callback).toHaveBeenCalledWith(priceData);
  });
});

describe('useTokenUpdates', () => {
  beforeEach(() => {
    setupMockClient();
  });

  it('should subscribe to token updates on mount and unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => useTokenUpdates('0x123'));

    expect(mockWebSocketClient.subscribeToToken).toHaveBeenCalledWith('0x123');

    unmount();

    expect(mockWebSocketClient.unsubscribeFromToken).toHaveBeenCalledWith('0x123');
  });

  it('should filter updates for specific token', () => {
    const callback = vi.fn();
    const targetAddress = '0xABC123';

    renderHook(() => useTokenUpdates(targetAddress, undefined, callback));

    // Send trade for different token
    act(() => {
      emitEvent('trade:new', { tokenAddress: '0xDEF456', tokenAmount: '100' });
    });

    expect(callback).not.toHaveBeenCalled();

    // Send trade for target token
    act(() => {
      emitEvent('trade:new', { tokenAddress: targetAddress, tokenAmount: '100' });
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should handle case-insensitive address matching', () => {
    const callback = vi.fn();

    renderHook(() => useTokenUpdates('0xabc123', undefined, callback));

    act(() => {
      emitEvent('trade:new', { tokenAddress: '0xABC123', tokenAmount: '100' });
    });

    expect(callback).toHaveBeenCalled();
  });

  it('should store trade updates in state', () => {
    const { result } = renderHook(() => useTokenUpdates('0x123'));

    expect(result.current.updates).toEqual([]);

    act(() => {
      emitEvent('trade:new', { tokenAddress: '0x123', tokenAmount: '100' });
    });

    expect(result.current.updates).toHaveLength(1);

    act(() => {
      emitEvent('trade:new', { tokenAddress: '0x123', tokenAmount: '200' });
    });

    expect(result.current.updates).toHaveLength(2);
  });

  it('should limit updates to last 50', () => {
    const { result } = renderHook(() => useTokenUpdates('0x123'));

    // Send 60 updates
    act(() => {
      for (let i = 0; i < 60; i++) {
        emitEvent('trade:new', { tokenAddress: '0x123', amount: i });
      }
    });

    expect(result.current.updates).toHaveLength(50);
    // Most recent should be first
    expect((result.current.updates[0] as any).amount).toBe(59);
  });

  it('should ignore price:update events (only trades are tracked)', () => {
    const { result } = renderHook(() => useTokenUpdates('0x123'));

    act(() => {
      emitEvent('trade:new', { tokenAddress: '0x123', amount: 100 });
      emitEvent('price:update', { tokenAddress: '0x123', price: '1.5' });
    });

    expect(result.current.updates).toHaveLength(1);
  });
});
