import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { buildTestContext, futureDate, type TestContext } from './helpers.ts';

describe('validation (Gatekeeper)', () => {
  let ctx: TestContext;
  beforeEach(() => {
    ctx = buildTestContext();
  });

  it('malformed JSON -> 400 with a field-level error', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/courses')
      .set('X-API-Key', ctx.writeKey)
      .set('Content-Type', 'application/json')
      .send('{"title": broken');
    assert.equal(res.status, 400);
    assert.equal(res.body.type, '/problems/validation-error');
    assert.equal(res.body.errors[0].code, 'malformed_json');
  });

  it('non-JSON content type on POST -> 415', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/courses')
      .set('X-API-Key', ctx.writeKey)
      .set('Content-Type', 'text/plain')
      .send('hello');
    assert.equal(res.status, 415);
    assert.equal(res.body.type, '/problems/unsupported-media-type');
  });

  it('body over 10kb -> 413', async () => {
    const big = 'x'.repeat(11 * 1024);
    const res = await request(ctx.app)
      .post('/api/v1/courses')
      .set('X-API-Key', ctx.writeKey)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ title: 'Big', level: 'beginner', seats: 1, startDate: futureDate(), padding: big }));
    assert.equal(res.status, 413);
    assert.equal(res.body.type, '/problems/payload-too-large');
  });

  it('wrong type (seats as string) -> 400 invalid_type', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/courses')
      .set('X-API-Key', ctx.writeKey)
      .send({ title: 'Typed Wrong', level: 'beginner', seats: 'many', startDate: futureDate() });
    assert.equal(res.status, 400);
    assert.equal(res.body.errors[0].field, 'seats');
    assert.equal(res.body.errors[0].code, 'invalid_type');
  });

  it('missing required fields -> 400 listing each one', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/learners')
      .set('X-API-Key', ctx.writeKey)
      .send({});
    assert.equal(res.status, 400);
    const fields = res.body.errors.map((e: { field: string }) => e.field).sort();
    assert.deepEqual(fields, ['email', 'name']);
  });
});
