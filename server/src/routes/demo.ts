import { Router, type Request, type Response } from 'express';
import { sendProblem } from '../errors/problems.ts';

/**
 * Status Lab backend: GET /api/v1/demo/status/:code returns that REAL status.
 * 204 carries no body; 500 is thrown so it travels through the real error handler.
 */
const ALLOWED = new Set(['200', '201', '204', '400', '401', '403', '404', '429', '500']);

export const demoRouter = Router();

demoRouter.get('/status/:code', (req: Request, res: Response): void => {
  const rawCode = req.params.code;
  const code = typeof rawCode === 'string' ? rawCode : '';

  if (!ALLOWED.has(code)) {
    sendProblem(res, req, {
      status: 400,
      type: '/problems/validation-error',
      title: 'Bad Request',
      detail: `Unsupported demo code "${code}". Use one of: ${[...ALLOWED].join(', ')}.`,
      errors: [{ field: 'code', code: 'invalid_value', message: 'Unsupported demo status code.' }],
    });
    return;
  }

  switch (Number(code)) {
    case 200:
      res.status(200).json({ status: 200, message: 'OK — the request succeeded.' });
      return;
    case 201:
      res.setHeader('Location', '/api/v1/demo/status/201');
      res.status(201).json({ status: 201, message: 'Created — the demo resource now (not really) exists.' });
      return;
    case 204:
      res.status(204).end();
      return;
    case 400:
      sendProblem(res, req, {
        status: 400, type: '/problems/validation-error', title: 'Bad Request',
        detail: 'Demo 400: the server could not understand the request.',
      });
      return;
    case 401:
      sendProblem(res, req, {
        status: 401, type: '/problems/unauthorized', title: 'Unauthorized',
        detail: 'Demo 401: who are you? No valid credentials were presented.',
        headers: { 'WWW-Authenticate': 'ApiKey realm="neuroapi"' },
      });
      return;
    case 403:
      sendProblem(res, req, {
        status: 403, type: '/problems/forbidden', title: 'Forbidden',
        detail: 'Demo 403: authentication would succeed — authorization does not. You may not.',
      });
      return;
    case 404:
      sendProblem(res, req, {
        status: 404, type: '/problems/not-found', title: 'Not Found',
        detail: 'Demo 404: nothing here but us demos.',
      });
      return;
    case 429:
      sendProblem(res, req, {
        status: 429, type: '/problems/rate-limited', title: 'Too Many Requests',
        detail: 'Demo 429: the demo bouncer says slow down.',
        headers: { 'Retry-After': '60' },
      });
      return;
    case 500:
      throw new Error('demo: intentional failure travelling through the real error handler');
    default:
      sendProblem(res, req, {
        status: 500, type: '/problems/internal-error', title: 'Internal Server Error',
        detail: 'Unreachable demo branch.',
      });
  }
});
