import { Module } from '@nestjs/common';
import { GOAL_PARSER_PORT, StartGoalUseCase, type GoalParserPort } from '@unisson/learning-engine';
import { GoalParserAdapter, LLM_PORT, StubLlmAdapter, type LLMPort } from '@unisson/ai-orchestration';
import { GoalsController } from './goals.controller';

/**
 * Composition root du contexte Goal (§17.2). C'est LE seul endroit qui connaît les
 * implémentations concrètes : on lie ici les ports du domaine aux adapters d'infra.
 * Changer de fournisseur IA = changer `useClass` du LLM_PORT, rien d'autre.
 */
@Module({
  controllers: [GoalsController],
  providers: [
    { provide: LLM_PORT, useClass: StubLlmAdapter },
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
