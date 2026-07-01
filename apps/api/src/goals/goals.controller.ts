import { Body, Controller, Inject, Post } from '@nestjs/common';
import { asId, type LearnerId } from '@unisson/shared-kernel';
import { StartGoalUseCase, type StructuredGoal } from '@unisson/learning-engine';

interface CreateGoalBody {
  learnerId?: string;
  statement?: string;
}

@Controller('goals')
export class GoalsController {
  constructor(@Inject(StartGoalUseCase) private readonly startGoal: StartGoalUseCase) {}

  @Post()
  async create(@Body() body: CreateGoalBody): Promise<StructuredGoal> {
    const learnerId = asId<'LearnerId'>(body.learnerId ?? 'anonymous') as LearnerId;
    return this.startGoal.execute({
      learnerId,
      rawStatement: body.statement ?? '',
    });
  }
}
