import type { Format } from '@unisson/content';
import {
  type FormatDecisionContext,
  type FormatSelectionStrategyPort,
  type FormatSpec,
} from '../domain/format-selector';
import type { FormatEfficacyRepositoryPort } from '../ports/format-efficacy.repository.port';

export interface RandomSource {
  /** Nombre pseudo-aléatoire dans [0, 1). Injectable pour des tests déterministes. */
  next(): number;
}

const DEFAULT_RANDOM: RandomSource = { next: () => Math.random() };
const DEFAULT_EPSILON = 0.15;

/**
 * Approche C (§6.5) : bandit contextuel qui explore UNIQUEMENT dans la bande valide définie par
 * l'approche B (le `base` strategy sert de PLANCHER DE SÉCURITÉ — jamais « rappel avant
 * exposition », jamais hors bande pédagogique). Epsilon-greedy sur le gain de stabilité/minute
 * mesuré empiriquement ; sans données (cold start), retombe sur le premier choix des règles.
 */
export class ConstrainedBanditFormatSelector implements FormatSelectionStrategyPort {
  constructor(
    private readonly base: FormatSelectionStrategyPort,
    private readonly efficacy: FormatEfficacyRepositoryPort,
    private readonly epsilon: number = DEFAULT_EPSILON,
    private readonly random: RandomSource = DEFAULT_RANDOM,
  ) {}

  async select(context: FormatDecisionContext): Promise<FormatSpec> {
    const floor = await this.base.select(context);
    const band: Format[] = [floor.format, ...floor.fallbackFormats];
    if (band.length <= 1) return floor;

    if (this.random.next() < this.epsilon) {
      const idx = Math.floor(this.random.next() * band.length);
      const format = band[idx]!;
      return {
        ...floor,
        format,
        fallbackFormats: band.filter((f) => f !== format),
        rationale: `${floor.rationale} · bandit : exploration (ε=${this.epsilon})`,
      };
    }

    const stats = await Promise.all(band.map((f) => this.efficacy.get(f, context.conceptType)));
    let best = floor.format;
    let bestScore = -Infinity;
    let hasData = false;
    band.forEach((f, i) => {
      const s = stats[i];
      if (!s) return;
      hasData = true;
      if (s.stabilityGainPerMinute > bestScore) {
        bestScore = s.stabilityGainPerMinute;
        best = f;
      }
    });

    if (!hasData) return floor; // cold start → plancher B, aucune donnée d'efficacité encore

    return {
      ...floor,
      format: best,
      fallbackFormats: band.filter((f) => f !== best),
      rationale: `${floor.rationale} · bandit : meilleure efficacité connue (${bestScore.toFixed(3)} stabilité/min)`,
    };
  }
}
