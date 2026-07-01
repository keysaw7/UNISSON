import type { CapabilityCallTelemetry, TelemetryPort } from '../ports/telemetry.port';

/** Télémétrie en mémoire — utile pour les tests et l'inspection locale. */
export class InMemoryTelemetryAdapter implements TelemetryPort {
  readonly events: CapabilityCallTelemetry[] = [];

  record(event: CapabilityCallTelemetry): void {
    this.events.push(event);
  }
}
