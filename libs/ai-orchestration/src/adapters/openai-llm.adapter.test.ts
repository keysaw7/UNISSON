import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenAiLlmAdapter } from './openai-llm.adapter';

describe('OpenAiLlmAdapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('appelle l’API Chat Completions et retourne le contenu du message', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      expect(body.model).toBe('gpt-test');
      expect(body.response_format).toEqual({ type: 'json_object' });
      expect(body.messages[1].content).toBe('dis bonjour');
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }),
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new OpenAiLlmAdapter({ apiKey: 'sk-test', model: 'gpt-test' });
    const res = await adapter.complete({ capability: 'parse_goal', prompt: 'dis bonjour' });

    expect(res.text).toBe('{"ok":true}');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('retire les balises markdown éventuelles autour du JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '```json\n{"a":1}\n```' } }] }),
      })) as unknown as typeof fetch,
    );

    const adapter = new OpenAiLlmAdapter({ apiKey: 'sk-test' });
    const res = await adapter.complete({ capability: 'generate_content', prompt: 'x' });
    expect(res.text).toBe('{"a":1}');
  });

  it('lève une erreur explicite si l’API répond en échec', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 401,
        text: async () => 'unauthorized',
      })) as unknown as typeof fetch,
    );

    const adapter = new OpenAiLlmAdapter({ apiKey: 'bad-key' });
    await expect(adapter.complete({ capability: 'parse_goal', prompt: 'x' })).rejects.toThrow(/401/);
  });
});
