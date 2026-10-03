import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { buildTestContext, futureDate, pastDate, type TestContext } from './helpers.ts';

describe('courses', () => {
  let ctx: TestContext;
  beforeEach(() => {
    ctx = buildTestContext();
  });

  it('GET /api/v1/courses -> 200 with data + meta', async () => {
    const res = await request(ctx.app).get('/api/v1/courses');
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 6);
    assert.equal(res.body.data.length, 6);
    assert.equal(res.body.meta.page, 1);
  });

  it('filters by level', async () => {
    const res = await request(ctx.app).get('/api/v1/courses?level=beginner');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data.every((c: { level: string }) => c.level === 'beginner'));
  });

  it('searches with q across title and description', async () => {
    const res = await request(ctx.app).get('/api/v1/courses?q=typescript');
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 1);
    assert.match(res.body.data[0].title, /TypeScript/i);
  });

  it('paginates with page + limit', async () => {
    const res = await request(ctx.app).get('/api/v1/courses?page=2&limit=2');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 2);
    assert.deepEqual(res.body.meta, { total: 6, page: 2, limit: 2 });
  });

  it('rejects limit over 50 with 400', async () => {
    const res = await request(ctx.app).get('/api/v1/courses?limit=51');
    assert.equal(res.status, 400);
    assert.equal(res.body.type, '/problems/validation-error');
  });

  it('GET /api/v1/courses/:id -> 200', async () => {
    const list = await request(ctx.app).get('/api/v1/courses?limit=1');
    const id = list.body.data[0].id as string;
    const res = await request(ctx.app).get(`/api/v1/courses/${id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.id, id);
  });

  it('rejects a malformed uuid with 400', async () => {
    const res = await request(ctx.app).get('/api/v1/courses/not-a-uuid');
    assert.equal(res.status, 400);
    assert.equal(res.body.errors[0].field, 'id');
  });

  it('returns 404 problem+json for an unknown id', async () => {
    const res = await request(ctx.app).get('/api/v1/courses/00000000-0000-4000-8000-000000000000');
    assert.equal(res.status, 404);
    assert.match(res.headers['content-type'], /application\/problem\+json/);
    assert.equal(res.body.type, '/problems/not-found');
    assert.ok(res.body.requestId);
  });

  it('POST creates a course -> 201 + Location + no-store', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/courses')
      .set('X-API-Key', ctx.writeKey)
      .send({ title: 'GraphQL in Practice', level: 'intermediate', seats: 40, startDate: futureDate(40) });
    assert.equal(res.status, 201);
    assert.ok(res.body.id);
    assert.equal(res.headers['location'], `/api/v1/courses/${res.body.id}`);
    assert.equal(res.headers['cache-control'], 'no-store');
  });

  it('POST without an API key -> 401 + WWW-Authenticate', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/courses')
      .send({ title: 'No Key Course', level: 'beginner', seats: 10, startDate: futureDate() });
    assert.equal(res.status, 401);
    assert.ok(res.headers['www-authenticate']);
    assert.equal(res.body.type, '/problems/unauthorized');
  });

  it('POST with an invalid API key -> 401', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/courses')
      .set('X-API-Key', 'wrong')
      .send({ title: 'Bad Key Course', level: 'beginner', seats: 10, startDate: futureDate() });
    assert.equal(res.status, 401);
  });

  it('POST with the read-only key -> 403 (authN ok, authZ denied)', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/courses')
      .set('X-API-Key', ctx.readKey)
      .send({ title: 'Read Key Course', level: 'beginner', seats: 10, startDate: futureDate() });
    assert.equal(res.status, 403);
    assert.equal(res.body.type, '/problems/forbidden');
  });

  it('POST duplicate title + startDate -> 409', async () => {
    const payload = { title: 'Unique Title Here', level: 'beginner', seats: 10, startDate: futureDate(50) };
    const first = await request(ctx.app).post('/api/v1/courses').set('X-API-Key', ctx.writeKey).send(payload);
    assert.equal(first.status, 201);
    const second = await request(ctx.app).post('/api/v1/courses').set('X-API-Key', ctx.writeKey).send(payload);
    assert.equal(second.status, 409);
    assert.equal(second.body.type, '/problems/duplicate-resource');
  });

  it('POST with a past startDate -> 422 semantic error', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/courses')
      .set('X-API-Key', ctx.writeKey)
      .send({ title: 'History Class', level: 'beginner', seats: 10, startDate: pastDate() });
    assert.equal(res.status, 422);
    assert.equal(res.body.type, '/problems/semantic-error');
    assert.equal(res.body.errors[0].field, 'startDate');
  });

  it('POST reports ALL field errors at once, and rejects unknown fields', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/courses')
      .set('X-API-Key', ctx.writeKey)
      .send({ title: 'x', level: 'expert', seats: 0, startDate: 'yesterday', hacker: true });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.length >= 4, `expected >=4 errors, got ${res.body.errors.length}`);
    const fields = res.body.errors.map((e: { field: string }) => e.field);
    assert.ok(fields.includes('title'));
    assert.ok(fields.includes('level'));
    assert.ok(fields.includes('seats'));
    assert.ok(fields.some((f: string) => f.includes('hacker')));
  });
});
