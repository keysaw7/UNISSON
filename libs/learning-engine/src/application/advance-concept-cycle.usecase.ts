import type { ConceptId, LearnerId, SkillId } from '@unisson/shared-kernel';
import type { ErrorType } from '@unisson/assessment';
import type { LearnerStateRepositoryPort, MasteryModel } from '@unisson/learner-modeling';
import {
  advanceConceptCycle,
  initialCycleStage,
  type ConceptCycleState,
  type CycleTransitionEvent,
} from '../domain/concept-learning-cycle';
import type { ConceptCycleRepositoryPort } from '../ports/concept-cycle.repository.port';

export interface AdvanceConceptCycleInput {
  learnerId: LearnerId;
  conceptId: ConceptId;
  skillId: SkillId;
  event: CycleTransitionEvent;
}

export interface AdvanceConceptCycleResult {
  state: ConceptCycleState;
}

/**
 * Fait avancer le cycle pédagogique d'un concept (PEDAGOG.md) après une interaction.
 * Pure transition + persistance — la logique de transition reste testable sans I/O.
 */
export class AdvanceConceptCycleUseCase {
  constructor(
    private readonly cycles: ConceptCycleRepositoryPort,
    private readonly learnerState: LearnerStateRepositoryPort,
    private readonly model: MasteryModel,
  ) {}

  async execute(input: AdvanceConceptCycleInput): Promise<AdvanceConceptCycleResult> {
    const existing = await this.cycles.get(input.learnerId, input.conceptId);
    const mastery =
      (await this.learnerState.getMastery(input.learnerId, input.conceptId)) ??
      this.model.initialState(input.learnerId, input.conceptId);
    const skillActivated = await this.cycles.isSkillActivated(input.learnerId, input.skillId);

    const current: ConceptCycleState = existing ?? {
      learnerId: input.learnerId,
      conceptId: input.conceptId,
      skillId: input.skillId,
      stage: initialCycleStage(mastery.pMastery, skillActivated),
      consecutiveSuccesses: 0,
      updatedAt: new Date().toISOString(),
    };

    const next = advanceConceptCycle(current, input.event);
    await this.cycles.save(next);

    if (input.event.type === 'activation_completed') {
      await this.cycles.markSkillActivated(input.learnerId, input.skillId);
    }

    return { state: next };
  }

  /** Résout ou crée l'état de cycle pour un concept (lecture seule côté transition). */
  async resolve(learnerId: LearnerId, conceptId: ConceptId, skillId: SkillId): Promise<ConceptCycleState> {
    const existing = await this.cycles.get(learnerId, conceptId);
    if (existing) return existing;

    const mastery =
      (await this.learnerState.getMastery(learnerId, conceptId)) ??
      this.model.initialState(learnerId, conceptId);
    const skillActivated = await this.cycles.isSkillActivated(learnerId, skillId);

    return {
      learnerId,
      conceptId,
      skillId,
      stage: initialCycleStage(mastery.pMastery, skillActivated),
      consecutiveSuccesses: 0,
      updatedAt: new Date().toISOString(),
    };
  }
}

/** Mappe une erreur d'évaluation vers un événement de cycle. */
export function cycleEventFromAnswer(input: {
  correct: boolean;
  usedHint: boolean;
  errorType: ErrorType;
  cycleStage: ConceptCycleState['stage'];
}): CycleTransitionEvent {
  if (input.errorType === 'misconception') return { type: 'misconception_detected' };
  if (input.errorType === 'missing_prerequisite') return { type: 'missing_prerequisite_detected' };

  if (input.cycleStage === 'remediation') {
    return { type: 'remediation_completed', correct: input.correct };
  }
  if (input.cycleStage === 'consolidation') {
    return { type: 'consolidation_review', correct: input.correct };
  }
  if (input.cycleStage === 'generationTransfer') {
    if (input.correct) return { type: 'generation_completed', correct: true };
    return { type: 'practice_attempt', correct: input.correct, usedHint: input.usedHint };
  }

  return { type: 'practice_attempt', correct: input.correct, usedHint: input.usedHint, errorType: input.errorType };
}

export function cycleEventFromExposure(cycleStage: ConceptCycleState['stage']): CycleTransitionEvent {
  if (cycleStage === 'activation') return { type: 'activation_completed' };
  return { type: 'exposure_completed' };
}
