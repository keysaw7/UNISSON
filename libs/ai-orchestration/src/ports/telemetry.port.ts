/**
 * Télémétrie du Gateway (§10.6) : chaque appel logue capacité, latence, validité au premier essai,
 * cache hit/miss → routage et amélioration pilotés par les données, pas par intuition.
 */
export interface CapabilityCallTelemetry {
  capability: string;
  promptVersion: string;
  model?: string;
  latencyMs: number;
  attempts: number;
  validOnFirstTry: boolean;
  cacheHit: boolean;
  success: boolean;
  errorMessage?: string;
}

export interface TelemetryPort {
  record(event: CapabilityCallTelemetry): void | Promise<void>;
}

export const TELEMETRY_PORT = Symbol('TelemetryPort');
