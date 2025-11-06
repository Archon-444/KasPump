// WebSocket client for real-time updates
export type WebSocketMessage = 
  | { type: 'trade'; data: TradeEvent }
  | { type: 'price'; data: PriceUpdate }
  | { type: 'token_created'; data: TokenCreatedEvent }
  | { type: 'token_graduated'; data: TokenGraduatedEvent }
  | { type: 'error'; data: { message: string } }
  | { type: 'ping' }
  | { type: 'pong' };

export interface TradeEvent {
  tokenAddress: string;
  chainId: number;
  type: 'buy' | 'sell';
  amount: string;
  price: string;
  timestamp: number;
  user: string;
  txHash: string;
}

export interface PriceUpdate {
  tokenAddress: string;
  chainId: number;
  price: string;
  change24h: number;
  volume24h: string;
  marketCap: string;
  timestamp: number;
}

export interface TokenCreatedEvent {
  tokenAddress: string;
  chainId: number;
  name: string;
  symbol: string;
  creator: string;
  txHash: string;
}

export interface TokenGraduatedEvent {
  tokenAddress: string;
  chainId: number;
  ammAddress: string;
  timestamp: number;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnecting = false;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.isConnecting) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    }

    return new Promise((resolve, reject) => {
      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          console.log('WebSocket connected');
          
          // Start ping/pong to keep connection alive
          this.startPing();
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            
            if (message.type === 'pong') {
              // Respond to pong, connection is alive
              return;
            }

            if (message.type === 'ping') {
              this.send({ type: 'pong' });
              return;
            }

            if (message.type === 'error') {
              console.error('WebSocket error:', message.data.message);
              return;
            }

            // Dispatch to listeners
            const listeners = this.listeners.get(message.type);
            if (listeners && 'data' in message) {
              listeners.forEach(listener => {
                try {
                  listener(message.data);
                } catch (error) {
                  console.error('Error in WebSocket listener:', error);
                }
              });
            }

            // Also dispatch to '*' wildcard listeners
            const wildcardListeners = this.listeners.get('*');
            if (wildcardListeners) {
              wildcardListeners.forEach(listener => {
                try {
                  listener(message);
                } catch (error) {
                  console.error('Error in WebSocket wildcard listener:', error);
                }
              });
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = () => {
          this.isConnecting = false;
          this.stopPing();
          console.log('WebSocket disconnected');
          
          // Attempt to reconnect if not manually closed
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);
            
            setTimeout(() => {
              this.connect().catch(console.error);
            }, delay);
          } else {
            console.error('Max reconnection attempts reached');
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }

  subscribe(eventType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(callback);

    // Auto-connect if not connected
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.connect().catch(console.error);
    }

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null;

export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    wsClient = new WebSocketClient(wsUrl);
  }
  return wsClient;
}
