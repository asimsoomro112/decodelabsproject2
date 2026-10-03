import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { buildTestContext, type TestContext } from './helpers.ts';

describe('demo status codes + problem pages', () => {
  let ctx: TestContext;
  beforeEach(() => {
    ctx = buildTestContext();
  });

  it('demo 200 -> real 200', async () => {
    const res = await request(ctx.app).get('/api/v1/demo/status/200');
    assert.equal(res.status, 200);
  });

  it('demo 201 -> real 201 with Location', async () => {
    const res = await request(ctx.app).get('/api/v1/demo/status/201');
    assert.equal(res.status, 201);
    assert.ok(res.headers['location']);
  });

  it('demo 204 -> real 204 with no body', async () => {
    const res = await request(ctx.app).get('/api/v1/demo/status/204');
    assert.equal(res.status, 204);
    assert.equal(res.text, '');
  });

  it('demo 400/401/403/404 -> real problems', async () => {
    for (const code of [400, 401, 403, 404]) {
      const res = await request(ctx.app).get(`/api/v1/demo/status/${code}`);
      assert.equal(res.status, code);
      assert.equal(res.body.status, code);
      assert.match(res.headers['content-type'], /application\/problem\+json/);
    }
  });

  it('demo 401 carries WWW-Authenticate', async () => {
    const res = await request(ctx.app).get('/api/v1/demo/status/401');
    assert.ok(res.headers['www-authenticate']);
  });

  it('demo 429 -> real 429 with Retry-After', async () => {
    const res = await request(ctx.app).get('/api/v1/demo/status/429');
    assert.equal(res.status, 429);
    assert.ok(res.headers['retry-after']);
  });

  it('demo 500 travels through the real error handler (generic, no stack)', async () => {
    const res = await request(ctx.app).get('/api/v1/demo/status/500');
    assert.equal(res.status, 500);
    assert.equal(res.body.type, '/problems/internal-error');
    assert.ok(res.body.requestId);
    assert.ok(!JSON.stringify(res.body).includes('intentional failure'), 'stack/detail leaked');
  });

  it('demo rejects an unsupported code with 400', async () => {
    const res = await request(ctx.app).get('/api/v1/demo/status/418');
    assert.equal(res.status, 400);
  });

  it('GET /problems/validation-error -> human page', async () => {
    const res = await request(ctx.app).get('/problems/validation-error');
    assert.equal(res.status, 400);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.match(res.text, /Validation Error/);
  });

  it('GET /openapi.json -> OpenAPI 3.1 generated from Zod schemas', async () => {
    const res = await request(ctx.app).get('/openapi.json');
    assert.equal(res.status, 200);
    assert.equal(res.body.openapi, '3.1.0');
    assert.ok(res.body.paths['/courses'].post);
    assert.ok(res.body.components.schemas.CourseCreate.properties.title.minLength === 3);
    assert.equal(res.body.components.schemas.CourseCreate.additionalProperties, false);
  });

  it('GET /health -> 200 with the contract shape', async () => {
    const res = await request(ctx.app).get('/api/v1/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok(typeof res.body.uptimeSeconds === 'number');
    assert.equal(res.body.version, '1.0.0');
    assert.ok(res.body.timestamp);
    const alias = await request(ctx.app).get('/health');
    assert.equal(alias.status, 200);
  });
});
