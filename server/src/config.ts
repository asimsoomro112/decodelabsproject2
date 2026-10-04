import dotenv from 'dotenv';

dotenv.config();

// Demo keys are public by design (shown in the Playground + README).
// Development falls back to these silently; production falls back with a warning
// (a serverless function that throws at boot would 500 every request).
const DEV_WRITE_KEY = 'neuro_write_demo_9f2k7q';
const DEV_READ_KEY = 'neuro_read_demo_3m8x1z';

const isProduction = process.env.NODE_ENV === 'production';

function required(name: string, fallback: string): string {
  const value = process.env[name];
  if (value) return value;
  console.warn(`[config] ${name} is not set in production — falling back to the public demo key.`);
  return fallback;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  version: '1.0.0',
  isProduction,
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  demoWriteKey: isProduction ? required('DEMO_WRITE_KEY', DEV_WRITE_KEY) : (process.env.DEMO_WRITE_KEY ?? DEV_WRITE_KEY),
  demoReadKey: isProduction ? required('DEMO_READ_KEY', DEV_READ_KEY) : (process.env.DEMO_READ_KEY ?? DEV_READ_KEY),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  bodyLimit: '10kb',
} as const;
