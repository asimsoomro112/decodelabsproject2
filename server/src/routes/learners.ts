import { Router, type Request, type Response } from 'express';
import { learnerStore } from '../domain/store.ts';
import { LearnerCreateSchema, type LearnerCreateInput } from '../schemas/learner.ts';
import { LearnerQuerySchema, UuidParamSchema, type LearnerQuery } from '../schemas/common.ts';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.ts';
import { requireWriteKey } from '../middleware/auth.ts';
import { writeLimiter } from '../middleware/rateLimit.ts';
import { idempotency } from '../domain/idempotency.ts';
import { sendProblem } from '../errors/problems.ts';

export const learnersRouter = Router();

// GET /api/v1/learners?q=&page=&limit=
learnersRouter.get('/', validateQuery(LearnerQuerySchema), (req: Request, res: Response): void => {
  const query = req.parsedQuery as LearnerQuery;
  let items = learnerStore.list();

  if (query.q) {
    const needle = query.q.toLowerCase();
    items = items.filter(
      (l) => l.name.toLowerCase().includes(needle) || l.email.toLowerCase().includes(needle),
    );
  }

  const total = items.length;
  const data = items.slice((query.page - 1) * query.limit, query.page * query.limit);
  res.status(200).json({ data, meta: { total, page: query.page, limit: query.limit } });
});

// GET /api/v1/learners/:id
learnersRouter.get('/:id', validateParams(UuidParamSchema), (req: Request, res: Response): void => {
  const { id } = req.parsedParams as { id: string };
  const learner = learnerStore.getById(id);
  if (!learner) {
    sendProblem(res, req, {
      status: 404,
      type: '/problems/not-found',
      title: 'Not Found',
      detail: `No learner exists with id "${id}".`,
    });
    return;
  }
  res.status(200).json(learner);
});

// POST /api/v1/learners  (BONUS: Idempotency-Key supported)
learnersRouter.post(
  '/',
  writeLimiter,
  requireWriteKey,
  validateBody(LearnerCreateSchema),
  idempotency,
  (req: Request, res: Response): void => {
    const input = req.body as LearnerCreateInput;

    // Layer 2 — semantic: email uniqueness (already normalized to lowercase by the schema).
    const duplicate = learnerStore.find((l) => l.email === input.email)[0];
    if (duplicate) {
      sendProblem(res, req, {
        status: 409,
        type: '/problems/duplicate-resource',
        title: 'Conflict',
        detail: `A learner with email "${input.email}" already exists.`,
        errors: [{ field: 'email', code: 'duplicate', message: 'This email is already registered.' }],
      });
      return;
    }

    const created = learnerStore.create(input);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Location', `/api/v1/learners/${created.id}`);
    res.status(201).json(created);
  },
);
