import type { CapabilityCallTelemetry, TelemetryPort } from '../ports/telemetry.port';

/** Télémétrie minimale (§10.6) : logs structurés. Un vrai backend (Datadog, ClickHouse…) implémentera le même port. */
export class ConsoleTelemetryAdapter implements TelemetryPort {
  record(event: CapabilityCallTelemetry): void {
    console.info('[ai-gateway]', JSON.stringify(event));
  }
}
