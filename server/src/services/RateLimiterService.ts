import { RateLimiterMemory } from 'rate-limiter-flexible';
import { logger } from '../utils/logger';

export class RateLimiterService {
  private connectionLimiter: RateLimiterMemory;
  private messageLimiter: RateLimiterMemory;
  private subscriptionLimiter: RateLimiterMemory;

  constructor() {
    // Limit: 10 connections per IP per minute
    this.connectionLimiter = new RateLimiterMemory({
      points: 10,
      duration: 60,
      blockDuration: 300, // Block for 5 minutes if exceeded
    });

    // Limit: 100 messages per connection per minute
    this.messageLimiter = new RateLimiterMemory({
      points: 100,
      duration: 60,
      blockDuration: 60, // Block for 1 minute if exceeded
    });

    // Limit: 20 subscriptions per connection total
    this.subscriptionLimiter = new RateLimiterMemory({
      points: 20,
      duration: 3600, // 1 hour window
      blockDuration: 3600,
    });
  }

  /**
   * Check if IP can create new connection
   */
  async checkConnectionLimit(ip: string): Promise<void> {
    try {
      await this.connectionLimiter.consume(ip);
    } catch (error: any) {
      if (error.msBeforeNext) {
        logger.warn(
          `Connection rate limit exceeded for ${ip}. Retry after ${Math.ceil(error.msBeforeNext / 1000)}s`
        );
      }
      throw new Error('Connection rate limit exceeded');
    }
  }

  /**
   * Check if connection can send message
   */
  async checkMessageLimit(socketId: string): Promise<void> {
    try {
      await this.messageLimiter.consume(socketId);
    } catch (error: any) {
      if (error.msBeforeNext) {
        logger.warn(
          `Message rate limit exceeded for ${socketId}. Retry after ${Math.ceil(error.msBeforeNext / 1000)}s`
        );
      }
      throw new Error('Message rate limit exceeded');
    }
  }

  /**
   * Check if connection can subscribe to new channel
   */
  async checkSubscriptionLimit(socketId: string): Promise<void> {
    try {
      await this.subscriptionLimiter.consume(socketId);
    } catch (error: any) {
      if (error.msBeforeNext) {
        logger.warn(
          `Subscription rate limit exceeded for ${socketId}. Retry after ${Math.ceil(error.msBeforeNext / 1000)}s`
        );
      }
      throw new Error('Subscription rate limit exceeded');
    }
  }

  /**
   * Release a subscription point when user unsubscribes
   */
  async releaseSubscription(socketId: string): Promise<void> {
    try {
      await this.subscriptionLimiter.reward(socketId, 1);
    } catch (error) {
      logger.error(`Error releasing subscription for ${socketId}:`, error);
    }
  }

  /**
   * Reset limits for a specific key (admin function)
   */
  async resetLimits(key: string): Promise<void> {
    try {
      await Promise.all([
        this.connectionLimiter.delete(key),
        this.messageLimiter.delete(key),
        this.subscriptionLimiter.delete(key),
      ]);
      logger.info(`Rate limits reset for ${key}`);
    } catch (error) {
      logger.error(`Error resetting limits for ${key}:`, error);
    }
  }
}
