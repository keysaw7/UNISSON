import type { ConceptId, LearnerId, SkillId } from '@unisson/shared-kernel';
import type { ErrorType } from '@unisson/assessment';

/**
 * Cycle pédagogique par (apprenant, concept) — condense les 18 phases de PEDAGOG.md en 7 étapes
 * actionnables + branche transversale `remediation`.
 */
export type ConceptCycleStage =
  | 'activation'
  | 'exposure'
  | 'activeRecall'
  | 'guidedPractice'
  | 'freePractice'
  | 'consolidation'
  | 'generationTransfer'
  | 'remediation';

export interface ConceptCycleState {
  learnerId: LearnerId;
  conceptId: ConceptId;
  skillId: SkillId;
  stage: ConceptCycleStage;
  /** Succès consécutifs sans indice (pour avancer vers consolidation). */
  consecutiveSuccesses: number;
  updatedAt: string;
}

export type CycleTransitionEvent =
  | { type: 'activation_completed' }
  | { type: 'exposure_completed' }
  | { type: 'practice_attempt'; correct: boolean; usedHint: boolean; errorType?: ErrorType }
  | { type: 'misconception_detected' }
  | { type: 'missing_prerequisite_detected' }
  | { type: 'remediation_completed'; correct: boolean }
  | { type: 'consolidation_review'; correct: boolean }
  | { type: 'generation_completed'; correct: boolean }
  | { type: 'transfer_completed'; correct: boolean };

const PRACTICE_STAGES: ConceptCycleStage[] = ['guidedPractice', 'freePractice', 'consolidation', 'generationTransfer'];

/** Stades où l'interleaving entre plusieurs concepts est pédagogiquement souhaitable (PEDAGOG § phase 13). */
export const INTERLEAVE_ELIGIBLE_STAGES: ConceptCycleStage[] = ['freePractice', 'consolidation'];

export function initialCycleStage(pMastery: number, skillActivated: boolean): ConceptCycleStage {
  if (pMastery >= 0.85) return 'generationTransfer';
  if (pMastery >= 0.65) return 'consolidation';
  if (pMastery >= 0.5) return 'freePractice';
  if (pMastery >= 0.25) return 'guidedPractice';
  return skillActivated ? 'exposure' : 'activation';
}

export function advanceConceptCycle(state: ConceptCycleState, event: CycleTransitionEvent): ConceptCycleState {
  const base = { ...state, updatedAt: new Date().toISOString() };

  if (event.type === 'misconception_detected' || event.type === 'missing_prerequisite_detected') {
    return { ...base, stage: 'remediation', consecutiveSuccesses: 0 };
  }

  switch (state.stage) {
    case 'activation':
      if (event.type === 'activation_completed') return { ...base, stage: 'exposure' };
      break;
    case 'exposure':
      if (event.type === 'exposure_completed') return { ...base, stage: 'activeRecall', consecutiveSuccesses: 0 };
      break;
    case 'activeRecall':
      if (event.type === 'practice_attempt') {
        if (event.correct && !event.usedHint) {
          return { ...base, stage: 'freePractice', consecutiveSuccesses: 1 };
        }
        return { ...base, stage: 'guidedPractice', consecutiveSuccesses: 0 };
      }
      break;
    case 'guidedPractice':
      if (event.type === 'practice_attempt') {
        if (event.correct && !event.usedHint) {
          return { ...base, stage: 'freePractice', consecutiveSuccesses: 1 };
        }
        return { ...base, consecutiveSuccesses: 0 };
      }
      if (event.type === 'remediation_completed' && event.correct) {
        return { ...base, stage: 'guidedPractice', consecutiveSuccesses: 0 };
      }
      break;
    case 'freePractice':
      if (event.type === 'practice_attempt') {
        if (event.correct && !event.usedHint) {
          const successes = state.consecutiveSuccesses + 1;
          if (successes >= 3) return { ...base, stage: 'consolidation', consecutiveSuccesses: successes };
          return { ...base, consecutiveSuccesses: successes };
        }
        return { ...base, consecutiveSuccesses: 0 };
      }
      break;
    case 'consolidation':
      if (event.type === 'consolidation_review' || event.type === 'practice_attempt') {
        if (event.correct && state.consecutiveSuccesses >= 2) {
          return { ...base, stage: 'generationTransfer', consecutiveSuccesses: 0 };
        }
        if (event.correct) {
          return { ...base, consecutiveSuccesses: state.consecutiveSuccesses + 1 };
        }
        return { ...base, consecutiveSuccesses: 0 };
      }
      break;
    case 'generationTransfer':
      if (event.type === 'generation_completed' && event.correct) {
        return { ...base, stage: 'generationTransfer', consecutiveSuccesses: state.consecutiveSuccesses + 1 };
      }
      if (event.type === 'transfer_completed' && event.correct) {
        return { ...base, consecutiveSuccesses: state.consecutiveSuccesses + 1 };
      }
      break;
    case 'remediation':
      if (event.type === 'remediation_completed' && event.correct) {
        return { ...base, stage: 'guidedPractice', consecutiveSuccesses: 0 };
      }
      if (event.type === 'practice_attempt' && event.correct) {
        return { ...base, stage: 'guidedPractice', consecutiveSuccesses: 0 };
      }
      break;
  }

  return base;
}

export function cycleStageRationale(stage: ConceptCycleStage): string {
  const labels: Record<ConceptCycleStage, string> = {
    activation: 'activation des connaissances préalables (PEDAGOG § phases 3-4)',
    exposure: 'exposition structurée (PEDAGOG § phases 5-6)',
    activeRecall: 'rappel actif immédiat post-exposition — obligatoire (PEDAGOG § phase 8)',
    guidedPractice: 'pratique guidée avec indices dégressifs (PEDAGOG § phases 7, 9)',
    freePractice: 'pratique autonome en zone proximale (PEDAGOG § phase 9)',
    consolidation: 'consolidation et interleaving (PEDAGOG § phases 12-13, 17)',
    generationTransfer: 'génération et transfert en contexte nouveau (PEDAGOG § phases 14-16, 18)',
    remediation: 'remédiation ciblée (PEDAGOG § phases 10-11)',
  };
  return labels[stage];
}

export function isPracticeStage(stage: ConceptCycleStage): boolean {
  return PRACTICE_STAGES.includes(stage) || stage === 'activeRecall' || stage === 'guidedPractice';
}
