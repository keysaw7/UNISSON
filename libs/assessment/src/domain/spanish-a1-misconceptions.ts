import { asId } from '@unisson/shared-kernel';
import type { Misconception } from '../domain/misconception';

/** Misconceptions classiques Espagnol A1 (§6.4, Phase 5). */
export const SPANISH_A1_MISCONCEPTIONS: Misconception[] = [
  {
    id: 'mc-ser-estar',
    conceptId: asId<'ConceptId'>('es-ser-present'),
    description: 'Confusion entre ser (identité permanente) et estar (état temporaire).',
    wrongAnswerPatterns: ['estoy', 'está'],
    remediationHint: 'ser décrit ce que l’on EST ; estar décrit comment l’on se trouve (temporaire).',
  },
  {
    id: 'mc-un-una',
    conceptId: asId<'ConceptId'>('es-uno'),
    description: 'Oubli du genre : un/una selon le nom.',
    wrongAnswerPatterns: ['una', 'une'],
    remediationHint: 'uno = masculin ; una = féminin — le genre du nom compte.',
  },
];
