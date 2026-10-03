import type { Express } from 'express';
import { createApp } from '../src/app.ts';
import { resetStores } from '../src/domain/store.ts';
import { seed } from '../src/domain/seed.ts';
import { config } from '../src/config.ts';

export interface TestContext {
  app: Express;
  writeKey: string;
  readKey: string;
}

/** Fresh seeded app per test. NODE_ENV=test is set by the npm script (silent logs). */
export function buildTestContext(): TestContext {
  resetStores();
  seed();
  return { app: createApp(), writeKey: config.demoWriteKey, readKey: config.demoReadKey };
}

/** A YYYY-MM-DD safely in the future, relative to whenever the suite runs. */
export function futureDate(daysAhead = 30): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

export function pastDate(daysAgo = 30): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}
