import { z } from 'zod';
import { sendProblem, type FieldError } from '../errors/problems.ts';
import type { NextFunction, Request, Response } from 'express';

// Zod's own codes are stable and descriptive; only the unknown-keys code is renamed.
const CODE_MAP: Record<string, string> = { unrecognized_keys: 'unknown_field' };

export function toFieldErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => {
    let field = issue.path.join('.');
    if (!field) {
      if (issue.code === 'unrecognized_keys') {
        const keys = (issue as unknown as { keys?: string[] }).keys ?? [];
        field = keys.join(', ') || '(body)';
      } else {
        field = '(body)';
      }
    }
    return {
      field,
      code: CODE_MAP[issue.code] ?? issue.code,
      message: issue.message,
    };
  });
}

/** Layer 1 — syntactic: strict schemas, ALL field errors at once, never just the first. */
export function validateBody(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      sendProblem(res, req, {
        status: 400,
        type: '/problems/validation-error',
        title: 'Bad Request',
        detail: 'The request failed syntactic validation. Fix every field listed in errors[] and retry.',
        errors: toFieldErrors(result.error),
      });
      return;
    }
    req.body = result.data; // downstream sees trimmed + normalized data
    next();
  };
}

export function validateParams(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      sendProblem(res, req, {
        status: 400,
        type: '/problems/validation-error',
        title: 'Bad Request',
        detail: 'Invalid path parameters.',
        errors: toFieldErrors(result.error),
      });
      return;
    }
    req.parsedParams = result.data;
    next();
  };
}

export function validateQuery(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      sendProblem(res, req, {
        status: 400,
        type: '/problems/validation-error',
        title: 'Bad Request',
        detail: 'Invalid query parameters.',
        errors: toFieldErrors(result.error),
      });
      return;
    }
    req.parsedQuery = result.data;
    next();
  };
}
