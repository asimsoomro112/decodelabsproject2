import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { buildTestContext, futureDate, type TestContext } from './helpers.ts';

describe('security + HTTP semantics', () => {
  let ctx: TestContext;
  beforeEach(() => {
    ctx = buildTestContext();
  });

  it('every response carries X-Request-Id (200 and 404)', async () => {
    const ok = await request(ctx.app).get('/api/v1/health');
    assert.ok(ok.headers['x-request-id'], 'missing on 200');
    const missing = await request(ctx.app).get('/api/v1/nope');
    assert.ok(missing.headers['x-request-id'], 'missing on 404');
    assert.equal(missing.body.requestId, missing.headers['x-request-id']);
  });

  it('all errors use application/problem+json', async () => {
    const res = await request(ctx.app).get('/api/v1/nope');
    assert.match(res.headers['content-type'], /application\/problem\+json/);
    for (const key of ['type', 'title', 'status', 'detail', 'instance', 'requestId']) {
      assert.ok(key in res.body, `problem body missing ${key}`);
    }
  });

  it('known path + wrong method -> 405 with Allow header', async () => {
    const res = await request(ctx.app).put('/api/v1/courses');
    assert.equal(res.status, 405);
    assert.equal(res.body.type, '/problems/method-not-allowed');
    assert.match(res.headers['allow'], /GET/);
    assert.match(res.headers['allow'], /POST/);
  });

  it('unknown route -> 404', async () => {
    const res = await request(ctx.app).delete('/api/v1/definitely-not-here');
    assert.equal(res.status, 404);
    assert.equal(res.body.type, '/problems/not-found');
  });

  // Runs last: it exhausts the 20/min POST budget for this file's IP.
  it('21st POST within a minute -> 429 with Retry-After + RateLimit headers', async () => {
    let lastStatus = 0;
    let last: request.Response | undefined;
    for (let i = 0; i < 21; i++) {
      last = await request(ctx.app)
        .post('/api/v1/courses')
        .set('X-API-Key', ctx.writeKey)
        .send({ title: `Rate Probe ${i}`, level: 'beginner', seats: 5, startDate: futureDate(60) });
      lastStatus = last.status;
      if (lastStatus === 429) break;
    }
    assert.equal(lastStatus, 429);
    assert.equal(last!.body.type, '/problems/rate-limited');
    assert.ok(last!.headers['retry-after'], 'missing Retry-After');
    assert.ok(last!.headers['ratelimit'], 'missing RateLimit header');
  });
});
