import { describe, expect, it } from 'vitest';
import { AnthropicLlmAdapter } from './anthropic-llm.adapter';

/**
 * Test d'intégration réel contre l'API Anthropic. Sauté si `ANTHROPIC_API_KEY` n'est pas défini →
 * la CI reste verte sans clé. Pour l'exécuter : `ANTHROPIC_API_KEY=... npm test -w @unisson/ai-orchestration`.
 */
const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);

describe.skipIf(!hasKey)('AnthropicLlmAdapter (intégration réelle)', () => {
  it('obtient une réponse JSON exploitable du modèle', async () => {
    const adapter = new AnthropicLlmAdapter({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: process.env.ANTHROPIC_MODEL,
    });

    const res = await adapter.complete({
      capability: 'parse_goal',
      prompt:
        'Réponds uniquement avec {"ok": true} en JSON strict, sans aucun autre texte, pour valider la connexion.',
    });

    expect(() => JSON.parse(res.text)).not.toThrow();
  });
});
