import { createEvent, type DomainEvent, type OutboxPort } from '@unisson/shared-kernel';
import type { Format } from '@unisson/content';
import type { FormatEfficacyStat } from '../domain/format-efficacy';
import { FORMAT_EVENTS } from '../domain/format-events';
import type { FormatEfficacyRepositoryPort } from '../ports/format-efficacy.repository.port';

export interface RecordFormatEfficacyInput {
  formatType: Format;
  conceptType: string;
  /** La vraie métrique (§6.5) : gain de stabilité par minute investie, pas le score immédiat. */
  stabilityGainPerMinute: number;
  correlationId?: string;
}

export interface RecordFormatEfficacyResult {
  stat: FormatEfficacyStat;
  events: DomainEvent[];
}

/**
 * Alimente le bandit contraint (§6.5) : chaque observation affine la connaissance empirique
 * d'efficacité par (format, type de concept), mesurée sur la RÉTENTION long terme.
 */
export class RecordFormatEfficacyUseCase {
  constructor(
    private readonly repo: FormatEfficacyRepositoryPort,
    private readonly outbox: OutboxPort,
  ) {}

  async execute(input: RecordFormatEfficacyInput): Promise<RecordFormatEfficacyResult> {
    const stat = await this.repo.recordObservation(input.formatType, input.conceptType, input.stabilityGainPerMinute);

    const event = createEvent({
      type: FORMAT_EVENTS.FormatEfficacyRecorded,
      aggregateType: 'FormatEfficacy',
      aggregateId: `${input.formatType}:${input.conceptType}`,
      correlationId: input.correlationId,
      payload: {
        formatType: stat.formatType,
        conceptType: stat.conceptType,
        stabilityGainPerMinute: stat.stabilityGainPerMinute,
        observations: stat.observations,
      },
    });
    await this.outbox.enqueue([event]);

    return { stat, events: [event] };
  }
}
