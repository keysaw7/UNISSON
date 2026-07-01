import { describe, expect, it } from 'vitest';
import { asId, type ConceptId, type LearnerId } from '@unisson/shared-kernel';
import { createEvidence, type EvidenceEvent } from './evidence-event';
import { DEFAULT_MASTERY_PARAMS, FsrsBayesianMasteryModel } from './mastery-model';

const learner = asId<'LearnerId'>('learner-1') as LearnerId;
const concept = asId<'ConceptId'>('hiragana-a') as ConceptId;
const model = new FsrsBayesianMasteryModel();

const daysLater = (iso: string, days: number): string =>
  new Date(Date.parse(iso) + days * 86_400_000).toISOString();

const ev = (over: Partial<Parameters<typeof createEvidence>[0]> = {}): EvidenceEvent =>
  createEvidence({ learnerId: learner, conceptId: concept, correct: true, ...over });

describe('FsrsBayesianMasteryModel — oubli (FSRS)', () => {
  it('rétention = 1 à t=0 et ≈ 0.9 quand t = stabilité', () => {
    const t0 = '2026-01-01T00:00:00.000Z';
    const state = { learnerId: learner, conceptId: concept, pMastery: 1, stability: 10, lastReviewedAt: t0 };

    expect(model.memoryRetention(state, t0)).toBeCloseTo(1, 6);
    expect(model.memoryRetention(state, daysLater(t0, 10))).toBeCloseTo(0.9, 4);
  });

  it('la rétention décroît de façon monotone avec le temps', () => {
    const t0 = '2026-01-01T00:00:00.000Z';
    const state = { learnerId: learner, conceptId: concept, pMastery: 1, stability: 5, lastReviewedAt: t0 };
    const r1 = model.memoryRetention(state, daysLater(t0, 1));
    const r5 = model.memoryRetention(state, daysLater(t0, 5));
    const r30 = model.memoryRetention(state, daysLater(t0, 30));
    expect(r1).toBeGreaterThan(r5);
    expect(r5).toBeGreaterThan(r30);
  });

  it('retrievability = pMastery × rétention (§8)', () => {
    const t0 = '2026-01-01T00:00:00.000Z';
    const state = { learnerId: learner, conceptId: concept, pMastery: 0.8, stability: 10, lastReviewedAt: t0 };
    const t = daysLater(t0, 10);
    expect(model.retrievability(state, t)).toBeCloseTo(0.8 * model.memoryRetention(state, t), 6);
  });
});

describe('FsrsBayesianMasteryModel — apprentissage (bayésien)', () => {
  it('une bonne réponse augmente pMastery, une mauvaise la diminue', () => {
    const t0 = '2026-01-01T00:00:00.000Z';
    const init = model.initialState(learner, concept, t0);

    const afterCorrect = model.applyEvidence(init, ev({ occurredAt: t0, correct: true }));
    expect(afterCorrect.pMastery).toBeGreaterThan(init.pMastery);

    const afterWrong = model.applyEvidence(init, ev({ occurredAt: t0, correct: false }));
    expect(afterWrong.pMastery).toBeLessThan(init.pMastery);
  });

  it('une preuve à faible poids bouge moins l’estimation qu’une preuve fiable', () => {
    const t0 = '2026-01-01T00:00:00.000Z';
    const init = model.initialState(learner, concept, t0);
    const strong = model.applyEvidence(init, ev({ occurredAt: t0, correct: true, evidenceWeight: 1 }));
    const weak = model.applyEvidence(init, ev({ occurredAt: t0, correct: true, evidenceWeight: 0.2 }));
    expect(strong.pMastery).toBeGreaterThan(weak.pMastery);
  });
});

describe('FsrsBayesianMasteryModel — stabilité (effet d’espacement)', () => {
  it('une révision réussie espacée fait davantage croître la stabilité qu’une révision immédiate', () => {
    const t0 = '2026-01-01T00:00:00.000Z';
    const learned = model.applyEvidence(model.initialState(learner, concept, t0), ev({ occurredAt: t0 }));

    const immediate = model.applyEvidence(learned, ev({ occurredAt: daysLater(t0, 0.01) }));
    const spaced = model.applyEvidence(learned, ev({ occurredAt: daysLater(t0, learned.stability * 2) }));

    expect(spaced.stability).toBeGreaterThan(immediate.stability);
    expect(spaced.stability).toBeGreaterThan(learned.stability);
  });

  it('un échec effondre la stabilité (lapse) sans passer sous le plancher', () => {
    const t0 = '2026-01-01T00:00:00.000Z';
    let state = model.initialState(learner, concept, t0);
    for (let i = 1; i <= 4; i++) state = model.applyEvidence(state, ev({ occurredAt: daysLater(t0, i * 3) }));
    const before = state.stability;

    const lapsed = model.applyEvidence(state, ev({ occurredAt: daysLater(t0, 30), correct: false }));
    expect(lapsed.stability).toBeLessThan(before);
    expect(lapsed.stability).toBeGreaterThanOrEqual(DEFAULT_MASTERY_PARAMS.minStability);
  });
});

describe('FsrsBayesianMasteryModel — replay (source de vérité §12.2)', () => {
  it('projeter depuis les evidence events = appliquer séquentiellement (déterministe)', () => {
    const t0 = '2026-01-01T00:00:00.000Z';
    const events = [
      ev({ occurredAt: daysLater(t0, 0), correct: true }),
      ev({ occurredAt: daysLater(t0, 2), correct: false }),
      ev({ occurredAt: daysLater(t0, 3), correct: true }),
      ev({ occurredAt: daysLater(t0, 10), correct: true, difficulty: 0.8 }),
    ];

    let sequential = model.initialState(learner, concept, events[0]!.occurredAt);
    for (const e of events) sequential = model.applyEvidence(sequential, e);

    const projected = model.project(learner, concept, events);
    expect(projected.pMastery).toBeCloseTo(sequential.pMastery, 10);
    expect(projected.stability).toBeCloseTo(sequential.stability, 10);

    // Insensible à l'ordre d'entrée (tri interne par occurredAt).
    const shuffled = model.project(learner, concept, [events[3]!, events[0]!, events[2]!, events[1]!]);
    expect(shuffled.pMastery).toBeCloseTo(projected.pMastery, 10);
  });
});

describe('FsrsBayesianMasteryModel — planification des révisions', () => {
  it('concept connu mais mémoire estompée → à réviser ; fraîchement révisé → non', () => {
    const t0 = '2026-01-01T00:00:00.000Z';
    let state = model.initialState(learner, concept, t0);
    for (let i = 1; i <= 5; i++) state = model.applyEvidence(state, ev({ occurredAt: daysLater(t0, i * 2) }));
    const lastReview = state.lastReviewedAt;

    expect(model.isDue(state, lastReview)).toBe(false);
    expect(model.isDue(state, daysLater(lastReview, state.stability * 5))).toBe(true);
  });
});
