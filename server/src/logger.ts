import pino from 'pino';
import { config } from './config.ts';

// JSON logs everywhere; silent under `npm test` so tap output stays clean.
export const logger = pino({
  level: config.nodeEnv === 'test' ? 'silent' : config.logLevel,
});
