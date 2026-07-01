import type { Format } from '@unisson/content';
import type { FormatEfficacyStat } from '../domain/format-efficacy';

/** Persistance des statistiques d'efficacité par (format, type de concept) — alimente le bandit (§6.5). */
export interface FormatEfficacyRepositoryPort {
  get(formatType: Format, conceptType: string): Promise<FormatEfficacyStat | null>;
  listForConceptType(conceptType: string): Promise<FormatEfficacyStat[]>;
  /** Intègre une nouvelle observation (moyenne incrémentale) et renvoie la stat mise à jour. */
  recordObservation(formatType: Format, conceptType: string, stabilityGainPerMinute: number): Promise<FormatEfficacyStat>;
}

export const FORMAT_EFFICACY_REPOSITORY_PORT = Symbol('FormatEfficacyRepositoryPort');
