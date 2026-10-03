import type { NextFunction, Request, Response } from 'express';
import { sendProblem } from '../errors/problems.ts';

interface KnownRoute {
  pattern: RegExp;
  methods: string[];
}

/** Known path + unsupported method -> 405 with an Allow header. */
const KNOWN_ROUTES: KnownRoute[] = [
  { pattern: /^\/health$/, methods: ['GET'] },
  { pattern: /^\/openapi\.json$/, methods: ['GET'] },
  { pattern: /^\/api\/v1\/health$/, methods: ['GET'] },
  { pattern: /^\/api\/v1\/courses$/, methods: ['GET', 'POST'] },
  { pattern: /^\/api\/v1\/courses\/[^/]+$/, methods: ['GET'] },
  { pattern: /^\/api\/v1\/learners$/, methods: ['GET', 'POST'] },
  { pattern: /^\/api\/v1\/learners\/[^/]+$/, methods: ['GET'] },
  { pattern: /^\/api\/v1\/demo\/status\/[^/]+$/, methods: ['GET'] },
];

export function methodNotAllowed(req: Request, res: Response, next: NextFunction): void {
  // Works mounted at app level or on a router: reconstruct the full path.
  const fullPath = `${req.baseUrl || ''}${req.path}`;
  const known = KNOWN_ROUTES.find((r) => r.pattern.test(fullPath));
  if (!known || known.methods.includes(req.method)) {
    next();
    return;
  }
  sendProblem(res, req, {
    status: 405,
    type: '/problems/method-not-allowed',
    title: 'Method Not Allowed',
    detail: `${req.method} is not supported for ${fullPath}.`,
    headers: { Allow: known.methods.join(', ') },
  });
}
