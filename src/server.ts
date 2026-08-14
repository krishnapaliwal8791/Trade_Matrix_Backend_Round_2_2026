import { app } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { disconnectPrisma } from './lib/prisma';

const server = app.listen(env.PORT);

server.on('listening', () => {
  logger.info(`Server is running in ${env.NODE_ENV} mode on port ${env.PORT}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  logger.fatal({ err: error }, `Failed to start server on port ${env.PORT}`);
  process.exit(1);
});

let isShuttingDown = false;

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info(`${signal} received. Shutting down gracefully...`);
  
  server.close(async () => {
    logger.info('HTTP server closed.');
    await disconnectPrisma();
    logger.info('Graceful shutdown completed.');
    process.exit(0);
  });

  // Force shutdown after 10s if graceful shutdown fails
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'UNCAUGHT EXCEPTION! Shutting down...');
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (err) => {
  logger.fatal({ err }, 'UNHANDLED REJECTION! Shutting down...');
  gracefulShutdown('unhandledRejection');
});
