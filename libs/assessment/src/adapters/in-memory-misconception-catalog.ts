import { asId, type ConceptId } from '@unisson/shared-kernel';
import type { Misconception } from '../domain/misconception';
import { normalize } from '../domain/text-matching';
import type { MisconceptionCatalogPort } from '../ports/misconception-catalog.port';
import { SPANISH_A1_MISCONCEPTIONS } from '../domain/spanish-a1-misconceptions';

/** Amorçage expert (§6.4) : misconceptions classiques Japonais N5 + Espagnol A1. */
export const JAPANESE_N5_MISCONCEPTIONS: Misconception[] = [
  {
    id: 'mc-wa-ga',
    conceptId: asId<'ConceptId'>('particle-wa'),
    description: 'Confusion entre la particule は (thème) et が (sujet).',
    wrongAnswerPatterns: ['が', 'ga'],
    remediationHint: 'は marque le thème connu ; が introduit un sujet nouveau/mis en relief.',
  },
  {
    id: 'mc-wo-o',
    conceptId: asId<'ConceptId'>('particle-wo'),
    description: 'Confusion entre la particule を (COD) et le son お.',
    wrongAnswerPatterns: ['お', 'o'],
    remediationHint: 'を ne s’écrit qu’en tant que particule d’objet direct ; ailleurs, c’est お.',
  },
];

export const DEFAULT_MISCONCEPTIONS: Misconception[] = [
  ...JAPANESE_N5_MISCONCEPTIONS,
  ...SPANISH_A1_MISCONCEPTIONS,
];

export class InMemoryMisconceptionCatalog implements MisconceptionCatalogPort {
  private readonly items: Misconception[];

  constructor(items: Misconception[] = DEFAULT_MISCONCEPTIONS) {
    this.items = items;
  }

  async detect(conceptId: ConceptId, learnerAnswer: string): Promise<Misconception | null> {
    const a = normalize(learnerAnswer);
    return (
      this.items.find(
        (m) => m.conceptId === conceptId && m.wrongAnswerPatterns.some((p) => a.includes(normalize(p))),
      ) ?? null
    );
  }

  async listForConcept(conceptId: ConceptId): Promise<Misconception[]> {
    return this.items.filter((m) => m.conceptId === conceptId);
  }
}
