import { Body, Controller, Get, Inject, NotFoundException, Param, Post } from '@nestjs/common';
import { asId, type ConceptId, type LearnerId, type OutboxRelay, type SkillId } from '@unisson/shared-kernel';
import type { ConceptType } from '@unisson/knowledge-graph';
import {
  LEARNER_STATE_REPOSITORY_PORT,
  masteryStage,
  type LearnerStateRepositoryPort,
  type MasteryModel,
} from '@unisson/learner-modeling';
import {
  AdvanceConceptCycleUseCase,
  FORMAT_EFFICACY_REPOSITORY_PORT,
  RecordFormatEfficacyUseCase,
  SelectFormatUseCase,
  type ConceptCycleStage,
  type FormatEfficacyRepositoryPort,
  type LearnerFormatContext,
  type PedagogicalIntent,
} from '@unisson/learning-engine';
import type { Format } from '@unisson/content';
import { INFRA } from '../infra/infra.module';

interface FormatSelectionBody {
  conceptId?: string;
  skillId?: string;
  conceptType?: ConceptType;
  intent?: PedagogicalIntent;
  cycleStage?: ConceptCycleStage;
  hasMisconception?: boolean;
  targetDifficulty?: number;
  contextVariant?: number;
  learnerContext?: LearnerFormatContext;
}

interface FormatEfficacyBody {
  formatType?: Format;
  conceptType?: string;
  stabilityGainPerMinute?: number;
}

/**
 * Format Selector (§6.5) : la 6e décision — « sous quelle forme ». Choisit le format ABSTRAIT
 * (règles → bandit contraint), puis délègue la production du contenu CONCRET à l'AI Gateway.
 */
@Controller()
export class FormatController {
  constructor(
    @Inject(SelectFormatUseCase) private readonly selectFormat: SelectFormatUseCase,
    @Inject(RecordFormatEfficacyUseCase) private readonly recordEfficacy: RecordFormatEfficacyUseCase,
    @Inject(FORMAT_EFFICACY_REPOSITORY_PORT) private readonly efficacyRepo: FormatEfficacyRepositoryPort,
    @Inject(AdvanceConceptCycleUseCase) private readonly cycleResolver: AdvanceConceptCycleUseCase,
    @Inject(INFRA.OutboxRelay) private readonly relay: OutboxRelay,
    @Inject(INFRA.MasteryModel) private readonly model: MasteryModel,
    @Inject(LEARNER_STATE_REPOSITORY_PORT) private readonly stateRepo: LearnerStateRepositoryPort,
  ) {}

  @Post('learners/:learnerId/format')
  async selectFormatForLearner(@Param('learnerId') learnerIdRaw: string, @Body() body: FormatSelectionBody) {
    if (!body.conceptId || !body.skillId) throw new NotFoundException('conceptId et skillId requis.');
    const learnerId = asId<'LearnerId'>(learnerIdRaw) as LearnerId;
    const conceptId = asId<'ConceptId'>(body.conceptId) as ConceptId;
    const skillId = asId<'SkillId'>(body.skillId) as SkillId;

    const state = await this.stateRepo.getMastery(learnerId, conceptId);
    const stage = state ? masteryStage(state) : masteryStage(this.model.initialState(learnerId, conceptId));
    const cycle = await this.cycleResolver.resolve(learnerId, conceptId, skillId);
    const contextVariant = body.contextVariant ?? Math.floor(Math.random() * 1000);

    const { spec, learningObject, events } = await this.selectFormat.execute({
      learnerId,
      context: {
        conceptId,
        skillId,
        conceptType: body.conceptType ?? 'generic',
        intent: body.intent ?? 'practice',
        masteryStage: stage,
        cycleStage: body.cycleStage ?? cycle.stage,
        hasMisconception: body.hasMisconception ?? false,
        targetDifficulty: body.targetDifficulty,
        learnerContext: body.learnerContext,
        contextVariant,
      },
    });
    await this.relay.drain();

    return {
      format: spec.format,
      difficulty: spec.difficulty,
      rationale: spec.rationale,
      fallbackFormats: spec.fallbackFormats,
      masteryStage: stage,
      cycleStage: body.cycleStage ?? cycle.stage,
      learningObject,
      events: events.map((e) => e.type),
    };
  }

  /** Alimente le bandit contraint : observation empirique du gain de stabilité/minute (§6.5, §8). */
  @Post('format-efficacy')
  async recordFormatEfficacy(@Body() body: FormatEfficacyBody) {
    if (!body.formatType || !body.conceptType || body.stabilityGainPerMinute === undefined) {
      throw new NotFoundException('formatType, conceptType et stabilityGainPerMinute requis.');
    }
    const { stat, events } = await this.recordEfficacy.execute({
      formatType: body.formatType,
      conceptType: body.conceptType,
      stabilityGainPerMinute: body.stabilityGainPerMinute,
    });
    await this.relay.drain();
    return { stat, events: events.map((e) => e.type) };
  }

  @Get('format-efficacy/:formatType/:conceptType')
  async getFormatEfficacy(@Param('formatType') formatType: Format, @Param('conceptType') conceptType: string) {
    const stat = await this.efficacyRepo.get(formatType, conceptType);
    return { stat };
  }
}
