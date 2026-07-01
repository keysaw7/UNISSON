import { describe, expect, it } from 'vitest';
import { AiGateway, SchemaValidationError, type CapabilityDefinition, type ValidationResult } from './ai-gateway';
import { InMemoryCache } from '../adapters/in-memory-cache';
import { InMemoryTelemetryAdapter } from '../adapters/in-memory-telemetry.adapter';
import type { LLMPort } from '../ports/llm.port';

function echoDef(seed: string, maxRepairAttempts = 1): CapabilityDefinition<string> {
  return {
    name: 'echo',
    promptVersion: 'v1',
    cacheKeySeed: seed,
    buildPrompt: () => `prompt:${seed}`,
    buildRepairPrompt: (previous, errors) => `repair:${previous}:${errors}`,
    parse: (raw): ValidationResult<string> =>
      raw.startsWith('valid:') ? { success: true, data: raw.slice('valid:'.length) } : { success: false, errors: 'format invalide' },
    maxRepairAttempts,
  };
}

describe('AiGateway', () => {
  it('bascule sur le modèle de secours si le modèle primaire échoue', async () => {
    const primary: LLMPort = {
      complete: async () => {
        throw new Error('primary down');
      },
    };
    const fallback: LLMPort = { complete: async () => ({ text: 'valid:from-fallback' }) };
    const telemetry = new InMemoryTelemetryAdapter();
    const gateway = new AiGateway(primary, new InMemoryCache(), telemetry, fallback);

    const result = await gateway.execute(echoDef('seed-1'));
    expect(result).toBe('from-fallback');
    expect(telemetry.events.at(-1)?.model).toBe('fallback');
  });

  it('propage l’erreur si primaire ET secours échouent', async () => {
    const failing: LLMPort = {
      complete: async () => {
        throw new Error('down');
      },
    };
    const gateway = new AiGateway(failing, new InMemoryCache(), new InMemoryTelemetryAdapter(), failing);
    await expect(gateway.execute(echoDef('seed-2'))).rejects.toThrow('down');
  });

  it('échoue avec SchemaValidationError une fois les tentatives de réparation épuisées', async () => {
    const alwaysInvalid: LLMPort = { complete: async () => ({ text: 'nope' }) };
    let calls = 0;
    const gateway = new AiGateway(
      { complete: async (r) => { calls += 1; return alwaysInvalid.complete(r); } },
      new InMemoryCache(),
      new InMemoryTelemetryAdapter(),
    );
    await expect(gateway.execute(echoDef('seed-3', 2))).rejects.toBeInstanceOf(SchemaValidationError);
    expect(calls).toBe(3); // 1 essai initial + 2 réparations
  });

  it('isole le cache par graine d’entrée', async () => {
    let calls = 0;
    const llm: LLMPort = {
      complete: async () => {
        calls += 1;
        return { text: `valid:call-${calls}` };
      },
    };
    const gateway = new AiGateway(llm, new InMemoryCache(), new InMemoryTelemetryAdapter());

    const a1 = await gateway.execute(echoDef('a'));
    const b1 = await gateway.execute(echoDef('b'));
    const a2 = await gateway.execute(echoDef('a'));

    expect(a1).not.toBe(b1);
    expect(a2).toBe(a1); // servi depuis le cache
    expect(calls).toBe(2);
  });
});
