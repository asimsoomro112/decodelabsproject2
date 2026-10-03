import type { Request, Response } from 'express';
import { sendProblem } from '../errors/problems.ts';

/** Unknown route -> 404 problem+json. */
export function notFound(req: Request, res: Response): void {
  sendProblem(res, req, {
    status: 404,
    type: '/problems/not-found',
    title: 'Not Found',
    detail: `No resource exists for ${req.method} ${req.originalUrl}.`,
  });
}
