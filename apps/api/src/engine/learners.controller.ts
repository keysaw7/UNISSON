import { Body, Controller, Get, Inject, NotFoundException, Param, Post } from '@nestjs/common';
import { asId, type ConceptId, type LearnerId, type OutboxRelay } from '@unisson/shared-kernel';
import {
  LEARNER_STATE_REPOSITORY_PORT,
  masteryStage,
  RecordEvidenceUseCase,
  type LearnerStateRepositoryPort,
  type MasteryModel,
} from '@unisson/learner-modeling';
import { INFRA } from '../infra/infra.module';

interface EvidenceBody {
  conceptId?: string;
  correct?: boolean;
  score?: number;
  difficulty?: number;
  responseTimeMs?: number;
  evidenceWeight?: number;
  correlationId?: string;
}

@Controller('learners/:learnerId')
export class LearnersController {
  constructor(
    @Inject(RecordEvidenceUseCase) private readonly recordEvidence: RecordEvidenceUseCase,
    @Inject(INFRA.OutboxRelay) private readonly relay: OutboxRelay,
    @Inject(INFRA.MasteryModel) private readonly model: MasteryModel,
    @Inject(LEARNER_STATE_REPOSITORY_PORT) private readonly stateRepo: LearnerStateRepositoryPort,
  ) {}

  /** Enregistre une preuve, met à jour la maîtrise et diffuse les événements (§8, §12). */
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
    await this.relay.drain();

    return {
      state,
      retrievability: this.model.retrievability(state, state.lastReviewedAt),
      stage: masteryStage(state),
      isDue: this.model.isDue(state, state.lastReviewedAt),
      events: events.map((e) => e.type),
    };
  }

  /** État de maîtrise courant d'un concept (projection + rétrievabilité au moment de la requête). */
  @Get('mastery/:conceptId')
  async getMastery(@Param('learnerId') learnerIdRaw: string, @Param('conceptId') conceptIdRaw: string) {
    const learnerId = asId<'LearnerId'>(learnerIdRaw) as LearnerId;
    const conceptId = asId<'ConceptId'>(conceptIdRaw) as ConceptId;

    const state =
      (await this.stateRepo.getMastery(learnerId, conceptId)) ??
      this.model.initialState(learnerId, conceptId);
    const now = new Date().toISOString();

    return {
      state,
      retrievability: this.model.retrievability(state, now),
      memoryRetention: this.model.memoryRetention(state, now),
      stage: masteryStage(state),
      isDue: this.model.isDue(state, now),
    };
  }
}
