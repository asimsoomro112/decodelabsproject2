import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { buildTestContext, type TestContext } from './helpers.ts';

describe('learners', () => {
  let ctx: TestContext;
  beforeEach(() => {
    ctx = buildTestContext();
  });

  it('GET /api/v1/learners -> 200 with 8 seeded learners', async () => {
    const res = await request(ctx.app).get('/api/v1/learners');
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 8);
  });

  it('searches learners with q', async () => {
    const res = await request(ctx.app).get('/api/v1/learners?q=areeba');
    assert.equal(res.status, 200);
    assert.equal(res.body.meta.total, 1);
  });

  it('GET /api/v1/learners/:id -> 200', async () => {
    const list = await request(ctx.app).get('/api/v1/learners?limit=1');
    const id = list.body.data[0].id as string;
    const res = await request(ctx.app).get(`/api/v1/learners/${id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.id, id);
  });

  it('POST creates a learner -> 201, email stored lowercase', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/learners')
      .set('X-API-Key', ctx.writeKey)
      .send({ name: '  Zara Iqbal  ', email: 'ZARA.IQBAL@Example.COM' });
    assert.equal(res.status, 201);
    assert.equal(res.body.email, 'zara.iqbal@example.com');
    assert.equal(res.body.name, 'Zara Iqbal');
  });

  it('POST duplicate email -> 409', async () => {
    const payload = { name: 'Copy Cat', email: 'copy.cat@example.com' };
    const first = await request(ctx.app).post('/api/v1/learners').set('X-API-Key', ctx.writeKey).send(payload);
    assert.equal(first.status, 201);
    const second = await request(ctx.app).post('/api/v1/learners').set('X-API-Key', ctx.writeKey).send(payload);
    assert.equal(second.status, 409);
    assert.equal(second.body.errors[0].field, 'email');
  });

  it('POST invalid email -> 400', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/learners')
      .set('X-API-Key', ctx.writeKey)
      .send({ name: 'Bad Email', email: 'not-an-email' });
    assert.equal(res.status, 400);
    assert.equal(res.body.errors[0].field, 'email');
  });

  it('POST name too short -> 400', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/learners')
      .set('X-API-Key', ctx.writeKey)
      .send({ name: 'A', email: 'a@example.com' });
    assert.equal(res.status, 400);
  });

  it('BONUS: same Idempotency-Key + same body replays the original 201', async () => {
    const key = `idem-${Date.now()}`;
    const payload = { name: 'Idem Potent', email: `idem.${Date.now()}@example.com` };
    const first = await request(ctx.app)
      .post('/api/v1/learners').set('X-API-Key', ctx.writeKey).set('Idempotency-Key', key).send(payload);
    const second = await request(ctx.app)
      .post('/api/v1/learners').set('X-API-Key', ctx.writeKey).set('Idempotency-Key', key).send(payload);
    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    assert.equal(second.body.id, first.body.id);
    assert.equal(second.headers['idempotent-replayed'], 'true');
  });

  it('BONUS: same Idempotency-Key + different body -> 422', async () => {
    const key = `idem-conflict-${Date.now()}`;
    const first = await request(ctx.app)
      .post('/api/v1/learners').set('X-API-Key', ctx.writeKey).set('Idempotency-Key', key)
      .send({ name: 'First Body', email: `first.${Date.now()}@example.com` });
    assert.equal(first.status, 201);
    const second = await request(ctx.app)
      .post('/api/v1/learners').set('X-API-Key', ctx.writeKey).set('Idempotency-Key', key)
      .send({ name: 'Second Body', email: `second.${Date.now()}@example.com` });
    assert.equal(second.status, 422);
    assert.equal(second.body.type, '/problems/idempotency-conflict');
  });
});
