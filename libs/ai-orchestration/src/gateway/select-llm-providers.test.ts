import { describe, expect, it } from 'vitest';
import { selectLlmProviders } from './select-llm-providers';
import { AnthropicLlmAdapter } from '../adapters/anthropic-llm.adapter';
import { OpenAiLlmAdapter } from '../adapters/openai-llm.adapter';
import { StubLlmAdapter } from '../adapters/stub-llm.adapter';

describe('selectLlmProviders', () => {
  it('retombe sur le stub seul sans aucune configuration', () => {
    const { primary, fallback } = selectLlmProviders({});
    expect(primary).toBeInstanceOf(StubLlmAdapter);
    expect(fallback).toBeUndefined();
  });

  it('choisit Anthropic en primaire si seule sa clé est présente, stub en secours', () => {
    const { primary, fallback } = selectLlmProviders({ ANTHROPIC_API_KEY: 'sk-a' });
    expect(primary).toBeInstanceOf(AnthropicLlmAdapter);
    expect(fallback).toBeInstanceOf(StubLlmAdapter);
  });

  it('choisit OpenAI en primaire si seule sa clé est présente, stub en secours', () => {
    const { primary, fallback } = selectLlmProviders({ OPENAI_API_KEY: 'sk-o' });
    expect(primary).toBeInstanceOf(OpenAiLlmAdapter);
    expect(fallback).toBeInstanceOf(StubLlmAdapter);
  });

  it('préfère Anthropic par défaut si les deux clés sont présentes, OpenAI en secours', () => {
    const { primary, fallback } = selectLlmProviders({ ANTHROPIC_API_KEY: 'sk-a', OPENAI_API_KEY: 'sk-o' });
    expect(primary).toBeInstanceOf(AnthropicLlmAdapter);
    expect(fallback).toBeInstanceOf(OpenAiLlmAdapter);
  });

  it('LLM_PROVIDER=openai force OpenAI en primaire même si Anthropic est aussi configuré', () => {
    const { primary, fallback } = selectLlmProviders({
      LLM_PROVIDER: 'openai',
      ANTHROPIC_API_KEY: 'sk-a',
      OPENAI_API_KEY: 'sk-o',
    });
    expect(primary).toBeInstanceOf(OpenAiLlmAdapter);
    expect(fallback).toBeInstanceOf(AnthropicLlmAdapter);
  });

  it('LLM_PROVIDER=stub force le stub même si des clés API sont présentes', () => {
    const { primary, fallback } = selectLlmProviders({
      LLM_PROVIDER: 'stub',
      ANTHROPIC_API_KEY: 'sk-a',
      OPENAI_API_KEY: 'sk-o',
    });
    expect(primary).toBeInstanceOf(StubLlmAdapter);
    expect(fallback).toBeUndefined();
  });

  it('LLM_PROVIDER=anthropic sans clé correspondante échoue explicitement', () => {
    expect(() => selectLlmProviders({ LLM_PROVIDER: 'anthropic' })).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('LLM_PROVIDER=openai sans clé correspondante échoue explicitement', () => {
    expect(() => selectLlmProviders({ LLM_PROVIDER: 'openai' })).toThrow(/OPENAI_API_KEY/);
  });

  it('rejette une valeur LLM_PROVIDER inconnue', () => {
    expect(() => selectLlmProviders({ LLM_PROVIDER: 'mistral' })).toThrow(/inconnu/);
  });
});
