import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { BlockchainListener } from './services/BlockchainListener';
import { RedisService } from './services/RedisService';
import { RateLimiterService } from './services/RateLimiterService';
import { SocketEventHandlers } from './handlers/SocketEventHandlers';

dotenv.config({ path: '../.env.local' });
dotenv.config({ path: '../.env' });

const app = express();
const httpServer = createServer(app);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001',
];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});

// Initialize services
const redisService = new RedisService();
const rateLimiter = new RateLimiterService();
const blockchainListener = new BlockchainListener(io, redisService);
const socketHandlers = new SocketEventHandlers(io, redisService, rateLimiter);

// Connection handling with rate limiting
io.use(async (socket, next) => {
  const clientIp = socket.handshake.address;

  try {
    await rateLimiter.checkConnectionLimit(clientIp);
    next();
  } catch (error) {
    logger.warn(`Rate limit exceeded for ${clientIp}`);
    next(new Error('Too many connections'));
  }
});

// Socket connection handler
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id} from ${socket.handshake.address}`);

  // Register event handlers
  socketHandlers.registerHandlers(socket);

  socket.on('disconnect', (reason) => {
    logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
    socketHandlers.handleDisconnect(socket);
  });
});

// Start blockchain listeners
async function startBlockchainListeners() {
  try {
    const networks = process.env.ENABLED_NETWORKS?.split(',') || ['bscTestnet'];

    for (const network of networks) {
      await blockchainListener.start(network);
      logger.info(`Started blockchain listener for ${network}`);
    }
  } catch (error) {
    logger.error('Failed to start blockchain listeners:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');

  // Stop blockchain listeners
  await blockchainListener.stop();

  // Close Redis connections
  await redisService.disconnect();

  // Close HTTP server
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await blockchainListener.stop();
  await redisService.disconnect();
  httpServer.close(() => {
    process.exit(0);
  });
});

// Start server
const PORT = process.env.WS_PORT || 4000;

httpServer.listen(PORT, async () => {
  logger.info(`WebSocket server running on port ${PORT}`);
  logger.info(`Allowed origins: ${allowedOrigins.join(', ')}`);

  // Start blockchain listeners
  await startBlockchainListeners();

  logger.info('All services initialized successfully');
});

export { io, httpServer };
