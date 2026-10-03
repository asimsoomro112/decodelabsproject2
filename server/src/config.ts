import dotenv from 'dotenv';

dotenv.config();

// Demo keys are public by design (shown in the Playground + README).
// Development falls back to these; production refuses to boot without real ones.
const DEV_WRITE_KEY = 'neuro_write_demo_9f2k7q';
const DEV_READ_KEY = 'neuro_read_demo_3m8x1z';

const isProduction = process.env.NODE_ENV === 'production';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[config] Missing required env var ${name} in production.`);
  return value;
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
  demoWriteKey: isProduction ? required('DEMO_WRITE_KEY') : (process.env.DEMO_WRITE_KEY ?? DEV_WRITE_KEY),
  demoReadKey: isProduction ? required('DEMO_READ_KEY') : (process.env.DEMO_READ_KEY ?? DEV_READ_KEY),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  bodyLimit: '10kb',
} as const;
