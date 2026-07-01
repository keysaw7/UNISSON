import { describe, it, expect } from 'vitest';
import { ParseGoalCapability, SchemaValidationError } from './parse-goal.capability';
import type { LLMPort } from '../ports/llm.port';

const llmReturning = (text: string): LLMPort => ({
  complete: async () => ({ text }),
});

describe('ParseGoalCapability', () => {
  it('valide et mappe une sortie IA conforme', async () => {
    const capability = new ParseGoalCapability(
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

  it('rejette une sortie non-JSON', async () => {
    const capability = new ParseGoalCapability(llmReturning('pas du json'));
    await expect(capability.run('x')).rejects.toBeInstanceOf(SchemaValidationError);
  });

  it('rejette une sortie au schéma invalide (confidence hors bornes)', async () => {
    const capability = new ParseGoalCapability(
      llmReturning(JSON.stringify({ domain: 'x', confidence: 5 })),
    );
    await expect(capability.run('x')).rejects.toBeInstanceOf(SchemaValidationError);
  });
});
