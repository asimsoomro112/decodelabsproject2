import { z } from 'zod';
import type { Request, Response } from 'express';
import { config } from '../config.ts';
import { CourseCreateSchema, CourseSchema } from '../schemas/course.ts';
import { LearnerCreateSchema, LearnerSchema } from '../schemas/learner.ts';

/**
 * OpenAPI 3.1 document. The component schemas are GENERATED from the Zod
 * schemas via z.toJSONSchema() — the docs cannot drift from the validation.
 * Paths are hand-written once; everything shaped like data comes from Zod.
 */
function component(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

const ProblemSchema = {
  type: 'object',
  required: ['type', 'title', 'status', 'detail', 'instance', 'requestId'],
  properties: {
    type: { type: 'string', example: '/problems/validation-error' },
    title: { type: 'string', example: 'Bad Request' },
    status: { type: 'integer', example: 400 },
    detail: { type: 'string' },
    instance: { type: 'string', example: '/api/v1/courses' },
    requestId: { type: 'string', format: 'uuid' },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        required: ['field', 'code', 'message'],
        properties: {
          field: { type: 'string', example: 'seats' },
          code: { type: 'string', example: 'too_small' },
          message: { type: 'string' },
        },
      },
    },
  },
};

const problemRef = (description: string) => ({
  description,
  content: { 'application/problem+json': { schema: ProblemSchema } },
});

const idParam = {
  name: 'id', in: 'path', required: true,
  schema: { type: 'string', format: 'uuid' },
  description: 'Resource id (uuid).',
};

const pageParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
];

export function buildOpenApiDocument(): Record<string, unknown> {
  return {
    openapi: '3.1.0',
    info: {
      title: 'NeuroAPI',
      version: config.version,
      description:
        'CourseHub series, part 1 — a portfolio-grade REST API built for DecodeLabs Industrial Training Kit (Batch 2026, Project 2: Backend API Development). Resources are nouns, methods are verbs, every error is RFC 9457 problem+json.',
      contact: { name: 'Asim — DecodeLabs Industrial Training Kit, Batch 2026' },
    },
    servers: [{ url: '/api/v1', description: 'This server (versioned base path)' }],
    tags: [
      { name: 'health', description: 'Liveness' },
      { name: 'courses', description: 'Course resources' },
      { name: 'learners', description: 'Learner resources' },
      { name: 'demo', description: 'Status-code playground for the Status Lab' },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['health'], summary: 'Service health',
          responses: {
            '200': {
              description: 'The service is alive.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['status', 'uptimeSeconds', 'version', 'timestamp'],
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      uptimeSeconds: { type: 'integer', example: 42 },
                      version: { type: 'string', example: '1.0.0' },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/courses': {
        get: {
          tags: ['courses'], summary: 'List courses',
          description: 'Filter by level, search title/description with q, paginate with page/limit (max 50).',
          parameters: [
            ...pageParams,
            { name: 'level', in: 'query', schema: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] } },
            { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Case-insensitive search.' },
          ],
          responses: {
            '200': {
              description: 'A page of courses.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['data', 'meta'],
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Course' } },
                      meta: {
                        type: 'object',
                        required: ['total', 'page', 'limit'],
                        properties: {
                          total: { type: 'integer' }, page: { type: 'integer' }, limit: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': problemRef('Invalid query parameters.'),
            '429': problemRef('Rate limited.'),
          },
        },
        post: {
          tags: ['courses'], summary: 'Create a course',
          description: 'Requires the write API key. startDate must not be in the past (422); title + startDate must be unique (409).',
          security: [{ apiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CourseCreate' } } },
          },
          responses: {
            '201': {
              description: 'Created. Location header points at the new resource; never cached.',
              headers: { Location: { schema: { type: 'string' }, description: 'URL of the created course.' } },
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Course' } } },
            },
            '400': problemRef('Syntactic validation failed.'),
            '401': problemRef('Missing or invalid X-API-Key.'),
            '403': problemRef('Read-only key used for a write.'),
            '409': problemRef('Duplicate title + startDate.'),
            '413': problemRef('Body over 10kb.'),
            '415': problemRef('Content-Type was not application/json.'),
            '422': problemRef('startDate is in the past.'),
            '429': problemRef('Rate limited.'),
          },
        },
      },
      '/courses/{id}': {
        get: {
          tags: ['courses'], summary: 'Get a course by id',
          parameters: [idParam],
          responses: {
            '200': {
              description: 'The course.',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Course' } } },
            },
            '400': problemRef('The id is not a valid uuid.'),
            '404': problemRef('No course with this id.'),
            '429': problemRef('Rate limited.'),
          },
        },
      },
      '/learners': {
        get: {
          tags: ['learners'], summary: 'List learners',
          parameters: [...pageParams, { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search name/email.' }],
          responses: {
            '200': {
              description: 'A page of learners.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['data', 'meta'],
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Learner' } },
                      meta: {
                        type: 'object',
                        required: ['total', 'page', 'limit'],
                        properties: {
                          total: { type: 'integer' }, page: { type: 'integer' }, limit: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': problemRef('Invalid query parameters.'),
            '429': problemRef('Rate limited.'),
          },
        },
        post: {
          tags: ['learners'], summary: 'Create a learner',
          description: 'Requires the write API key. Email must be unique (409, stored lowercase). Supports Idempotency-Key (10-min TTL).',
          security: [{ apiKeyAuth: [] }],
          parameters: [
            { name: 'Idempotency-Key', in: 'header', schema: { type: 'string' }, description: 'BONUS: safe retries. Same key + same body replays the original 201.' },
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LearnerCreate' } } },
          },
          responses: {
            '201': {
              description: 'Created.',
              headers: { Location: { schema: { type: 'string' } } },
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Learner' } } },
            },
            '400': problemRef('Syntactic validation failed.'),
            '401': problemRef('Missing or invalid X-API-Key.'),
            '403': problemRef('Read-only key used for a write.'),
            '409': problemRef('Duplicate email.'),
            '413': problemRef('Body over 10kb.'),
            '415': problemRef('Content-Type was not application/json.'),
            '422': problemRef('Idempotency-Key reused with a different body.'),
            '429': problemRef('Rate limited.'),
          },
        },
      },
      '/learners/{id}': {
        get: {
          tags: ['learners'], summary: 'Get a learner by id',
          parameters: [idParam],
          responses: {
            '200': {
              description: 'The learner.',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Learner' } } },
            },
            '400': problemRef('The id is not a valid uuid.'),
            '404': problemRef('No learner with this id.'),
            '429': problemRef('Rate limited.'),
          },
        },
      },
      '/demo/status/{code}': {
        get: {
          tags: ['demo'], summary: 'Return a real status code',
          description: 'Powers the Status Lab. 204 has no body; 500 travels through the real error handler.',
          parameters: [
            { name: 'code', in: 'path', required: true, schema: { type: 'integer', enum: [200, 201, 204, 400, 401, 403, 404, 429, 500] } },
          ],
          responses: {
            '200': { description: 'Demo 200.' },
            '201': { description: 'Demo 201.' },
            '204': { description: 'Demo 204 (no body).' },
            '400': problemRef('Demo 400.'),
            '401': problemRef('Demo 401.'),
            '403': problemRef('Demo 403.'),
            '404': problemRef('Demo 404.'),
            '429': problemRef('Demo 429.'),
            '500': problemRef('Demo 500 via the real error handler.'),
          },
        },
      },
    },
    components: {
      schemas: {
        Course: component(CourseSchema),
        CourseCreate: component(CourseCreateSchema),
        Learner: component(LearnerSchema),
        LearnerCreate: component(LearnerCreateSchema),
        Problem: ProblemSchema,
      },
      securitySchemes: {
        apiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key', description: 'Demo key. Write operations need the write key.' },
      },
    },
  };
}

export function openApiJsonHandler(_req: Request, res: Response): void {
  res.status(200).json(buildOpenApiDocument());
}
