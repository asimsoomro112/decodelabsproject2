import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.ts';
import { sendProblem } from '../errors/problems.ts';

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * AuthN vs AuthZ demo (no full auth system by design):
 * - missing/invalid X-API-Key        -> 401 + WWW-Authenticate  (who are you?)
 * - valid READ-ONLY key on a POST    -> 403                     (you may not)
 * - valid WRITE key                  -> next()
 */
export function requireWriteKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.header('x-api-key') ?? '';
  const isWrite = safeEqual(key, config.demoWriteKey);
  const isRead = !isWrite && safeEqual(key, config.demoReadKey);

  if (!isWrite && !isRead) {
    sendProblem(res, req, {
      status: 401,
      type: '/problems/unauthorized',
      title: 'Unauthorized',
      detail: 'A valid X-API-Key header is required to create resources.',
      headers: { 'WWW-Authenticate': 'ApiKey realm="neuroapi"' },
    });
    return;
  }
  if (isRead) {
    sendProblem(res, req, {
      status: 403,
      type: '/problems/forbidden',
      title: 'Forbidden',
      detail: 'This API key is read-only. Creating resources requires the write key.',
    });
    return;
  }
  next();
}
