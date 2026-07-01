import { Module } from '@nestjs/common';
import { GOAL_PARSER_PORT, StartGoalUseCase, type GoalParserPort } from '@unisson/learning-engine';
import { GoalParserAdapter, LLM_PORT, type LLMPort } from '@unisson/ai-orchestration';
import { GoalsController } from './goals.controller';

/**
 * Composition root du contexte Goal (§17.2). Le `LLM_PORT` est fourni globalement par
 * `InfraModule` (partagé avec le Format Selector, §6.5) ; changer de fournisseur IA = changer
 * son `useClass`, rien d'autre à toucher ici.
 */
@Module({
  controllers: [GoalsController],
  providers: [
    {
      provide: GOAL_PARSER_PORT,
      useFactory: (llm: LLMPort) => new GoalParserAdapter(llm),
      inject: [LLM_PORT],
    },
    {
      provide: StartGoalUseCase,
      useFactory: (goalParser: GoalParserPort) => new StartGoalUseCase(goalParser),
      inject: [GOAL_PARSER_PORT],
    },
  ],
})
export class GoalsModule {}
