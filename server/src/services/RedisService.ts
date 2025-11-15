import Redis from 'ioredis';
import { logger } from '../utils/logger';

export class RedisService {
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private publisher: Redis | null = null;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.REDIS_ENABLED === 'true';

    if (this.isEnabled) {
      this.connect();
    } else {
      logger.info('Redis is disabled - running in standalone mode');
    }
  }

  private connect() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      // Main client for get/set operations
      this.client = new Redis(redisUrl, {
        retryStrategy: (times) => {
          if (times > 10) {
            logger.error('Redis connection failed after 10 retries');
            return null;
          }
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      // Subscriber for pub/sub
      this.subscriber = new Redis(redisUrl);

      // Publisher for pub/sub
      this.publisher = new Redis(redisUrl);

      this.client.on('connect', () => {
        logger.info('Redis client connected');
      });

      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
      });

      this.subscriber.on('error', (err) => {
        logger.error('Redis subscriber error:', err);
      });

      this.publisher.on('error', (err) => {
        logger.error('Redis publisher error:', err);
      });
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Get value from cache
   */
  async get(key: string): Promise<string | null> {
    if (!this.isEnabled || !this.client) return null;

    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isEnabled || !this.client) return;

    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
    }
  }

  /**
   * Get JSON value from cache
   */
  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Redis JSON parse error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set JSON value in cache
   */
  async setJSON(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const jsonString = JSON.stringify(value);
      await this.set(key, jsonString, ttlSeconds);
    } catch (error) {
      logger.error(`Redis JSON stringify error for key ${key}:`, error);
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    if (!this.isEnabled || !this.client) return;

    try {
      await this.client.del(key);
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
    }
  }

  /**
   * Publish message to channel
   */
  async publish(channel: string, message: string): Promise<void> {
    if (!this.isEnabled || !this.publisher) return;

    try {
      await this.publisher.publish(channel, message);
    } catch (error) {
      logger.error(`Redis PUBLISH error for channel ${channel}:`, error);
    }
  }

  /**
   * Subscribe to channel
   */
  async subscribe(
    channel: string,
    callback: (message: string) => void
  ): Promise<void> {
    if (!this.isEnabled || !this.subscriber) return;

    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (ch, msg) => {
        if (ch === channel) {
          callback(msg);
        }
      });
    } catch (error) {
      logger.error(`Redis SUBSCRIBE error for channel ${channel}:`, error);
    }
  }

  /**
   * Increment counter
   */
  async incr(key: string): Promise<number> {
    if (!this.isEnabled || !this.client) return 0;

    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set expiration on key
   */
  async expire(key: string, seconds: number): Promise<void> {
    if (!this.isEnabled || !this.client) return;

    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      logger.error(`Redis EXPIRE error for key ${key}:`, error);
    }
  }

  /**
   * Check if service is enabled and connected
   */
  isConnected(): boolean {
    return this.isEnabled && this.client !== null && this.client.status === 'ready';
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await this.client?.quit();
      await this.subscriber?.quit();
      await this.publisher?.quit();
      logger.info('Redis connections closed');
    } catch (error) {
      logger.error('Error closing Redis connections:', error);
    }
  }
}
