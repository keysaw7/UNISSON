import type { CapabilityCallTelemetry, TelemetryPort } from '../ports/telemetry.port';

export interface ErrorReporterPort {
  captureException(error: unknown, context?: Record<string, unknown>): void;
}

/** Reporter no-op — brancher Sentry/Datadog via composition root si `SENTRY_DSN` est défini. */
export class NoopErrorReporter implements ErrorReporterPort {
  captureException(_error: unknown, _context?: Record<string, unknown>): void {
    // noop
  }
}

/** Télémétrie structurée JSON (§10.6, P2) + hook optionnel vers un tracker d'erreurs applicatif. */
export class StructuredJsonTelemetryAdapter implements TelemetryPort {
  constructor(private readonly errorReporter: ErrorReporterPort = new NoopErrorReporter()) {}

  record(event: CapabilityCallTelemetry): void {
    const payload = {
      ts: new Date().toISOString(),
      component: 'ai-gateway',
      ...event,
    };
    console.info(JSON.stringify(payload));
    if (!event.success) {
      this.errorReporter.captureException(new Error(`AI Gateway failure: ${event.capability}`), payload);
    }
  }
}
