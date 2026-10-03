import { createApp } from './app.ts';
import { config } from './config.ts';
import { logger } from './logger.ts';
import { seed } from './domain/seed.ts';

seed();

const app = createApp();
const server = app.listen(config.port, () => {
  logger.info(
    { port: config.port, env: config.nodeEnv, version: config.version },
    `NeuroAPI listening — docs at /reference, health at /api/v1/health`,
  );
});

// Graceful shutdown: stop accepting, drain in-flight requests, then exit.
function shutdown(signal: string): void {
  logger.info({ signal }, 'shutdown requested — draining');
  server.close(() => {
    logger.info('drained, exiting');
    process.exit(0);
  });
  setTimeout(() => {
    logger.warn('drain timeout — forcing exit');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandled rejection');
});
