import { pinoHttp } from 'pino-http';
import type { Request } from 'express';
import { logger } from '../logger.ts';

/** JSON access logs with the request id attached to every line. */
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => (req as unknown as Request).id ?? 'unknown',
  customProps: (req) => ({ requestId: (req as unknown as Request).id }),
});
