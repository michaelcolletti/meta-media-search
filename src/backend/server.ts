import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import config from './config/index.js';
import logger from './utils/logger.js';
import db from './db/client.js';
import cacheService from './services/cache.service.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

class Server {
  private app: Express;
  private isShuttingDown = false;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandlers();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(
      helmet({
        contentSecurityPolicy: config.NODE_ENV === 'production',
        crossOriginEmbedderPolicy: config.NODE_ENV === 'production',
      })
    );

    // CORS
    this.app.use(
      cors({
        origin: config.ALLOWED_ORIGINS,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      })
    );

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    if (config.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(
        morgan('combined', {
          stream: {
            write: (message: string) => logger.info(message.trim()),
          },
        })
      );
    }

    // Request logging
    this.app.use((req, res, next) => {
      logger.debug(
        {
          method: req.method,
          url: req.url,
          ip: req.ip,
        },
        'Incoming request'
      );
      next();
    });
  }

  private setupRoutes(): void {
    // API routes
    this.app.use(`/api/${config.API_VERSION}`, routes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Meta-Media-Search API',
        version: config.API_VERSION,
        status: 'running',
        documentation: `/api/${config.API_VERSION}/docs`,
      });
    });
  }

  private setupErrorHandlers(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await db.connect();
      logger.info('Database connection established');
    } catch (error) {
      logger.error({ err: error }, 'Failed to connect to database');
      throw error;
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        logger.warn('Shutdown already in progress');
        return;
      }

      this.isShuttingDown = true;
      logger.info(`${signal} received, starting graceful shutdown`);

      // Stop accepting new connections
      this.server?.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close database connection
          await db.disconnect();
          logger.info('Database connection closed');

          // Close Redis connection
          await cacheService.disconnect();
          logger.info('Redis connection closed');

          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error({ err: error }, 'Error during shutdown');
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error(
        {
          err: reason,
          promise,
        },
        'Unhandled promise rejection'
      );
    });

    process.on('uncaughtException', error => {
      logger.error({ err: error }, 'Uncaught exception');
      shutdown('UNCAUGHT_EXCEPTION');
    });
  }

  private server?: ReturnType<Express['listen']>;

  async start(): Promise<void> {
    try {
      // Initialize database
      await this.initializeDatabase();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      // Start server
      this.server = this.app.listen(config.PORT, () => {
        logger.info(
          {
            port: config.PORT,
            env: config.NODE_ENV,
            version: config.API_VERSION,
          },
          'Server started successfully'
        );

        logger.info(
          `🚀 API available at http://localhost:${config.PORT}/api/${config.API_VERSION}`
        );
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to start server');
      process.exit(1);
    }
  }

  getApp(): Express {
    return this.app;
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new Server();
  server.start();
}

export default Server;
