import { Module } from '@nestjs/common';
import { GOAL_PARSER_PORT, StartGoalUseCase, type GoalParserPort } from '@unisson/learning-engine';
import { AI_GATEWAY, GoalParserAdapter, type AiGateway } from '@unisson/ai-orchestration';
import { GoalsController } from './goals.controller';

/**
 * Composition root du contexte Goal (§17.2). L'`AI_GATEWAY` (cache, réparation, télémétrie,
 * fournisseur réel ou stub) est fourni globalement par `InfraModule` (partagé avec le Format
 * Selector, §6.5) ; changer de fournisseur IA = changer une seule factory, rien d'autre à toucher ici.
 */
@Module({
  controllers: [GoalsController],
  providers: [
    {
      provide: GOAL_PARSER_PORT,
      useFactory: (gateway: AiGateway) => new GoalParserAdapter(gateway),
      inject: [AI_GATEWAY],
    },
    {
      provide: StartGoalUseCase,
      useFactory: (goalParser: GoalParserPort) => new StartGoalUseCase(goalParser),
      inject: [GOAL_PARSER_PORT],
    },
  ],
})
export class GoalsModule {}
