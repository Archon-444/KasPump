import express, { Request, Response, Router } from 'express';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { RedisService } from '../services/RedisService';
import { RateLimiterService } from '../services/RateLimiterService';

// Import ABIs
import BondingCurveAMMABI from '../../../contracts/artifacts/contracts/BondingCurveAMM.sol/BondingCurveAMM.json';
import LimitOrderBookABI from '../../../contracts/artifacts/contracts/LimitOrderBook.sol/LimitOrderBook.json';
import StopLossOrderBookABI from '../../../contracts/artifacts/contracts/StopLossOrderBook.sol/StopLossOrderBook.json';

export class TradingAPI {
  private router: Router;
  private redis: RedisService;
  private rateLimiter: RateLimiterService;
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private limitOrderBook: string;
  private stopLossOrderBook: string;

  constructor(redis: RedisService, rateLimiter: RateLimiterService) {
    this.router = express.Router();
    this.redis = redis;
    this.rateLimiter = rateLimiter;

    this.limitOrderBook = process.env.LIMIT_ORDER_BOOK_ADDRESS || '';
    this.stopLossOrderBook = process.env.STOP_LOSS_ORDER_BOOK_ADDRESS || '';

    this.setupProviders();
    this.setupRoutes();
  }

  private setupProviders(): void {
    // BSC Testnet
    this.providers.set(
      'bscTestnet',
      new ethers.JsonRpcProvider(
        process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545'
      )
    );

    // Add more networks as needed
  }

  private setupRoutes(): void {
    // Health check
    this.router.get('/health', this.getHealth.bind(this));

    // Token price and info
    this.router.get('/token/:network/:address/price', this.getTokenPrice.bind(this));
    this.router.get('/token/:network/:address/info', this.getTokenInfo.bind(this));
    this.router.get('/token/:network/:address/chart', this.getChartData.bind(this));

    // Trading calculations
    this.router.get(
      '/token/:network/:address/quote/buy',
      this.getTokensQuote.bind(this)
    );
    this.router.get(
      '/token/:network/:address/quote/sell',
      this.getNativeQuote.bind(this)
    );

    // Order book
    this.router.get('/orders/limit/buy/:token', this.getLimitBuyOrders.bind(this));
    this.router.get('/orders/limit/sell/:token', this.getLimitSellOrders.bind(this));
    this.router.get('/orders/limit/:orderId', this.getLimitOrderDetails.bind(this));

    // Stop-loss orders
    this.router.get('/orders/stoploss/:token', this.getStopLossOrders.bind(this));
    this.router.get('/orders/stoploss/:orderId/details', this.getStopLossDetails.bind(this));
    this.router.get('/orders/stoploss/:token/executable', this.getExecutableStopLoss.bind(this));

    // User orders
    this.router.get('/user/:address/orders/limit', this.getUserLimitOrders.bind(this));
    this.router.get('/user/:address/orders/stoploss', this.getUserStopLossOrders.bind(this));

    // Market data
    this.router.get('/market/:network/tokens', this.getMarketTokens.bind(this));
    this.router.get('/market/:network/trades/recent', this.getRecentTrades.bind(this));
    this.router.get('/market/:network/volume', this.getMarketVolume.bind(this));
  }

  /**
   * Health check endpoint
   */
  private async getHealth(req: Request, res: Response): Promise<void> {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        redis: this.redis.isConnected(),
        providers: this.providers.size,
      },
    });
  }

  /**
   * Get current token price
   */
  private async getTokenPrice(req: Request, res: Response): Promise<void> {
    try {
      const { network, address } = req.params;

      // Check cache first
      const cacheKey = `price:${network}:${address}`;
      const cached = await this.redis.getJSON<{ price: string; timestamp: number }>(cacheKey);

      if (cached) {
        res.json({
          success: true,
          data: {
            tokenAddress: address,
            network,
            price: cached.price,
            timestamp: cached.timestamp,
            cached: true,
          },
        });
        return;
      }

      // Fetch from blockchain
      const provider = this.providers.get(network);
      if (!provider) {
        res.status(400).json({ success: false, error: 'Network not supported' });
        return;
      }

      // Get AMM address from token (implementation depends on your factory contract)
      // For now, return cached or error
      res.status(404).json({
        success: false,
        error: 'Price not cached. Please subscribe to WebSocket for live prices.',
      });
    } catch (error) {
      logger.error('Error getting token price:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get token information
   */
  private async getTokenInfo(req: Request, res: Response): Promise<void> {
    try {
      const { network, address } = req.params;

      const cacheKey = `token:${network}:${address}`;
      const tokenData = await this.redis.getJSON(cacheKey);

      if (tokenData) {
        res.json({ success: true, data: tokenData });
      } else {
        res.status(404).json({ success: false, error: 'Token not found' });
      }
    } catch (error) {
      logger.error('Error getting token info:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get chart data for TradingView
   */
  private async getChartData(req: Request, res: Response): Promise<void> {
    try {
      const { network, address } = req.params;
      const { from, to, resolution } = req.query;

      // This would integrate with your subgraph or time-series database
      // For now, return placeholder
      res.json({
        success: true,
        data: {
          tokenAddress: address,
          network,
          resolution: resolution || '1H',
          bars: [],
          // Format: [{time, open, high, low, close, volume}, ...]
        },
      });
    } catch (error) {
      logger.error('Error getting chart data:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get quote for buying tokens
   */
  private async getTokensQuote(req: Request, res: Response): Promise<void> {
    try {
      const { network, address } = req.params;
      const { nativeAmount } = req.query;

      if (!nativeAmount) {
        res.status(400).json({ success: false, error: 'nativeAmount required' });
        return;
      }

      const provider = this.providers.get(network);
      if (!provider) {
        res.status(400).json({ success: false, error: 'Network not supported' });
        return;
      }

      // Get AMM contract and calculate
      // This is a simplified example
      res.json({
        success: true,
        data: {
          nativeAmount: nativeAmount,
          tokenAmount: '0', // Calculate from AMM
          price: '0',
          priceImpact: '0',
          fee: '0',
        },
      });
    } catch (error) {
      logger.error('Error getting tokens quote:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get quote for selling tokens
   */
  private async getNativeQuote(req: Request, res: Response): Promise<void> {
    try {
      const { network, address } = req.params;
      const { tokenAmount } = req.query;

      if (!tokenAmount) {
        res.status(400).json({ success: false, error: 'tokenAmount required' });
        return;
      }

      res.json({
        success: true,
        data: {
          tokenAmount: tokenAmount,
          nativeAmount: '0', // Calculate from AMM
          price: '0',
          priceImpact: '0',
          fee: '0',
        },
      });
    } catch (error) {
      logger.error('Error getting native quote:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get limit buy orders for a token
   */
  private async getLimitBuyOrders(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      if (!this.limitOrderBook) {
        res.status(503).json({ success: false, error: 'Limit order book not configured' });
        return;
      }

      const provider = this.providers.get('bscTestnet'); // TODO: Dynamic network
      if (!provider) {
        res.status(400).json({ success: false, error: 'Provider not available' });
        return;
      }

      const orderBook = new ethers.Contract(
        this.limitOrderBook,
        LimitOrderBookABI.abi,
        provider
      );

      const orderIds = await orderBook.getTokenBuyOrders(token);
      const orders = [];

      for (const orderId of orderIds) {
        const order = await orderBook.getOrder(orderId);
        if (!order.cancelled && order.filled < order.amount) {
          orders.push({
            orderId: order.orderId.toString(),
            trader: order.trader,
            price: order.price.toString(),
            amount: order.amount.toString(),
            filled: order.filled.toString(),
            remaining: (order.amount - order.filled).toString(),
            timestamp: order.timestamp.toString(),
          });
        }
      }

      res.json({ success: true, data: orders });
    } catch (error) {
      logger.error('Error getting limit buy orders:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get limit sell orders for a token
   */
  private async getLimitSellOrders(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      if (!this.limitOrderBook) {
        res.status(503).json({ success: false, error: 'Limit order book not configured' });
        return;
      }

      const provider = this.providers.get('bscTestnet');
      if (!provider) {
        res.status(400).json({ success: false, error: 'Provider not available' });
        return;
      }

      const orderBook = new ethers.Contract(
        this.limitOrderBook,
        LimitOrderBookABI.abi,
        provider
      );

      const orderIds = await orderBook.getTokenSellOrders(token);
      const orders = [];

      for (const orderId of orderIds) {
        const order = await orderBook.getOrder(orderId);
        if (!order.cancelled && order.filled < order.amount) {
          orders.push({
            orderId: order.orderId.toString(),
            trader: order.trader,
            price: order.price.toString(),
            amount: order.amount.toString(),
            filled: order.filled.toString(),
            remaining: (order.amount - order.filled).toString(),
            timestamp: order.timestamp.toString(),
          });
        }
      }

      res.json({ success: true, data: orders });
    } catch (error) {
      logger.error('Error getting limit sell orders:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get limit order details
   */
  private async getLimitOrderDetails(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      if (!this.limitOrderBook) {
        res.status(503).json({ success: false, error: 'Limit order book not configured' });
        return;
      }

      const provider = this.providers.get('bscTestnet');
      if (!provider) {
        res.status(400).json({ success: false, error: 'Provider not available' });
        return;
      }

      const orderBook = new ethers.Contract(
        this.limitOrderBook,
        LimitOrderBookABI.abi,
        provider
      );

      const order = await orderBook.getOrder(orderId);

      res.json({
        success: true,
        data: {
          orderId: order.orderId.toString(),
          trader: order.trader,
          tokenAddress: order.tokenAddress,
          isBuyOrder: order.isBuyOrder,
          price: order.price.toString(),
          amount: order.amount.toString(),
          filled: order.filled.toString(),
          timestamp: order.timestamp.toString(),
          cancelled: order.cancelled,
        },
      });
    } catch (error) {
      logger.error('Error getting limit order details:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get stop-loss orders for a token
   */
  private async getStopLossOrders(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      // Implementation similar to limit orders
      res.json({ success: true, data: [] });
    } catch (error) {
      logger.error('Error getting stop-loss orders:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get stop-loss order details
   */
  private async getStopLossDetails(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      // Implementation
      res.json({ success: true, data: {} });
    } catch (error) {
      logger.error('Error getting stop-loss details:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get executable stop-loss orders
   */
  private async getExecutableStopLoss(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      if (!this.stopLossOrderBook) {
        res.status(503).json({ success: false, error: 'Stop-loss order book not configured' });
        return;
      }

      const provider = this.providers.get('bscTestnet');
      if (!provider) {
        res.status(400).json({ success: false, error: 'Provider not available' });
        return;
      }

      const orderBook = new ethers.Contract(
        this.stopLossOrderBook,
        StopLossOrderBookABI.abi,
        provider
      );

      const executableOrderIds = await orderBook.getExecutableOrders(token);

      res.json({
        success: true,
        data: {
          token,
          executableOrders: executableOrderIds.map((id: bigint) => id.toString()),
          count: executableOrderIds.length,
        },
      });
    } catch (error) {
      logger.error('Error getting executable stop-loss orders:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get user's limit orders
   */
  private async getUserLimitOrders(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;

      // Implementation
      res.json({ success: true, data: [] });
    } catch (error) {
      logger.error('Error getting user limit orders:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get user's stop-loss orders
   */
  private async getUserStopLossOrders(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;

      // Implementation
      res.json({ success: true, data: [] });
    } catch (error) {
      logger.error('Error getting user stop-loss orders:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get market tokens
   */
  private async getMarketTokens(req: Request, res: Response): Promise<void> {
    try {
      const { network } = req.params;
      const { sort, limit } = req.query;

      // This would query your subgraph
      res.json({
        success: true,
        data: {
          network,
          tokens: [],
          total: 0,
        },
      });
    } catch (error) {
      logger.error('Error getting market tokens:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get recent trades
   */
  private async getRecentTrades(req: Request, res: Response): Promise<void> {
    try {
      const { network } = req.params;
      const { limit } = req.query;

      // Query from cache or subgraph
      res.json({
        success: true,
        data: {
          network,
          trades: [],
        },
      });
    } catch (error) {
      logger.error('Error getting recent trades:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get market volume statistics
   */
  private async getMarketVolume(req: Request, res: Response): Promise<void> {
    try {
      const { network } = req.params;
      const { period } = req.query;

      res.json({
        success: true,
        data: {
          network,
          period: period || '24h',
          volume: '0',
          trades: 0,
          tokens: 0,
        },
      });
    } catch (error) {
      logger.error('Error getting market volume:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
