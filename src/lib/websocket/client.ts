import { io, Socket } from 'socket.io-client';

export interface TradeEvent {
  network: string;
  tokenAddress: string;
  ammAddress: string;
  trader: string;
  type: 'buy' | 'sell';
  nativeAmount: string;
  tokenAmount: string;
  price: string;
  fee: string;
  timestamp: number;
  txHash: string;
  blockNumber: number;
}

export interface TokenCreatedEvent {
  network: string;
  tokenAddress: string;
  ammAddress: string;
  creator: string;
  name: string;
  symbol: string;
  timestamp: number;
  txHash: string;
  blockNumber: number;
}

export interface GraduationEvent {
  network: string;
  tokenAddress: string;
  ammAddress?: string;
  finalSupply: string;
  totalRaised?: string;
  nativeReserve?: string;
  timestamp: number;
  txHash: string;
  blockNumber: number;
}

export interface LiquidityAddedEvent {
  network: string;
  tokenAddress: string;
  ammAddress: string;
  tokenAmount: string;
  nativeAmount: string;
  liquidity: string;
  lpTokenAddress: string;
  dexPair: string;
  timestamp: number;
  txHash: string;
  blockNumber: number;
}

export interface PriceData {
  price: string;
  timestamp: number;
}

export type EventCallback<T> = (data: T) => void;

class WebSocketClient {
  private socket: Socket | null = null;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private eventCallbacks: Map<string, Set<EventCallback<any>>> = new Map();
  private subscribedTokens: Set<string> = new Set();
  private subscribedNetworks: Set<string> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

    this.socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;

      // Resubscribe to all previous subscriptions
      this.resubscribe();

      this.emit('connection:established', null);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('connection:lost', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.emit('connection:failed', { error: 'Max reconnection attempts reached' });
      }
    });

    // Event listeners
    this.socket.on('trade:new', (data: TradeEvent) => {
      this.emit('trade:new', data);
    });

    this.socket.on('token:created', (data: TokenCreatedEvent) => {
      this.emit('token:created', data);
    });

    this.socket.on('token:graduated', (data: GraduationEvent) => {
      this.emit('token:graduated', data);
    });

    this.socket.on('liquidity:added', (data: LiquidityAddedEvent) => {
      this.emit('liquidity:added', data);
    });

    this.socket.on('subscription:confirmed', (data) => {
      console.log('Subscription confirmed:', data);
    });

    this.socket.on('subscription:error', (data) => {
      console.error('Subscription error:', data);
    });

    this.socket.on('pong', (data) => {
      // Handle pong response if needed
    });
  }

  /**
   * Resubscribe to all previous subscriptions after reconnect
   */
  private resubscribe(): void {
    // Resubscribe to tokens
    this.subscribedTokens.forEach((tokenAddress) => {
      this.socket?.emit('subscribe:token', { tokenAddress });
    });

    // Resubscribe to networks
    this.subscribedNetworks.forEach((network) => {
      this.socket?.emit('subscribe:network', { network });
    });
  }

  /**
   * Subscribe to token updates
   */
  subscribeToToken(tokenAddress: string, network?: string): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected, subscription will be delayed');
      this.subscribedTokens.add(tokenAddress);
      return;
    }

    this.socket.emit('subscribe:token', { tokenAddress, network });
    this.subscribedTokens.add(tokenAddress);
  }

  /**
   * Unsubscribe from token updates
   */
  unsubscribeFromToken(tokenAddress: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('unsubscribe:token', { tokenAddress });
    this.subscribedTokens.delete(tokenAddress);
  }

  /**
   * Subscribe to network updates
   */
  subscribeToNetwork(network: string): void {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected, subscription will be delayed');
      this.subscribedNetworks.add(network);
      return;
    }

    this.socket.emit('subscribe:network', { network });
    this.subscribedNetworks.add(network);
  }

  /**
   * Unsubscribe from network updates
   */
  unsubscribeFromNetwork(network: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('unsubscribe:network', { network });
    this.subscribedNetworks.delete(network);
  }

  /**
   * Get current price for a token
   */
  async getPrice(tokenAddress: string, network: string): Promise<PriceData | null> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve(null);
        return;
      }

      this.socket.emit(
        'get:price',
        { tokenAddress, network },
        (response: { success: boolean; data?: PriceData; error?: string }) => {
          if (response.success && response.data) {
            resolve(response.data);
          } else {
            resolve(null);
          }
        }
      );

      // Timeout after 5 seconds
      setTimeout(() => resolve(null), 5000);
    });
  }

  /**
   * Get recent trades for a token
   */
  async getTrades(
    tokenAddress: string,
    network: string,
    limit?: number
  ): Promise<TradeEvent[]> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve([]);
        return;
      }

      this.socket.emit(
        'get:trades',
        { tokenAddress, network, limit },
        (response: { success: boolean; data?: TradeEvent[]; error?: string }) => {
          if (response.success && response.data) {
            resolve(response.data);
          } else {
            resolve([]);
          }
        }
      );

      setTimeout(() => resolve([]), 5000);
    });
  }

  /**
   * Send ping to check connection
   */
  ping(): void {
    this.socket?.emit('ping');
  }

  /**
   * Add event listener
   */
  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, new Set());
    }

    this.eventCallbacks.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Remove event listener
   */
  off<T>(event: string, callback: EventCallback<T>): void {
    this.eventCallbacks.get(event)?.delete(callback);
  }

  /**
   * Emit event to local listeners
   */
  private emit<T>(event: string, data: T): void {
    this.eventCallbacks.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event callback for ${event}:`, error);
      }
    });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.isConnecting = false;
    this.subscribedTokens.clear();
    this.subscribedNetworks.clear();
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null;

export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    wsClient = new WebSocketClient();
  }
  return wsClient;
}

export default WebSocketClient;
