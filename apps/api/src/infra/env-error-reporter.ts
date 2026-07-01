import type { ErrorReporterPort } from '@unisson/ai-orchestration';

/**
 * Reporter d'erreurs activable via `SENTRY_DSN` (P2).
 * Implémentation légère sans SDK : log structuré prêt pour un collecteur externe.
 * Remplacer par `@sentry/node` en production si besoin.
 */
export class EnvErrorReporter implements ErrorReporterPort {
  captureException(error: unknown, context?: Record<string, unknown>): void {
    if (!process.env.SENTRY_DSN) return;
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        component: 'error-reporter',
        sentryDsnConfigured: true,
        message: error instanceof Error ? error.message : String(error),
        context,
      }),
    );
  }
}
