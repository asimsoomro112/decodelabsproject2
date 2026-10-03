import type { NextFunction, Request, Response } from 'express';
import { logger } from '../logger.ts';
import { sendProblem } from '../errors/problems.ts';

/**
 * Final safety net. Maps parser failures to their real problems and turns
 * EVERYTHING else into a generic 500: the detail never leaks internals,
 * the full error goes to the JSON logs with the request id.
 */
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  const requestId = req.id ?? 'unknown';
  const bodyParserError = err as { type?: string; status?: number };

  if (bodyParserError?.type === 'entity.too.large') {
    sendProblem(res, req, {
      status: 413,
      type: '/problems/payload-too-large',
      title: 'Payload Too Large',
      detail: 'The request body exceeds the 10kb limit.',
    });
    return;
  }

  if (
    bodyParserError?.type === 'entity.parse.failed' ||
    (err instanceof SyntaxError && 'body' in (err as unknown as Record<string, unknown>))
  ) {
    sendProblem(res, req, {
      status: 400,
      type: '/problems/validation-error',
      title: 'Bad Request',
      detail: 'The request body is not valid JSON.',
      errors: [{ field: '(body)', code: 'malformed_json', message: 'Malformed JSON in request body.' }],
    });
    return;
  }

  logger.error({ err, requestId }, 'unhandled error');
  sendProblem(res, req, {
    status: 500,
    type: '/problems/internal-error',
    title: 'Internal Server Error',
    detail: 'An unexpected error occurred. It has been logged — quote the requestId when reporting it.',
  });
}
