import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { RedisService } from '../services/RedisService';
import { RateLimiterService } from '../services/RateLimiterService';

export class SocketEventHandlers {
  private io: SocketIOServer;
  private redis: RedisService;
  private rateLimiter: RateLimiterService;
  private subscriptions: Map<string, Set<string>> = new Map(); // socketId -> Set of rooms

  constructor(
    io: SocketIOServer,
    redis: RedisService,
    rateLimiter: RateLimiterService
  ) {
    this.io = io;
    this.redis = redis;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Register all event handlers for a socket
   */
  registerHandlers(socket: Socket): void {
    // Subscribe to token updates
    socket.on('subscribe:token', async (data) => {
      await this.handleSubscribeToken(socket, data);
    });

    // Unsubscribe from token updates
    socket.on('unsubscribe:token', async (data) => {
      await this.handleUnsubscribeToken(socket, data);
    });

    // Subscribe to network updates
    socket.on('subscribe:network', async (data) => {
      await this.handleSubscribeNetwork(socket, data);
    });

    // Unsubscribe from network updates
    socket.on('unsubscribe:network', async (data) => {
      await this.handleUnsubscribeNetwork(socket, data);
    });

    // Get current price for token
    socket.on('get:price', async (data, callback) => {
      await this.handleGetPrice(socket, data, callback);
    });

    // Get recent trades for token
    socket.on('get:trades', async (data, callback) => {
      await this.handleGetTrades(socket, data, callback);
    });

    // Get token info
    socket.on('get:token', async (data, callback) => {
      await this.handleGetToken(socket, data, callback);
    });

    // Ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  }

  /**
   * Handle token subscription
   */
  private async handleSubscribeToken(
    socket: Socket,
    data: { tokenAddress: string; network?: string }
  ): Promise<void> {
    try {
      // Check rate limit
      await this.rateLimiter.checkSubscriptionLimit(socket.id);

      const { tokenAddress, network } = data;
      const room = `token:${tokenAddress}`;

      // Join room
      await socket.join(room);

      // Track subscription
      if (!this.subscriptions.has(socket.id)) {
        this.subscriptions.set(socket.id, new Set());
      }
      this.subscriptions.get(socket.id)!.add(room);

      logger.debug(`Socket ${socket.id} subscribed to ${room}`);

      // Send current cached data
      if (network) {
        const priceData = await this.redis.getJSON(`price:${network}:${tokenAddress}`);
        const tradeData = await this.redis.getJSON(`trade:${network}:${tokenAddress}:latest`);

        socket.emit('subscription:confirmed', {
          room,
          currentPrice: priceData,
          latestTrade: tradeData,
        });
      } else {
        socket.emit('subscription:confirmed', { room });
      }
    } catch (error: any) {
      logger.warn(`Failed to subscribe token for ${socket.id}:`, error.message);
      socket.emit('subscription:error', {
        error: error.message || 'Subscription failed',
      });
    }
  }

  /**
   * Handle token unsubscription
   */
  private async handleUnsubscribeToken(
    socket: Socket,
    data: { tokenAddress: string }
  ): Promise<void> {
    const { tokenAddress } = data;
    const room = `token:${tokenAddress}`;

    await socket.leave(room);

    // Remove from tracking
    this.subscriptions.get(socket.id)?.delete(room);

    // Release rate limit point
    await this.rateLimiter.releaseSubscription(socket.id);

    logger.debug(`Socket ${socket.id} unsubscribed from ${room}`);

    socket.emit('unsubscription:confirmed', { room });
  }

  /**
   * Handle network subscription
   */
  private async handleSubscribeNetwork(
    socket: Socket,
    data: { network: string }
  ): Promise<void> {
    try {
      await this.rateLimiter.checkSubscriptionLimit(socket.id);

      const { network } = data;
      const room = `network:${network}`;

      await socket.join(room);

      // Track subscription
      if (!this.subscriptions.has(socket.id)) {
        this.subscriptions.set(socket.id, new Set());
      }
      this.subscriptions.get(socket.id)!.add(room);

      logger.debug(`Socket ${socket.id} subscribed to ${room}`);

      socket.emit('subscription:confirmed', { room });
    } catch (error: any) {
      logger.warn(`Failed to subscribe network for ${socket.id}:`, error.message);
      socket.emit('subscription:error', {
        error: error.message || 'Subscription failed',
      });
    }
  }

  /**
   * Handle network unsubscription
   */
  private async handleUnsubscribeNetwork(
    socket: Socket,
    data: { network: string }
  ): Promise<void> {
    const { network } = data;
    const room = `network:${network}`;

    await socket.leave(room);
    this.subscriptions.get(socket.id)?.delete(room);

    await this.rateLimiter.releaseSubscription(socket.id);

    logger.debug(`Socket ${socket.id} unsubscribed from ${room}`);

    socket.emit('unsubscription:confirmed', { room });
  }

  /**
   * Handle get price request
   */
  private async handleGetPrice(
    socket: Socket,
    data: { tokenAddress: string; network: string },
    callback?: Function
  ): Promise<void> {
    try {
      await this.rateLimiter.checkMessageLimit(socket.id);

      const { tokenAddress, network } = data;
      const cacheKey = `price:${network}:${tokenAddress}`;

      const priceData = await this.redis.getJSON(cacheKey);

      if (callback) {
        callback({ success: true, data: priceData });
      } else {
        socket.emit('price:response', { tokenAddress, network, data: priceData });
      }
    } catch (error: any) {
      logger.error(`Error getting price for ${socket.id}:`, error);

      if (callback) {
        callback({ success: false, error: error.message });
      } else {
        socket.emit('price:error', { error: error.message });
      }
    }
  }

  /**
   * Handle get trades request
   */
  private async handleGetTrades(
    socket: Socket,
    data: { tokenAddress: string; network: string; limit?: number },
    callback?: Function
  ): Promise<void> {
    try {
      await this.rateLimiter.checkMessageLimit(socket.id);

      const { tokenAddress, network } = data;
      const cacheKey = `trade:${network}:${tokenAddress}:latest`;

      // Get latest trade from cache
      const latestTrade = await this.redis.getJSON(cacheKey);

      if (callback) {
        callback({
          success: true,
          data: latestTrade ? [latestTrade] : [],
        });
      } else {
        socket.emit('trades:response', {
          tokenAddress,
          network,
          data: latestTrade ? [latestTrade] : [],
        });
      }
    } catch (error: any) {
      logger.error(`Error getting trades for ${socket.id}:`, error);

      if (callback) {
        callback({ success: false, error: error.message });
      } else {
        socket.emit('trades:error', { error: error.message });
      }
    }
  }

  /**
   * Handle get token request
   */
  private async handleGetToken(
    socket: Socket,
    data: { tokenAddress: string; network: string },
    callback?: Function
  ): Promise<void> {
    try {
      await this.rateLimiter.checkMessageLimit(socket.id);

      const { tokenAddress, network } = data;
      const cacheKey = `token:${network}:${tokenAddress}`;

      const tokenData = await this.redis.getJSON(cacheKey);

      if (callback) {
        callback({ success: true, data: tokenData });
      } else {
        socket.emit('token:response', { tokenAddress, network, data: tokenData });
      }
    } catch (error: any) {
      logger.error(`Error getting token for ${socket.id}:`, error);

      if (callback) {
        callback({ success: false, error: error.message });
      } else {
        socket.emit('token:error', { error: error.message });
      }
    }
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(socket: Socket): void {
    // Clean up all subscriptions for this socket
    const rooms = this.subscriptions.get(socket.id);

    if (rooms) {
      rooms.forEach((room) => {
        socket.leave(room);
      });

      this.subscriptions.delete(socket.id);
    }

    logger.debug(`Cleaned up subscriptions for ${socket.id}`);
  }

  /**
   * Get subscription stats
   */
  getStats(): {
    totalConnections: number;
    totalSubscriptions: number;
    subscriptionsByRoom: Record<string, number>;
  } {
    const stats = {
      totalConnections: this.subscriptions.size,
      totalSubscriptions: 0,
      subscriptionsByRoom: {} as Record<string, number>,
    };

    for (const rooms of this.subscriptions.values()) {
      stats.totalSubscriptions += rooms.size;

      for (const room of rooms) {
        stats.subscriptionsByRoom[room] =
          (stats.subscriptionsByRoom[room] || 0) + 1;
      }
    }

    return stats;
  }
}
