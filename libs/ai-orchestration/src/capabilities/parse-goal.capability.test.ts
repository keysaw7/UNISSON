import { describe, it, expect } from 'vitest';
import { ParseGoalCapability } from './parse-goal.capability';
import { AiGateway, SchemaValidationError } from '../gateway/ai-gateway';
import { InMemoryCache } from '../adapters/in-memory-cache';
import { InMemoryTelemetryAdapter } from '../adapters/in-memory-telemetry.adapter';
import type { LLMPort } from '../ports/llm.port';

const llmReturning = (text: string): LLMPort => ({
  complete: async () => ({ text }),
});

function capabilityWith(llm: LLMPort): { capability: ParseGoalCapability; telemetry: InMemoryTelemetryAdapter } {
  const telemetry = new InMemoryTelemetryAdapter();
  const gateway = new AiGateway(llm, new InMemoryCache(), telemetry);
  return { capability: new ParseGoalCapability(gateway), telemetry };
}

describe('ParseGoalCapability', () => {
  it('valide et mappe une sortie IA conforme', async () => {
    const { capability } = capabilityWith(
      llmReturning(
        JSON.stringify({
          domain: 'japanese',
          targetSkills: ['hiragana'],
          targetLevel: 'N5',
          confidence: 0.9,
        }),
      ),
    );

    const draft = await capability.run('apprendre le japonais');
    expect(draft.domain).toBe('japanese');
    expect(draft.constraints).toEqual({}); // défaut appliqué par le schéma
    expect(draft.clarificationsNeeded).toEqual([]);
  });

  it('rejette une sortie non-JSON après épuisement de la boucle de réparation', async () => {
    const { capability } = capabilityWith(llmReturning('pas du json'));
    await expect(capability.run('x')).rejects.toBeInstanceOf(SchemaValidationError);
  });

  it('rejette une sortie au schéma invalide (confidence hors bornes)', async () => {
    const { capability } = capabilityWith(llmReturning(JSON.stringify({ domain: 'x', confidence: 5 })));
    await expect(capability.run('x')).rejects.toBeInstanceOf(SchemaValidationError);
  });

  it('sert une réponse en cache sans rappeler le modèle', async () => {
    let calls = 0;
    const llm: LLMPort = {
      complete: async () => {
        calls += 1;
        return {
          text: JSON.stringify({ domain: 'japanese', targetSkills: [], targetLevel: 'N5', confidence: 0.8 }),
        };
      },
    };
    const { capability, telemetry } = capabilityWith(llm);

    await capability.run('apprendre le japonais');
    await capability.run('apprendre le japonais');

    expect(calls).toBe(1);
    expect(telemetry.events.at(-1)?.cacheHit).toBe(true);
  });

  it('répare une sortie invalide en ré-interrogeant le modèle', async () => {
    let calls = 0;
    const llm: LLMPort = {
      complete: async () => {
        calls += 1;
        if (calls === 1) return { text: 'pas du json' };
        return {
          text: JSON.stringify({ domain: 'japanese', targetSkills: [], targetLevel: 'N5', confidence: 0.8 }),
        };
      },
    };
    const { capability, telemetry } = capabilityWith(llm);

    const draft = await capability.run('apprendre le japonais');
    expect(draft.domain).toBe('japanese');
    expect(calls).toBe(2);
    expect(telemetry.events.at(-1)?.attempts).toBe(2);
  });
});
