import { createHash } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { sendProblem } from '../errors/problems.ts';

/**
 * BONUS — Idempotency-Key on POST /learners (in-memory, 10-minute TTL).
 * Same key + same body  -> the original 201 is replayed (with Idempotent-Replayed: true).
 * Same key + other body -> 422 idempotency-conflict (a client bug, not a retry).
 */
const TTL_MS = 10 * 60 * 1000;

interface Entry {
  status: number;
  body: unknown;
  headers: Record<string, string>;
  bodyHash: string;
  expiresAt: number;
}

const store = new Map<string, Entry>();

function hashBody(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body ?? null)).digest('hex');
}

function sweep(now: number): void {
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
}

export function idempotency(req: Request, res: Response, next: NextFunction): void {
  const key = req.header('idempotency-key');
  if (!key) {
    next();
    return;
  }

  sweep(Date.now());
  const bodyHash = hashBody(req.body);
  const existing = store.get(key);

  if (existing) {
    if (existing.bodyHash !== bodyHash) {
      sendProblem(res, req, {
        status: 422,
        type: '/problems/idempotency-conflict',
        title: 'Idempotency Conflict',
        detail: 'This Idempotency-Key was already used with a different request body.',
      });
      return;
    }
    res.setHeader('Idempotent-Replayed', 'true');
    for (const [name, value] of Object.entries(existing.headers)) res.setHeader(name, value);
    res.status(existing.status).json(existing.body);
    return;
  }

  // Capture successful responses so a retry can replay them.
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const headers: Record<string, string> = {};
      const location = res.getHeader('Location');
      if (typeof location === 'string') headers['Location'] = location;
      store.set(key, {
        status: res.statusCode,
        body,
        headers,
        bodyHash,
        expiresAt: Date.now() + TTL_MS,
      });
    }
    return originalJson(body);
  }) as typeof res.json;

  next();
}
