import { describe, expect, it } from 'vitest';
import { asId, type ConceptId } from '@unisson/shared-kernel';
import {
  initialBelief,
  isComplete,
  observe,
  selectNextConcept,
  toPriors,
  type DiagnosticNode,
} from './diagnostic';

const c = (id: string) => asId<'ConceptId'>(id) as ConceptId;

const nodes: DiagnosticNode[] = [
  { conceptId: c('root'), skillId: asId('s1'), difficulty: 0.2, prerequisiteConceptIds: [], dependentConceptIds: [c('mid'), c('leaf')] },
  { conceptId: c('mid'), skillId: asId('s2'), difficulty: 0.5, prerequisiteConceptIds: [c('root')], dependentConceptIds: [c('leaf')] },
  { conceptId: c('leaf'), skillId: asId('s3'), difficulty: 0.85, prerequisiteConceptIds: [c('root'), c('mid')], dependentConceptIds: [] },
];

describe('initialBelief', () => {
  it('un niveau avancé donne un prior de maîtrise plus élevé qu’un débutant', () => {
    const beg = initialBelief(nodes, 'beginner');
    const adv = initialBelief(nodes, 'advanced');
    expect(adv['leaf']!.pMastery).toBeGreaterThan(beg['leaf']!.pMastery);
    expect(beg['root']!.confidence).toBeLessThan(0.2); // incertain au départ
  });
});

describe('propagation (§6.2)', () => {
  it('réussite d’un skill avancé → prérequis inférés maîtrisés (montent)', () => {
    const b0 = initialBelief(nodes, 'beginner');
    const b1 = observe(nodes, b0, c('leaf'), true);
    expect(b1['leaf']!.pMastery).toBeGreaterThan(b0['leaf']!.pMastery);
    expect(b1['root']!.pMastery).toBeGreaterThan(b0['root']!.pMastery);
    expect(b1['mid']!.pMastery).toBeGreaterThan(b0['mid']!.pMastery);
    // On a gagné de la certitude sur les prérequis SANS les demander.
    expect(b1['root']!.confidence).toBeGreaterThan(b0['root']!.confidence);
  });

  it('échec d’un skill de base → dépendants inférés non maîtrisés (baissent)', () => {
    const b0 = initialBelief(nodes, 'intermediate');
    const b1 = observe(nodes, b0, c('root'), false);
    expect(b1['root']!.pMastery).toBeLessThan(b0['root']!.pMastery);
    expect(b1['leaf']!.pMastery).toBeLessThan(b0['leaf']!.pMastery);
    expect(b1['mid']!.pMastery).toBeLessThan(b0['mid']!.pMastery);
  });
});

describe('sélection & arrêt', () => {
  it('ne resélectionne pas un concept déjà testé et gagne en certitude', () => {
    const b0 = initialBelief(nodes, 'beginner');
    const first = selectNextConcept(nodes, b0, []);
    expect(first).not.toBeNull();
    const b1 = observe(nodes, b0, first!, true);
    const second = selectNextConcept(nodes, b1, [first!]);
    expect(second).not.toBe(first);
    expect(b1[first!]!.confidence).toBeGreaterThan(b0[first!]!.confidence);
  });

  it('isComplete respecte le budget d’items', () => {
    const b0 = initialBelief(nodes, 'beginner');
    expect(isComplete({ belief: b0, asked: [c('root'), c('mid')], budget: 2, confidenceTarget: 0.99 })).toBe(true);
    expect(isComplete({ belief: b0, asked: [], budget: 10, confidenceTarget: 0.99 })).toBe(false);
    expect(toPriors(b0)).toHaveLength(3);
  });
});
