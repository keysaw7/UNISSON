import type { Format } from '@unisson/content';

/**
 * Efficacité d'un format mesurée sur la RÉTENTION long terme (§6.5), pas le score immédiat : les
 * formats les plus efficaces (rappel actif) produisent souvent plus d'erreurs sur le moment. La
 * vraie métrique est le gain de STABILITÉ par minute investie (§8).
 */
export interface FormatEfficacyStat {
  formatType: Format;
  conceptType: string;
  /** Moyenne courante (le nombre d'observations sert au calcul incrémental). */
  stabilityGainPerMinute: number;
  observations: number;
  retentionAtDays: Record<number, number>;
}

/** Moyenne mobile incrémentale (Welford simplifié) : pas besoin de stocker l'historique complet. */
export function updateRunningMean(previous: number, count: number, value: number): number {
  return previous + (value - previous) / (count + 1);
}
