import { Body, Controller, Get, Inject, NotFoundException, Param, Post } from '@nestjs/common';
import {
  asId,
  type ConceptId,
  type DiagnosticSessionId,
  type LearnerId,
  type OutboxRelay,
  type SkillId,
} from '@unisson/shared-kernel';
import {
  LEARNER_STATE_REPOSITORY_PORT,
  masteryStage,
  RecordEvidenceUseCase,
  SeedInitialStateUseCase,
  type LearnerStateRepositoryPort,
  type MasteryModel,
} from '@unisson/learner-modeling';
import { EvaluateAnswerUseCase, type ActivityType } from '@unisson/assessment';
import { EnsureLearnerExistsUseCase } from '@unisson/identity';
import {
  AdvanceConceptCycleUseCase,
  CONCEPT_CYCLE_REPOSITORY_PORT,
  cycleEventFromAnswer,
  DiagnosticSessionNotFoundError,
  StartDiagnosticUseCase,
  SubmitDiagnosticAnswerUseCase,
  type ConceptCycleRepositoryPort,
  type ConceptCycleStage,
  type CycleTransitionEvent,
  type DeclaredLevel,
} from '@unisson/learning-engine';
import { INFRA } from '../infra/infra.module';

interface EvidenceBody {
  conceptId?: string;
  skillId?: string;
  correct?: boolean;
  score?: number;
  difficulty?: number;
  responseTimeMs?: number;
  evidenceWeight?: number;
  correlationId?: string;
  cycleStage?: ConceptCycleStage;
  usedHint?: boolean;
}

interface AnswerBody {
  activityId?: string;
  activityType?: ActivityType;
  expected?: string | string[];
  learnerAnswer?: string;
  conceptsCovered?: string[];
  skillId?: string;
  difficulty?: number;
  cycleStage?: ConceptCycleStage;
  signals?: { latencyMs?: number; usedHint?: boolean; attempts?: number; selfConfidence?: number };
}

interface CycleAdvanceBody {
  conceptId?: string;
  skillId?: string;
  event?: CycleTransitionEvent;
}

interface StartDiagnosticBody {
  domain?: string;
  targetSkills?: string[];
  declaredLevel?: DeclaredLevel;
  budget?: number;
}

interface DiagnosticAnswerBody {
  conceptId?: string;
  correct?: boolean;
}

@Controller('learners/:learnerId')
export class LearnersController {
  constructor(
    @Inject(RecordEvidenceUseCase) private readonly recordEvidence: RecordEvidenceUseCase,
    @Inject(EvaluateAnswerUseCase) private readonly evaluateAnswer: EvaluateAnswerUseCase,
    @Inject(AdvanceConceptCycleUseCase) private readonly advanceCycle: AdvanceConceptCycleUseCase,
    @Inject(CONCEPT_CYCLE_REPOSITORY_PORT) private readonly cycles: ConceptCycleRepositoryPort,
    @Inject(StartDiagnosticUseCase) private readonly startDiagnostic: StartDiagnosticUseCase,
    @Inject(SubmitDiagnosticAnswerUseCase) private readonly submitDiagnostic: SubmitDiagnosticAnswerUseCase,
    @Inject(SeedInitialStateUseCase) private readonly seedInitialState: SeedInitialStateUseCase,
    @Inject(EnsureLearnerExistsUseCase) private readonly ensureLearner: EnsureLearnerExistsUseCase,
    @Inject(INFRA.OutboxRelay) private readonly relay: OutboxRelay,
    @Inject(INFRA.MasteryModel) private readonly model: MasteryModel,
    @Inject(LEARNER_STATE_REPOSITORY_PORT) private readonly stateRepo: LearnerStateRepositoryPort,
  ) {}

  /** Retourne l'apprenant pseudonyme (création idempotente au premier contact). */
  @Get()
  async getLearner(@Param('learnerId') learnerIdRaw: string) {
    const learnerId = asId<'LearnerId'>(learnerIdRaw) as LearnerId;
    return this.ensureLearner.execute({ learnerId });
  }

  /** États de cycle pédagogique par concept (PEDAGOG.md). */
  @Get('cycle')
  async listCycleStates(@Param('learnerId') learnerIdRaw: string) {
    const learnerId = asId<'LearnerId'>(learnerIdRaw) as LearnerId;
    const states = await this.cycles.listForLearner(learnerId);
    return { states };
  }

  /** Fait avancer le cycle pédagogique (exposition → rappel actif, etc.). */
  @Post('cycle/advance')
  async advanceConceptCycle(@Param('learnerId') learnerIdRaw: string, @Body() body: CycleAdvanceBody) {
    const learnerId = asId<'LearnerId'>(learnerIdRaw) as LearnerId;
    if (!body.conceptId || !body.skillId || !body.event) {
      throw new NotFoundException('conceptId, skillId et event requis.');
    }
    const result = await this.advanceCycle.execute({
      learnerId,
      conceptId: asId<'ConceptId'>(body.conceptId) as ConceptId,
      skillId: asId<'SkillId'>(body.skillId) as SkillId,
      event: body.event,
    });
    await this.relay.drain();
    return result;
  }

  /** Démarre un diagnostic adaptatif graph-aware (§6.2) et renvoie le premier item-sonde. */
  @Post('diagnostic')
  async beginDiagnostic(@Param('learnerId') learnerIdRaw: string, @Body() body: StartDiagnosticBody) {
    const learnerId = asId<'LearnerId'>(learnerIdRaw) as LearnerId;
    await this.ensureLearner.execute({ learnerId });
    if (!body.targetSkills?.length) throw new NotFoundException('targetSkills requis.');

    const r = await this.startDiagnostic.execute({
      learnerId,
      domain: body.domain ?? 'japanese',
      targetSkills: body.targetSkills.map((s) => asId<'SkillId'>(s) as SkillId),
      declaredLevel: body.declaredLevel,
      budget: body.budget,
    });
    await this.relay.drain();

    return { sessionId: r.session.id, done: r.done, nextProbe: r.nextProbe, events: r.events.map((e) => e.type) };
  }

  @Post('diagnostic/:sessionId')
  async answerDiagnostic(
    @Param('learnerId') learnerIdRaw: string,
    @Param('sessionId') sessionIdRaw: string,
    @Body() body: DiagnosticAnswerBody,
  ) {
    const learnerId = asId<'LearnerId'>(learnerIdRaw) as LearnerId;
    if (!body.conceptId) throw new NotFoundException('conceptId requis.');

    try {
      const r = await this.submitDiagnostic.execute({
        sessionId: asId<'DiagnosticSessionId'>(sessionIdRaw) as DiagnosticSessionId,
        conceptId: asId<'ConceptId'>(body.conceptId) as ConceptId,
        correct: body.correct ?? false,
      });

      const seeded =
        r.done && r.priors
          ? await this.seedInitialState.execute({
              learnerId,
              priors: r.priors.map((p) => ({ conceptId: p.conceptId, pMastery: p.pMastery })),
            })
          : [];
      await this.relay.drain();

      return {
        done: r.done,
        nextProbe: r.nextProbe,
        priors: r.done ? r.priors : null,
        seededConcepts: seeded.length,
        events: r.events.map((e) => e.type),
      };
    } catch (err) {
      if (err instanceof DiagnosticSessionNotFoundError) throw new NotFoundException(err.message);
      throw err;
    }
  }

  @Post('evidence')
  async submitEvidence(@Param('learnerId') learnerIdRaw: string, @Body() body: EvidenceBody) {
    const learnerId = asId<'LearnerId'>(learnerIdRaw) as LearnerId;
    const conceptId = asId<'ConceptId'>(body.conceptId ?? '') as ConceptId;
    if (!body.conceptId) throw new NotFoundException('conceptId requis.');

    const { state, events } = await this.recordEvidence.execute({
      learnerId,
      conceptId,
      correct: body.correct ?? false,
      score: body.score,
      difficulty: body.difficulty,
      responseTimeMs: body.responseTimeMs,
      evidenceWeight: body.evidenceWeight,
      correlationId: body.correlationId,
    });

    let cycleState = null;
    if (body.skillId && body.cycleStage) {
      const event = cycleEventFromAnswer({
        correct: body.correct ?? false,
        usedHint: body.usedHint ?? false,
        errorType: body.correct ? 'correct' : 'partial',
        cycleStage: body.cycleStage,
      });
      cycleState = (
        await this.advanceCycle.execute({
          learnerId,
          conceptId,
          skillId: asId<'SkillId'>(body.skillId) as SkillId,
          event,
        })
      ).state;
    }

    await this.relay.drain();

    return {
      state,
      retrievability: this.model.retrievability(state, state.lastReviewedAt),
      stage: masteryStage(state),
      isDue: this.model.isDue(state, state.lastReviewedAt),
      cycleState,
      events: events.map((e) => e.type),
    };
  }

  @Post('answers')
  async submitAnswer(@Param('learnerId') learnerIdRaw: string, @Body() body: AnswerBody) {
    const learnerId = asId<'LearnerId'>(learnerIdRaw) as LearnerId;
    if (!body.activityId) throw new NotFoundException('activityId requis.');
    if (!body.conceptsCovered?.length) throw new NotFoundException('conceptsCovered requis.');

    const { evidence, events: assessmentEvents } = await this.evaluateAnswer.execute({
      learnerId,
      activityId: body.activityId,
      activityType: body.activityType ?? 'exact',
      expected: body.expected ?? '',
      learnerAnswer: body.learnerAnswer ?? '',
      conceptsCovered: body.conceptsCovered,
      skillId: body.skillId ? (asId<'SkillId'>(body.skillId) as SkillId) : undefined,
      difficulty: body.difficulty,
      signals: body.signals,
    });

    const correlationId = assessmentEvents[0]?.correlationId;
    const primaryConcept = evidence.attributedConcept ?? evidence.conceptsCovered[0];

    const mastery = primaryConcept
      ? await this.recordEvidence.execute({
          learnerId,
          conceptId: primaryConcept,
          correct: evidence.correct,
          score: evidence.score,
          difficulty: body.difficulty,
          responseTimeMs: evidence.signals.latencyMs,
          evidenceWeight: evidence.evidenceWeight,
          correlationId,
        })
      : null;

    let cycleState = null;
    if (body.skillId && body.cycleStage && primaryConcept) {
      const event = cycleEventFromAnswer({
        correct: evidence.correct,
        usedHint: body.signals?.usedHint ?? false,
        errorType: evidence.errorType,
        cycleStage: body.cycleStage,
      });
      cycleState = (
        await this.advanceCycle.execute({
          learnerId,
          conceptId: primaryConcept,
          skillId: asId<'SkillId'>(body.skillId) as SkillId,
          event,
        })
      ).state;
    }

    await this.relay.drain();

    return {
      evidence,
      state: mastery?.state ?? null,
      stage: mastery ? masteryStage(mastery.state) : null,
      cycleState,
      events: [...assessmentEvents, ...(mastery?.events ?? [])].map((e) => e.type),
    };
  }

  @Get('mastery/:conceptId')
  async getMastery(@Param('learnerId') learnerIdRaw: string, @Param('conceptId') conceptIdRaw: string) {
    const learnerId = asId<'LearnerId'>(learnerIdRaw) as LearnerId;
    const conceptId = asId<'ConceptId'>(conceptIdRaw) as ConceptId;

    const state =
      (await this.stateRepo.getMastery(learnerId, conceptId)) ??
      this.model.initialState(learnerId, conceptId);
    const now = new Date().toISOString();
    const cycle = await this.cycles.get(learnerId, conceptId);

    return {
      state,
      retrievability: this.model.retrievability(state, now),
      memoryRetention: this.model.memoryRetention(state, now),
      stage: masteryStage(state),
      isDue: this.model.isDue(state, now),
      cycleStage: cycle?.stage ?? null,
    };
  }
}
