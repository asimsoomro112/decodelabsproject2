import type { Request, Response } from 'express';

/**
 * RFC 9457 problem+json contract. EVERY error the API returns — 400, 401, 403,
 * 404, 405, 409, 413, 415, 422, 429 and 500 — uses this shape, always with
 * `Content-Type: application/problem+json` and the request id.
 */
export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export interface ProblemBody {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  requestId: string;
  errors?: FieldError[];
}

export interface ProblemOptions {
  status: number;
  type: string;
  title: string;
  detail: string;
  errors?: FieldError[];
  headers?: Record<string, string>;
}

export function problem(req: Request, opts: ProblemOptions): ProblemBody {
  const body: ProblemBody = {
    type: opts.type,
    title: opts.title,
    status: opts.status,
    detail: opts.detail,
    instance: req.originalUrl || req.url,
    requestId: String(req.id ?? 'unknown'),
  };
  if (opts.errors) body.errors = opts.errors;
  return body;
}

export function sendProblem(res: Response, req: Request, opts: ProblemOptions): void {
  if (opts.headers) {
    for (const [name, value] of Object.entries(opts.headers)) res.setHeader(name, value);
  }
  res.status(opts.status).type('application/problem+json').send(problem(req, opts));
}

/** Human-readable catalog backing GET /problems/:slug. */
export interface ProblemPage {
  slug: string;
  title: string;
  status: number;
  meaning: string;
  when: string;
  fix: string;
}

export const PROBLEM_CATALOG: Record<string, ProblemPage> = {
  'validation-error': {
    slug: 'validation-error', title: 'Validation Error', status: 400,
    meaning: 'The request was syntactically wrong: malformed JSON, a wrong type, a missing field, or a field the API does not know.',
    when: 'Layer 1 of the Gatekeeper rule — Zod strict schemas reject the payload before any business logic runs.',
    fix: 'Read the errors[] array: every offending field is listed with a machine-readable code. Fix them all and retry.',
  },
  'semantic-error': {
    slug: 'semantic-error', title: 'Semantic Error', status: 422,
    meaning: 'The request was well-formed, but it breaks a business rule (e.g. a course starting in the past).',
    when: 'Layer 2 of the Gatekeeper rule — the shape was fine, the meaning was not.',
    fix: 'Adjust the values to satisfy the documented business rules, then retry.',
  },
  'duplicate-resource': {
    slug: 'duplicate-resource', title: 'Duplicate Resource', status: 409,
    meaning: 'A resource with the same identity already exists (same course title + start date, or same learner email).',
    when: 'The API refuses to create a second resource that would collide with an existing one.',
    fix: 'Fetch the existing resource instead, or change the identifying fields.',
  },
  unauthorized: {
    slug: 'unauthorized', title: 'Unauthorized', status: 401,
    meaning: 'Authentication failed: the X-API-Key header is missing or invalid. We do not know who you are.',
    when: 'Every write operation requires a demo API key.',
    fix: 'Send a valid X-API-Key header. The demo keys are printed in the Playground.',
  },
  forbidden: {
    slug: 'forbidden', title: 'Forbidden', status: 403,
    meaning: 'Authentication succeeded, but authorization failed: a read-only key tried to write. We know who you are — you may not do that.',
    when: 'The classic 401 vs 403 split: 401 = who are you?, 403 = you may not.',
    fix: 'Use the write key for POST requests, or stick to GET with the read key.',
  },
  'not-found': {
    slug: 'not-found', title: 'Not Found', status: 404,
    meaning: 'No resource exists at this path, or the id does not match anything.',
    when: 'Unknown routes and unknown ids.',
    fix: 'Check the path against /openapi.json and verify the id.',
  },
  'method-not-allowed': {
    slug: 'method-not-allowed', title: 'Method Not Allowed', status: 405,
    meaning: 'The path exists, but the HTTP method does not apply to it.',
    when: 'E.g. PUT /api/v1/courses — the response carries an Allow header listing what is permitted.',
    fix: 'Use one of the methods in the Allow header.',
  },
  'payload-too-large': {
    slug: 'payload-too-large', title: 'Payload Too Large', status: 413,
    meaning: 'The request body exceeded the 10kb limit.',
    when: 'The JSON parser rejects oversized bodies before they reach any handler.',
    fix: 'Shrink the payload — this API is not a file store.',
  },
  'unsupported-media-type': {
    slug: 'unsupported-media-type', title: 'Unsupported Media Type', status: 415,
    meaning: 'Write requests must speak JSON: Content-Type: application/json is required.',
    when: 'The Gatekeeper checks the envelope before the letter.',
    fix: 'Set Content-Type: application/json and send a JSON body.',
  },
  'rate-limited': {
    slug: 'rate-limited', title: 'Rate Limited', status: 429,
    meaning: 'Too many requests. The API enforces 20 writes/min per IP and 120 requests/min per IP globally.',
    when: 'The response carries Retry-After plus standard RateLimit headers.',
    fix: 'Back off until Retry-After seconds have passed, then retry.',
  },
  'internal-error': {
    slug: 'internal-error', title: 'Internal Server Error', status: 500,
    meaning: 'Something broke on our side. The detail is deliberately generic; the full error went to the logs.',
    when: 'The global error handler catches anything the routes did not.',
    fix: 'Retry once. If it persists, report the requestId so the incident can be traced in the logs.',
  },
  'idempotency-conflict': {
    slug: 'idempotency-conflict', title: 'Idempotency Conflict', status: 422,
    meaning: 'An Idempotency-Key was reused with a DIFFERENT request body — a client bug, not a retry.',
    when: 'BONUS feature on POST /learners: same key + same body replays the original 201 safely.',
    fix: 'Generate a fresh Idempotency-Key for every distinct request.',
  },
};
