import { describe, expect, it } from 'vitest';
import { asId, type ConceptId, type LearnerId, type SkillId } from '@unisson/shared-kernel';
import {
  advanceConceptCycle,
  initialCycleStage,
  type ConceptCycleState,
} from './concept-learning-cycle';

const learnerId = asId<'LearnerId'>('l1') as LearnerId;
const conceptId = asId<'ConceptId'>('c1') as ConceptId;
const skillId = asId<'SkillId'>('s1') as SkillId;

function state(stage: ConceptCycleState['stage']): ConceptCycleState {
  return { learnerId, conceptId, skillId, stage, consecutiveSuccesses: 0, updatedAt: '2026-01-01T00:00:00.000Z' };
}

describe('concept-learning-cycle (PEDAGOG.md)', () => {
  it('nouveau concept : activation si compétence non activée, sinon exposition', () => {
    expect(initialCycleStage(0, false)).toBe('activation');
    expect(initialCycleStage(0, true)).toBe('exposure');
  });

  it('exposition → rappel actif immédiat obligatoire', () => {
    const next = advanceConceptCycle(state('exposure'), { type: 'exposure_completed' });
    expect(next.stage).toBe('activeRecall');
  });

  it('rappel actif réussi sans indice → pratique libre', () => {
    const next = advanceConceptCycle(state('activeRecall'), {
      type: 'practice_attempt',
      correct: true,
      usedHint: false,
    });
    expect(next.stage).toBe('freePractice');
  });

  it('rappel actif échoué → pratique guidée', () => {
    const next = advanceConceptCycle(state('activeRecall'), {
      type: 'practice_attempt',
      correct: false,
      usedHint: false,
    });
    expect(next.stage).toBe('guidedPractice');
  });

  it('misconception → branche remédiation transversale', () => {
    const next = advanceConceptCycle(state('freePractice'), { type: 'misconception_detected' });
    expect(next.stage).toBe('remediation');
  });

  it('remédiation corrigée → retour pratique guidée', () => {
    const next = advanceConceptCycle(state('remediation'), { type: 'remediation_completed', correct: true });
    expect(next.stage).toBe('guidedPractice');
  });
});
