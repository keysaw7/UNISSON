import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenAiLlmAdapter } from './openai-llm.adapter';

describe('OpenAiLlmAdapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('appelle l’API Chat Completions et retourne le contenu du message', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      expect(body.model).toBe('gpt-4o-mini');
      expect(body.response_format).toEqual({ type: 'json_object' });
      expect(body.messages[1].content).toBe('dis bonjour');
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }),
      } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new OpenAiLlmAdapter({ apiKey: 'sk-test', model: 'gpt-4o-mini' });
    const res = await adapter.complete({ capability: 'parse_goal', prompt: 'dis bonjour' });

    expect(res.text).toBe('{"ok":true}');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('n’envoie ni reasoning_effort ni verbosity pour un modèle non-raisonnement', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      expect(body.reasoning_effort).toBeUndefined();
      expect(body.verbosity).toBeUndefined();
      expect(body.max_completion_tokens).toBeUndefined();
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{}' } }] }) } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    await new OpenAiLlmAdapter({ apiKey: 'sk-test', model: 'gpt-4o-mini' }).complete({
      capability: 'parse_goal',
      prompt: 'x',
    });
  });

  it('applique des défauts adaptés au raisonnement pour un modèle gpt-5*', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      expect(body.model).toBe('gpt-5-nano');
      expect(body.reasoning_effort).toBe('minimal');
      expect(body.verbosity).toBe('low');
      expect(body.max_completion_tokens).toBe(2048);
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }) } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new OpenAiLlmAdapter({ apiKey: 'sk-test', model: 'gpt-5-nano' });
    const res = await adapter.complete({ capability: 'parse_goal', prompt: 'x' });
    expect(res.text).toBe('{"ok":true}');
  });

  it('permet de surcharger explicitement reasoning_effort/verbosity/max_completion_tokens', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      expect(body.reasoning_effort).toBe('high');
      expect(body.verbosity).toBe('high');
      expect(body.max_completion_tokens).toBe(4096);
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{}' } }] }) } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);

    await new OpenAiLlmAdapter({
      apiKey: 'sk-test',
      model: 'gpt-5-nano',
      reasoningEffort: 'high',
      verbosity: 'high',
      maxCompletionTokens: 4096,
    }).complete({ capability: 'parse_goal', prompt: 'x' });
  });

  it('lève une erreur explicite si le raisonnement épuise le budget de tokens (sortie vide, finish_reason length)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '' }, finish_reason: 'length' }] }),
      })) as unknown as typeof fetch,
    );

    const adapter = new OpenAiLlmAdapter({ apiKey: 'sk-test', model: 'gpt-5-nano' });
    await expect(adapter.complete({ capability: 'parse_goal', prompt: 'x' })).rejects.toThrow(
      /maxCompletionTokens/,
    );
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
