import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction } from 'express';

const WINDOW_MS = 60_000;
const MAX_LLM_REQUESTS = 30;

/** Fenêtre glissante par IP pour les routes déclenchant des appels LLM (P3). */
const llmHits = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
}

function isLlmRoute(path: string, method: string): boolean {
  if (method !== 'POST') return false;
  return path === '/goals' || /\/format$/.test(path);
}

export function applySecurityMiddleware(app: NestExpressApplication): void {
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!isLlmRoute(req.path, req.method)) return next();
    const ip = clientIp(req);
    const now = Date.now();
    const entry = llmHits.get(ip);
    if (!entry || entry.resetAt < now) {
      llmHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
      return next();
    }
    if (entry.count >= MAX_LLM_REQUESTS) {
      res.status(429).json({ message: 'Trop de requêtes — réessayez dans une minute.' });
      return;
    }
    entry.count += 1;
    next();
  });
}
