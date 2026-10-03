import type { Request, Response } from 'express';
import { config } from '../config.ts';

export function healthHandler(_req: Request, res: Response): void {
  res.status(200).json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    version: config.version,
    timestamp: new Date().toISOString(),
  });
}
