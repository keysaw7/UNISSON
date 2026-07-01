import type { ContentGeneratorPort, ContentRequest, LearningObject } from '@unisson/content';
import type { LearningObjectRepositoryPort } from '../ports/learning-object.repository.port';

/**
 * Décorateur de `ContentGeneratorPort` : lit le dépôt avant de regénérer, persiste après génération.
 * Économise coût/latence LLM et permet audit/modération du contenu produit.
 */
export class PersistingContentGeneratorAdapter implements ContentGeneratorPort {
  constructor(
    private readonly inner: ContentGeneratorPort,
    private readonly repository: LearningObjectRepositoryPort,
    private readonly providerLabel = 'ai-gateway',
  ) {}

  async generate(request: ContentRequest): Promise<LearningObject> {
    const cached = await this.repository.findByKey({
      targetRef: request.targetRef,
      format: request.format,
      difficulty: request.difficulty,
    });
    if (cached) return cached;

    const generated = await this.inner.generate(request);
    await this.repository.save(generated, { provider: this.providerLabel });
    return generated;
  }
}
