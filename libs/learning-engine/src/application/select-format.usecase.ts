import { createEvent, type DomainEvent, type LearnerId, type OutboxPort } from '@unisson/shared-kernel';
import type { ContentGeneratorPort, LearningObject } from '@unisson/content';
import { FORMAT_EVENTS } from '../domain/format-events';
import type { FormatDecisionContext, FormatSelectionStrategyPort, FormatSpec } from '../domain/format-selector';

export interface SelectFormatInput {
  learnerId: LearnerId;
  context: FormatDecisionContext;
  correlationId?: string;
}

export interface SelectFormatResult {
  spec: FormatSpec;
  learningObject: LearningObject;
  events: DomainEvent[];
}

/**
 * Orchestre la 6e décision (§6.5) : le Format Selector choisit le format ABSTRAIT (règles →
 * bandit contraint) ; l'AI Gateway (derrière `ContentGeneratorPort`) produit ensuite le contenu
 * CONCRET (ou le sert du cache). Décision de forme (moteur) ≠ production (IA) — jamais mélangées.
 */
export class SelectFormatUseCase {
  constructor(
    private readonly strategy: FormatSelectionStrategyPort,
    private readonly contentGenerator: ContentGeneratorPort,
    private readonly outbox: OutboxPort,
  ) {}

  async execute(input: SelectFormatInput): Promise<SelectFormatResult> {
    const spec = await this.strategy.select(input.context);
    const learningObject = await this.contentGenerator.generate({
      targetRef: input.context.conceptId,
      format: spec.format,
      difficulty: spec.difficulty,
      contextVariant: input.context.contextVariant,
    });

    const event = createEvent({
      type: FORMAT_EVENTS.FormatSelected,
      aggregateType: 'FormatDecision',
      aggregateId: `${input.learnerId}:${input.context.conceptId}`,
      correlationId: input.correlationId,
      payload: {
        learnerId: input.learnerId,
        conceptId: input.context.conceptId,
        format: spec.format,
        difficulty: spec.difficulty,
        rationale: spec.rationale,
        fallbackFormats: spec.fallbackFormats,
      },
    });
    await this.outbox.enqueue([event]);

    return { spec, learningObject, events: [event] };
  }
}
