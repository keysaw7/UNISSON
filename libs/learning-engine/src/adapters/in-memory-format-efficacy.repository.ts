import type { Format } from '@unisson/content';
import { updateRunningMean, type FormatEfficacyStat } from '../domain/format-efficacy';
import type { FormatEfficacyRepositoryPort } from '../ports/format-efficacy.repository.port';

const key = (formatType: Format, conceptType: string): string => `${formatType}:${conceptType}`;

export class InMemoryFormatEfficacyRepository implements FormatEfficacyRepositoryPort {
  private readonly stats = new Map<string, FormatEfficacyStat>();

  async get(formatType: Format, conceptType: string): Promise<FormatEfficacyStat | null> {
    return this.stats.get(key(formatType, conceptType)) ?? null;
  }

  async listForConceptType(conceptType: string): Promise<FormatEfficacyStat[]> {
    return [...this.stats.values()].filter((s) => s.conceptType === conceptType);
  }

  async recordObservation(formatType: Format, conceptType: string, stabilityGainPerMinute: number): Promise<FormatEfficacyStat> {
    const k = key(formatType, conceptType);
    const previous = this.stats.get(k) ?? {
      formatType,
      conceptType,
      stabilityGainPerMinute: 0,
      observations: 0,
      retentionAtDays: {},
    };
    const updated: FormatEfficacyStat = {
      ...previous,
      stabilityGainPerMinute: updateRunningMean(previous.stabilityGainPerMinute, previous.observations, stabilityGainPerMinute),
      observations: previous.observations + 1,
    };
    this.stats.set(k, updated);
    return updated;
  }
}
