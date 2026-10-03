import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/** Every response carries X-Request-Id; every log line and problem body echoes it. */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
