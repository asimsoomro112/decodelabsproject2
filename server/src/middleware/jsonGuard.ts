import type { NextFunction, Request, Response } from 'express';
import { sendProblem } from '../errors/problems.ts';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH']);

/**
 * The Gatekeeper checks the envelope before the letter:
 * write requests must declare Content-Type: application/json -> else 415.
 * (Body SIZE is enforced by express.json({ limit }) -> 413 in the error handler.)
 */
export function jsonGuard(req: Request, res: Response, next: NextFunction): void {
  if (!WRITE_METHODS.has(req.method)) {
    next();
    return;
  }
  const contentType = (req.headers['content-type'] ?? '').toLowerCase();
  if (!contentType.includes('application/json')) {
    sendProblem(res, req, {
      status: 415,
      type: '/problems/unsupported-media-type',
      title: 'Unsupported Media Type',
      detail: `Content-Type must be application/json for ${req.method} requests.`,
    });
    return;
  }
  next();
}
