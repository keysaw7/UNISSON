import { makeId } from '@unisson/shared-kernel';
import type { ContentGeneratorPort, ContentRequest, LearningObject } from '@unisson/content';
import type { AiGateway } from '../gateway/ai-gateway';
import { GenerateContentCapability } from '../capabilities/generate-content.capability';

/**
 * Implémente `ContentGeneratorPort` (contexte Content) via la capacité `generate_content` de l'AI
 * Gateway. Pont adapter (§10.1) : le Format Selector ne connaît que le port, jamais l'IA.
 */
export class AiContentGeneratorAdapter implements ContentGeneratorPort {
  private readonly capability: GenerateContentCapability;

  constructor(gateway: AiGateway) {
    this.capability = new GenerateContentCapability(gateway);
  }

  async generate(request: ContentRequest): Promise<LearningObject> {
    const { body } = await this.capability.run(request);
    return {
      id: makeId<'LearningObjectId'>(),
      targetRef: request.targetRef,
      format: request.format,
      difficulty: request.difficulty,
      contentRef: body,
    };
  }
}
