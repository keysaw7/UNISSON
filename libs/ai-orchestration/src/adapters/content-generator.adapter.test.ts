import { describe, expect, it } from 'vitest';
import { StubLlmAdapter } from './stub-llm.adapter';
import { InMemoryCache } from './in-memory-cache';
import { InMemoryTelemetryAdapter } from './in-memory-telemetry.adapter';
import { AiGateway } from '../gateway/ai-gateway';
import { AiContentGeneratorAdapter } from './content-generator.adapter';

describe('AiContentGeneratorAdapter (§6.5, §10) avec StubLlmAdapter', () => {
  it('produit un LearningObject cohérent avec la requête', async () => {
    const gateway = new AiGateway(new StubLlmAdapter(), new InMemoryCache(), new InMemoryTelemetryAdapter());
    const adapter = new AiContentGeneratorAdapter(gateway);
    const lo = await adapter.generate({ targetRef: 'hiragana-a', format: 'mcq', difficulty: 0.35 });

    expect(lo.targetRef).toBe('hiragana-a');
    expect(lo.format).toBe('mcq');
    expect(lo.difficulty).toBe(0.35);
    expect(lo.contentRef).toContain('mcq');
    expect(lo.contentRef).toContain('hiragana-a');
    expect(lo.id).toBeTruthy();
  });
});
