import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { apiReference } from '@scalar/express-api-reference';
import { config } from './config.ts';
import { logger } from './logger.ts';
import { requestId } from './middleware/requestId.ts';
import { httpLogger } from './middleware/httpLogger.ts';
import { jsonGuard } from './middleware/jsonGuard.ts';
import { notFound } from './middleware/notFound.ts';
import { methodNotAllowed } from './middleware/methodNotAllowed.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { globalLimiter } from './middleware/rateLimit.ts';
import { healthHandler } from './routes/health.ts';
import { coursesRouter } from './routes/courses.ts';
import { learnersRouter } from './routes/learners.ts';
import { demoRouter } from './routes/demo.ts';
import { problemsRouter } from './routes/problems.ts';
import { openApiJsonHandler } from './openapi/document.ts';
import { seed } from './domain/seed.ts';

export function createApp(): express.Express {
  const app = express();

  // Render sits behind one proxy hop: this makes req.ip (and rate limiting) correct.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          // Scalar's interactive reference loads its bundle from its CDN.
          'script-src': ["'self'", 'https://cdn.jsdelivr.net'],
          'style-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com'],
          'img-src': ["'self'", 'data:', 'https:'],
        },
      },
    }),
  );

  // Strict CORS: origins not on the allowlist simply get no CORS headers.
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-API-Key', 'X-Request-Id', 'Idempotency-Key'],
      exposedHeaders: ['X-Request-Id', 'Location', 'Retry-After', 'RateLimit', 'RateLimit-Policy', 'Idempotent-Replayed'],
      maxAge: 600,
    }),
  );

  app.use(requestId);
  app.use(httpLogger);

  // Docs + human pages (outside /api/v1 on purpose).
  app.get('/openapi.json', openApiJsonHandler);
  app.use('/reference', apiReference({ spec: { url: '/openapi.json' }, theme: 'kepler' }));
  app.use('/problems', problemsRouter);
  app.get('/health', healthHandler); // platform alias; canonical is /api/v1/health

  // The API itself.
  const v1 = express.Router();
  v1.use(methodNotAllowed); // 405 before the Gatekeeper sees the body
  v1.use(jsonGuard, express.json({ limit: config.bodyLimit }), globalLimiter);
  v1.get('/health', healthHandler);
  v1.use('/courses', coursesRouter);
  v1.use('/learners', learnersRouter);
  v1.use('/demo', demoRouter);
  app.use('/api/v1', v1);

  // Known path + wrong method -> 405 + Allow. Unknown /api/* -> 404 problem.
  app.use(methodNotAllowed);
  app.use('/api', notFound);

  // Production: serve the built client as one service, with an SPA fallback
  // for browser navigations (API 404s stay problem+json).
  const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir, { maxAge: '1h', index: false }));
    app.get(/^\/(?!api\/).*/, (req, res, next) => {
      if (!req.accepts('html')) {
        next();
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    logger.warn('client/dist not found — serving API only (run `npm run build` for the full service)');
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

// Vercel serverless handler. Vercel's Express runtime serves the default export of the
// module that calls express() — this one. Built lazily on the first request (cold start)
// so importing createApp in tests/index.ts has no side effects.
let serverlessApp: express.Express | undefined;
export default function vercelHandler(req: express.Request, res: express.Response): void {
  if (!serverlessApp) {
    seed(); // in-memory demo data, mirrors src/index.ts
    serverlessApp = createApp();
  }
  serverlessApp(req, res);
}
