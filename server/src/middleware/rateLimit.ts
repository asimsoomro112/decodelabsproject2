import { rateLimit } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { sendProblem } from '../errors/problems.ts';

interface RateLimitInfo {
  rateLimit?: { resetTime?: Date };
}

function tooManyHandler(req: Request, res: Response): void {
  const resetTime = (req as unknown as RateLimitInfo).rateLimit?.resetTime;
  const retryAfter = resetTime
    ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
    : 60;
  sendProblem(res, req, {
    status: 429,
    type: '/problems/rate-limited',
    title: 'Too Many Requests',
    detail: 'Rate limit exceeded. Retry after the delay indicated by Retry-After.',
    headers: { 'Retry-After': String(retryAfter) },
  });
  // Note: express-rate-limit's draft-8 standardHeaders already set
  // RateLimit and RateLimit-Policy before this handler runs.
}

const base = {
  windowMs: 60_000,
  standardHeaders: 'draft-8' as const,
  legacyHeaders: false,
  handler: tooManyHandler,
  // Default keyGenerator (per-IP, IPv6-safe) is used deliberately:
  // a custom one built on req.ip trips ERR_ERL_KEY_GEN_IPV6.
};

/** 120 requests/min per IP across the whole API. */
export const globalLimiter = rateLimit({ ...base, limit: 120 });

/** 20 writes/min per IP on POST routes. */
export const writeLimiter = rateLimit({ ...base, limit: 20 });
