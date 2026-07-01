import { Body, Controller, Get, Inject, NotFoundException, Param, Post } from '@nestjs/common';
import { asId, makeId, type GoalId, type LearnerId, type OutboxRelay, type PlanId, type SkillId } from '@unisson/shared-kernel';
import {
  CreatePlanUseCase,
  NextActivityUseCase,
  PLAN_REPOSITORY_PORT,
  type PlanRepositoryPort,
} from '@unisson/learning-engine';
import { INFRA } from '../infra/infra.module';

interface CreatePlanBody {
  goalId?: string;
  domain?: string;
  targetSkills?: string[];
  motivation?: string;
  minutesPerDay?: number;
  horizonDays?: number;
  correlationId?: string;
}

@Controller()
export class PlansController {
  constructor(
    @Inject(CreatePlanUseCase) private readonly createPlan: CreatePlanUseCase,
    @Inject(NextActivityUseCase) private readonly nextActivity: NextActivityUseCase,
    @Inject(PLAN_REPOSITORY_PORT) private readonly plans: PlanRepositoryPort,
    @Inject(INFRA.OutboxRelay) private readonly relay: OutboxRelay,
  ) {}

  /** Construit un plan à partir des compétences cibles (§6.3). */
  @Post('learners/:learnerId/plan')
  async create(@Param('learnerId') learnerIdRaw: string, @Body() body: CreatePlanBody) {
    if (!body.targetSkills?.length) throw new NotFoundException('targetSkills requis.');
    const learnerId = asId<'LearnerId'>(learnerIdRaw) as LearnerId;
    const goalId = asId<'GoalId'>(body.goalId ?? (makeId<'GoalId'>() as string)) as GoalId;

    const { plan, events } = await this.createPlan.execute({
      goalId,
      learnerId,
      domain: body.domain ?? 'japanese',
      targetSkills: body.targetSkills.map((s) => asId<'SkillId'>(s) as SkillId),
      motivation: body.motivation,
      minutesPerDay: body.minutesPerDay,
      horizonDays: body.horizonDays,
      correlationId: body.correlationId,
    });
    await this.relay.drain();
    return { plan, events: events.map((e) => e.type) };
  }

  @Get('plans/:planId')
  async getPlan(@Param('planId') planIdRaw: string) {
    const plan = await this.plans.getById(asId<'PlanId'>(planIdRaw) as PlanId);
    if (!plan) throw new NotFoundException(`Plan introuvable: ${planIdRaw}`);
    return plan;
  }

  /** Liste les plans d'un apprenant (le plus récent en premier) — retrouver le plan actif après rechargement. */
  @Get('learners/:learnerId/plans')
  async listForLearner(@Param('learnerId') learnerIdRaw: string) {
    const learnerId = asId<'LearnerId'>(learnerIdRaw) as LearnerId;
    const plans = await this.plans.listForLearner(learnerId);
    return [...plans].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Sequencer : quelle activité maintenant ? (§9) */
  @Get('learners/:learnerId/plans/:planId/next-activity')
  async next(@Param('learnerId') learnerIdRaw: string, @Param('planId') planIdRaw: string) {
    const learnerId = asId<'LearnerId'>(learnerIdRaw) as LearnerId;
    const planId = asId<'PlanId'>(planIdRaw) as PlanId;
    if (!(await this.plans.getById(planId))) throw new NotFoundException(`Plan introuvable: ${planIdRaw}`);
    return this.nextActivity.execute({ learnerId, planId });
  }
}
