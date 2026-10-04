import { createApp } from './dist/app.js';
import { seed } from './dist/domain/seed.js';

// Mirror src/index.ts: populate the in-memory store with demo data on cold start.
seed();

const app = createApp();
export default app;
