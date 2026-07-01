import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { asId, type LearnerId } from '@unisson/shared-kernel';
import { EnsureLearnerExistsUseCase } from '@unisson/identity';
import {
  GOAL_REPOSITORY_PORT,
  StartGoalUseCase,
  type GoalRepositoryPort,
  type StructuredGoal,
} from '@unisson/learning-engine';

interface CreateGoalBody {
  learnerId?: string;
  statement?: string;
}

@Controller('goals')
export class GoalsController {
  constructor(
    @Inject(StartGoalUseCase) private readonly startGoal: StartGoalUseCase,
    @Inject(GOAL_REPOSITORY_PORT) private readonly goals: GoalRepositoryPort,
    @Inject(EnsureLearnerExistsUseCase) private readonly ensureLearner: EnsureLearnerExistsUseCase,
  ) {}

  @Post()
  async create(@Body() body: CreateGoalBody): Promise<StructuredGoal & { events: string[] }> {
    const learnerId = asId<'LearnerId'>(body.learnerId ?? 'anonymous') as LearnerId;
    await this.ensureLearner.execute({ learnerId });
    const { goal, events } = await this.startGoal.execute({
      learnerId,
      rawStatement: body.statement ?? '',
    });
    return { ...goal, events: events.map((e) => e.type) };
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<StructuredGoal | null> {
    return this.goals.getById(asId<'GoalId'>(id));
  }
}

@Controller('learners/:learnerId/goals')
export class LearnerGoalsController {
  constructor(@Inject(GOAL_REPOSITORY_PORT) private readonly goals: GoalRepositoryPort) {}

  @Get()
  async list(@Param('learnerId') learnerId: string): Promise<StructuredGoal[]> {
    return this.goals.listForLearner(asId<'LearnerId'>(learnerId) as LearnerId);
  }
}
