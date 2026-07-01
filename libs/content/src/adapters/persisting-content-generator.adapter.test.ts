import { describe, it, expect, vi } from 'vitest';
import type { ContentGeneratorPort, ContentRequest } from '../ports/content-generator.port';
import type { LearningObject } from '../domain/learning-object';
import { InMemoryLearningObjectRepository } from './in-memory-learning-object.repository';
import { PersistingContentGeneratorAdapter } from './persisting-content-generator.adapter';

describe('PersistingContentGeneratorAdapter', () => {
  it('réutilise un objet existant sans rappeler le générateur interne', async () => {
    const repo = new InMemoryLearningObjectRepository();
    const existing: LearningObject = {
      id: 'lo-1',
      targetRef: 'hiragana-a',
      format: 'explanation',
      difficulty: 0.2,
      contentRef: 'cached-body',
    };
    await repo.save(existing);

    const inner: ContentGeneratorPort = { generate: vi.fn() };
    const adapter = new PersistingContentGeneratorAdapter(inner, repo);

    const request: ContentRequest = {
      targetRef: 'hiragana-a',
      format: 'explanation',
      difficulty: 0.2,
    };
    const result = await adapter.generate(request);

    expect(result.id).toBe('lo-1');
    expect(inner.generate).not.toHaveBeenCalled();
  });

  it('persiste après génération quand absent du dépôt', async () => {
    const repo = new InMemoryLearningObjectRepository();
    const generated: LearningObject = {
      id: 'lo-2',
      targetRef: 'particle-wa',
      format: 'cloze',
      difficulty: 0.5,
      contentRef: 'fresh-body',
    };
    const inner: ContentGeneratorPort = { generate: async () => generated };
    const adapter = new PersistingContentGeneratorAdapter(inner, repo);

    const result = await adapter.generate({
      targetRef: 'particle-wa',
      format: 'cloze',
      difficulty: 0.5,
    });

    expect(result.contentRef).toBe('fresh-body');
    const stored = await repo.findByKey({
      targetRef: 'particle-wa',
      format: 'cloze',
      difficulty: 0.5,
    });
    expect(stored?.id).toBe('lo-2');
  });
});
