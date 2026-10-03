import { Router, type Request, type Response } from 'express';
import { courseStore } from '../domain/store.ts';
import { CourseCreateSchema, type CourseCreateInput } from '../schemas/course.ts';
import { CourseQuerySchema, UuidParamSchema, type CourseQuery } from '../schemas/common.ts';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.ts';
import { requireWriteKey } from '../middleware/auth.ts';
import { writeLimiter } from '../middleware/rateLimit.ts';
import { sendProblem } from '../errors/problems.ts';
import type { Course } from '../domain/types.ts';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export const coursesRouter = Router();

// GET /api/v1/courses?level=&q=&page=&limit=
coursesRouter.get('/', validateQuery(CourseQuerySchema), (req: Request, res: Response): void => {
  const query = req.parsedQuery as CourseQuery;
  let items = courseStore.list();

  if (query.level) items = items.filter((c) => c.level === query.level);
  if (query.q) {
    const needle = query.q.toLowerCase();
    items = items.filter(
      (c) => c.title.toLowerCase().includes(needle) || (c.description ?? '').toLowerCase().includes(needle),
    );
  }

  const total = items.length;
  const data = items.slice((query.page - 1) * query.limit, query.page * query.limit);
  res.status(200).json({ data, meta: { total, page: query.page, limit: query.limit } });
});

// GET /api/v1/courses/:id
coursesRouter.get('/:id', validateParams(UuidParamSchema), (req: Request, res: Response): void => {
  const { id } = req.parsedParams as { id: string };
  const course = courseStore.getById(id);
  if (!course) {
    sendProblem(res, req, {
      status: 404,
      type: '/problems/not-found',
      title: 'Not Found',
      detail: `No course exists with id "${id}".`,
    });
    return;
  }
  res.status(200).json(course);
});

// POST /api/v1/courses
coursesRouter.post(
  '/',
  writeLimiter,
  requireWriteKey,
  validateBody(CourseCreateSchema),
  (req: Request, res: Response): void => {
    const input = req.body as CourseCreateInput;

    // Layer 2 — semantic: business rules, not syntax.
    if (input.startDate < todayIso()) {
      sendProblem(res, req, {
        status: 422,
        type: '/problems/semantic-error',
        title: 'Unprocessable Entity',
        detail: 'The request is well-formed but violates a business rule.',
        errors: [{ field: 'startDate', code: 'past_date', message: 'startDate must not be in the past.' }],
      });
      return;
    }
    const duplicate = courseStore.find(
      (c: Course) => c.title.toLowerCase() === input.title.toLowerCase() && c.startDate === input.startDate,
    )[0];
    if (duplicate) {
      sendProblem(res, req, {
        status: 409,
        type: '/problems/duplicate-resource',
        title: 'Conflict',
        detail: 'A course with the same title and start date already exists.',
        errors: [{ field: 'title', code: 'duplicate', message: 'This title + startDate combination is taken.' }],
      });
      return;
    }

    const created = courseStore.create(input);
    // POST responses are never cached.
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Location', `/api/v1/courses/${created.id}`);
    res.status(201).json(created);
  },
);
