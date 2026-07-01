import { describe, expect, it } from 'vitest';
import { OpenAiLlmAdapter } from './openai-llm.adapter';

/**
 * Test d'intégration réel contre l'API OpenAI. Sauté si `OPENAI_API_KEY` n'est pas défini → la
 * CI reste verte sans clé. Pour l'exécuter : `OPENAI_API_KEY=... npm test -w @unisson/ai-orchestration`.
 */
const hasKey = Boolean(process.env.OPENAI_API_KEY);

describe.skipIf(!hasKey)('OpenAiLlmAdapter (intégration réelle)', () => {
  it('obtient une réponse JSON exploitable du modèle', async () => {
    const adapter = new OpenAiLlmAdapter({
      apiKey: process.env.OPENAI_API_KEY!,
      model: process.env.OPENAI_MODEL,
    });

    const res = await adapter.complete({
      capability: 'parse_goal',
      prompt:
        'Réponds uniquement avec {"ok": true} en JSON strict, sans aucun autre texte, pour valider la connexion.',
    });

    expect(() => JSON.parse(res.text)).not.toThrow();
  });
});
