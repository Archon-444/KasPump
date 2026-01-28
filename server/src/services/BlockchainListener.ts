import { ethers, WebSocketProvider } from 'ethers';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import { RedisService } from './RedisService';
import TokenFactoryABI from '../abis/TokenFactory.json';
import BondingCurveAMMABI from '../abis/BondingCurveAMM.json';

interface NetworkConfig {
  name: string;
  rpcUrl: string;
  wsUrl?: string;
  chainId: number;
  factoryAddress: string;
}

const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  bscTestnet: {
    name: 'BSC Testnet',
    rpcUrl:
      process.env.BSC_TESTNET_RPC_URL ||
      process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL ||
      'https://data-seed-prebsc-1-s1.binance.org:8545',
    wsUrl: process.env.BSC_TESTNET_WS_URL || 'wss://bsc-testnet.publicnode.com',
    chainId: 97,
    factoryAddress:
      process.env.BSC_TESTNET_FACTORY_ADDRESS ||
      process.env.NEXT_PUBLIC_BSC_TESTNET_TOKEN_FACTORY ||
      '',
  },
  bsc: {
    name: 'BSC Mainnet',
    rpcUrl:
      process.env.BSC_RPC_URL ||
      process.env.NEXT_PUBLIC_BSC_RPC_URL ||
      'https://bsc-dataseed1.binance.org',
    wsUrl: process.env.BSC_WS_URL || 'wss://bsc.publicnode.com',
    chainId: 56,
    factoryAddress:
      process.env.BSC_FACTORY_ADDRESS ||
      process.env.NEXT_PUBLIC_BSC_TOKEN_FACTORY ||
      '',
  },
  arbitrumSepolia: {
    name: 'Arbitrum Sepolia',
    rpcUrl:
      process.env.ARBITRUM_SEPOLIA_RPC_URL ||
      process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL ||
      'https://sepolia-rollup.arbitrum.io/rpc',
    wsUrl: process.env.ARBITRUM_SEPOLIA_WS_URL,
    chainId: 421614,
    factoryAddress:
      process.env.ARBITRUM_SEPOLIA_FACTORY_ADDRESS ||
      process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_TOKEN_FACTORY ||
      '',
  },
  arbitrum: {
    name: 'Arbitrum One',
    rpcUrl:
      process.env.ARBITRUM_RPC_URL ||
      process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL ||
      'https://arb1.arbitrum.io/rpc',
    wsUrl: process.env.ARBITRUM_WS_URL,
    chainId: 42161,
    factoryAddress:
      process.env.ARBITRUM_FACTORY_ADDRESS ||
      process.env.NEXT_PUBLIC_ARBITRUM_TOKEN_FACTORY ||
      '',
  },
  baseSepolia: {
    name: 'Base Sepolia',
    rpcUrl:
      process.env.BASE_SEPOLIA_RPC_URL ||
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ||
      'https://sepolia.base.org',
    wsUrl: process.env.BASE_SEPOLIA_WS_URL,
    chainId: 84532,
    factoryAddress:
      process.env.BASE_SEPOLIA_FACTORY_ADDRESS ||
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_TOKEN_FACTORY ||
      '',
  },
  base: {
    name: 'Base',
    rpcUrl:
      process.env.BASE_RPC_URL ||
      process.env.NEXT_PUBLIC_BASE_RPC_URL ||
      'https://mainnet.base.org',
    wsUrl: process.env.BASE_WS_URL,
    chainId: 8453,
    factoryAddress:
      process.env.BASE_FACTORY_ADDRESS ||
      process.env.NEXT_PUBLIC_BASE_TOKEN_FACTORY ||
      '',
  },
};

export class BlockchainListener {
  private providers: Map<string, WebSocketProvider> = new Map();
  private factories: Map<string, ethers.Contract> = new Map();
  private amms: Map<string, ethers.Contract> = new Map();
  private io: SocketIOServer;
  private redis: RedisService;
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(io: SocketIOServer, redis: RedisService) {
    this.io = io;
    this.redis = redis;
  }

  /**
   * Start listening to blockchain events for a network
   */
  async start(network: string): Promise<void> {
    const config = NETWORK_CONFIGS[network];
    if (!config) {
      throw new Error(`Unknown network: ${network}`);
    }

    if (!config.factoryAddress) {
      logger.warn(`No factory address configured for ${network}, skipping`);
      return;
    }

    try {
      // Create WebSocket provider
      const wsUrl = config.wsUrl || config.rpcUrl;
      const provider = new WebSocketProvider(wsUrl, config.chainId);

      provider.on('error', (error) => {
        logger.error(`WebSocket error for ${network}:`, error);
        this.handleDisconnection(network);
      });

      provider.on('close', () => {
        logger.warn(`WebSocket closed for ${network}, attempting reconnect...`);
        this.handleDisconnection(network);
      });

      this.providers.set(network, provider);

      // Create factory contract instance
      const factory = new ethers.Contract(
        config.factoryAddress,
        TokenFactoryABI.abi,
        provider
      );

      this.factories.set(network, factory);

      // Setup factory event listeners
      this.setupFactoryListeners(network, factory);

      // Load existing AMMs from factory
      await this.loadExistingAMMs(network, factory);

      logger.info(`Blockchain listener started for ${config.name} (${network})`);
    } catch (error) {
      logger.error(`Failed to start blockchain listener for ${network}:`, error);
      throw error;
    }
  }

  /**
   * Setup listeners for TokenFactory events
   */
  private setupFactoryListeners(network: string, factory: ethers.Contract): void {
    // Listen for new token creations
    factory.on('TokenCreated', async (token, amm, creator, name, symbol, totalSupply, timestamp, event) => {
      logger.info(`New token created on ${network}: ${name} (${symbol})`);

      const tokenData = {
        network,
        tokenAddress: token,
        ammAddress: amm,
        creator,
        name,
        symbol,
        totalSupply: totalSupply.toString(),
        timestamp: Number(timestamp),
        txHash: event.log.transactionHash,
        blockNumber: event.log.blockNumber,
      };

      // Cache in Redis
      await this.redis.setJSON(`token:${network}:${token}`, tokenData, 3600);

      // Broadcast to all connected clients
      this.io.emit('token:created', tokenData);

      // Broadcast to network-specific room
      this.io.to(`network:${network}`).emit('token:created', tokenData);

      // Setup AMM listeners for this new token
      await this.setupAMMListeners(network, amm);
    });

    // Listen for token graduations at factory level
    factory.on('TokenGraduated', async (token, finalSupply, liquidityAdded, event) => {
      logger.info(`Token graduated on ${network}: ${token}`);

      const graduationData = {
        network,
        tokenAddress: token,
        finalSupply: finalSupply.toString(),
        liquidityAdded: liquidityAdded.toString(),
        txHash: event.log.transactionHash,
        blockNumber: event.log.blockNumber,
        timestamp: Date.now(),
      };

      // Cache in Redis
      await this.redis.setJSON(`graduation:${network}:${token}`, graduationData, 86400);

      // Broadcast to all clients
      this.io.emit('token:graduated', graduationData);

      // Broadcast to token-specific room
      this.io.to(`token:${token}`).emit('token:graduated', graduationData);
    });
  }

  /**
   * Setup listeners for BondingCurveAMM events
   */
  private async setupAMMListeners(network: string, ammAddress: string): Promise<void> {
    try {
      const provider = this.providers.get(network);
      if (!provider) return;

      const amm = new ethers.Contract(ammAddress, BondingCurveAMMABI.abi, provider);
      this.amms.set(`${network}:${ammAddress}`, amm);

      // Get token address for this AMM
      const tokenAddress = await amm.token();

      // Listen for trades
      amm.on(
        'Trade',
        async (trader, isBuy, nativeAmount, tokenAmount, newPrice, fee, timestamp, event) => {
          const tradeData = {
            network,
            tokenAddress,
            ammAddress,
            trader,
            type: isBuy ? 'buy' : 'sell',
            nativeAmount: nativeAmount.toString(),
            tokenAmount: tokenAmount.toString(),
            price: newPrice.toString(),
            fee: fee.toString(),
            timestamp: Number(timestamp),
            txHash: event.log.transactionHash,
            blockNumber: event.log.blockNumber,
          };

          logger.debug(`Trade on ${network} for token ${tokenAddress}: ${tradeData.type}`);

          // Cache recent trade
          const cacheKey = `trade:${network}:${tokenAddress}:latest`;
          await this.redis.setJSON(cacheKey, tradeData, 60);

          // Broadcast to all clients
          this.io.emit('trade:new', tradeData);

          // Broadcast to token-specific room
          this.io.to(`token:${tokenAddress}`).emit('trade:new', tradeData);

          // Update price cache
          await this.updatePriceCache(network, tokenAddress, newPrice.toString());
        }
      );

      // Listen for graduations
      amm.on('Graduated', async (finalSupply, nativeReserve, timestamp, event) => {
        const graduationData = {
          network,
          tokenAddress,
          ammAddress,
          finalSupply: finalSupply.toString(),
          nativeReserve: nativeReserve.toString(),
          timestamp: Number(timestamp),
          txHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber,
        };

        logger.info(`Token ${tokenAddress} graduated on ${network}`);

        // Cache graduation data
        await this.redis.setJSON(`graduation:${network}:${tokenAddress}`, graduationData, 86400);

        // Broadcast to all clients
        this.io.emit('token:graduated', graduationData);

        // Broadcast to token-specific room
        this.io.to(`token:${tokenAddress}`).emit('token:graduated', graduationData);
      });

      // Listen for LP liquidity events
      amm.on(
        'LiquidityAdded',
        async (tokenAmount, nativeAmount, liquidity, lpTokenAddress, dexPair, event) => {
          const liquidityData = {
            network,
            tokenAddress,
            ammAddress,
            tokenAmount: tokenAmount.toString(),
            nativeAmount: nativeAmount.toString(),
            liquidity: liquidity.toString(),
            lpTokenAddress,
            dexPair,
            txHash: event.log.transactionHash,
            blockNumber: event.log.blockNumber,
            timestamp: Date.now(),
          };

          logger.info(`Liquidity added for token ${tokenAddress} on ${network}`);

          // Broadcast to all clients
          this.io.emit('liquidity:added', liquidityData);

          // Broadcast to token-specific room
          this.io.to(`token:${tokenAddress}`).emit('liquidity:added', liquidityData);
        }
      );

      logger.debug(`AMM listeners setup for ${ammAddress} on ${network}`);
    } catch (error) {
      logger.error(`Failed to setup AMM listeners for ${ammAddress} on ${network}:`, error);
    }
  }

  /**
   * Load existing AMMs from factory and setup listeners
   */
  private async loadExistingAMMs(network: string, factory: ethers.Contract): Promise<void> {
    try {
      let tokens: string[] | null = null;
      let totalTokens = 0;

      try {
        const tokenCount = await factory.getTotalTokens();
        totalTokens = Number(tokenCount);
      } catch (error) {
        tokens = await factory.getAllTokens();
        totalTokens = tokens.length;
      }

      logger.info(`Loading ${totalTokens} existing tokens for ${network}...`);

      if (tokens) {
        for (const tokenAddress of tokens) {
          try {
            const ammAddress = await factory.tokenToAMM(tokenAddress);
            await this.setupAMMListeners(network, ammAddress);
          } catch (error) {
            logger.error(`Failed to setup listeners for token ${tokenAddress}:`, error);
          }
        }
        logger.info(`Finished loading existing tokens for ${network}`);
        return;
      }

      // Get all tokens (in batches to avoid RPC limits)
      const batchSize = 100;
      for (let i = 0; i < totalTokens; i += batchSize) {
        const end = Math.min(i + batchSize, totalTokens);
        const promises = [];

        for (let j = i; j < end; j++) {
          promises.push(factory.allTokens(j));
        }

        const tokenBatch = await Promise.all(promises);

        // Setup listeners for each token's AMM
        for (const tokenAddress of tokenBatch) {
          try {
            const ammAddress = await factory.tokenToAMM(tokenAddress);
            await this.setupAMMListeners(network, ammAddress);
          } catch (error) {
            logger.error(`Failed to setup listeners for token ${tokenAddress}:`, error);
          }
        }

        logger.debug(`Loaded batch ${i}-${end} for ${network}`);
      }

      logger.info(`Finished loading existing tokens for ${network}`);
    } catch (error) {
      logger.error(`Failed to load existing AMMs for ${network}:`, error);
    }
  }

  /**
   * Update price cache for a token
   */
  private async updatePriceCache(
    network: string,
    tokenAddress: string,
    price: string
  ): Promise<void> {
    const cacheKey = `price:${network}:${tokenAddress}`;
    await this.redis.setJSON(
      cacheKey,
      {
        price,
        timestamp: Date.now(),
      },
      30
    ); // 30 second cache
  }

  /**
   * Handle provider disconnection and attempt reconnect
   */
  private handleDisconnection(network: string): void {
    // Clear existing provider
    const provider = this.providers.get(network);
    if (provider) {
      provider.removeAllListeners();
      this.providers.delete(network);
    }

    // Clear existing timers
    const existingTimer = this.reconnectTimers.get(network);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Attempt reconnect after delay
    const reconnectDelay = 5000; // 5 seconds
    const timer = setTimeout(async () => {
      logger.info(`Attempting to reconnect to ${network}...`);
      try {
        await this.start(network);
        logger.info(`Reconnected to ${network}`);
      } catch (error) {
        logger.error(`Reconnection failed for ${network}:`, error);
        // Will try again on next disconnection
      }
    }, reconnectDelay);

    this.reconnectTimers.set(network, timer);
  }

  /**
   * Stop all blockchain listeners
   */
  async stop(): Promise<void> {
    logger.info('Stopping all blockchain listeners...');

    // Clear all reconnect timers
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();

    // Remove all event listeners and close providers
    for (const [network, provider] of this.providers) {
      try {
        provider.removeAllListeners();
        await provider.destroy();
        logger.info(`Stopped blockchain listener for ${network}`);
      } catch (error) {
        logger.error(`Error stopping listener for ${network}:`, error);
      }
    }

    this.providers.clear();
    this.factories.clear();
    this.amms.clear();

    logger.info('All blockchain listeners stopped');
  }

  /**
   * Get current provider status
   */
  getStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};

    for (const [network, provider] of this.providers) {
      status[network] = provider.ready;
    }

    return status;
  }
}
