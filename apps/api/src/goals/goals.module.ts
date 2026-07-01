import { Module } from '@nestjs/common';
import {
  GOAL_PARSER_PORT,
  GOAL_REPOSITORY_PORT,
  StartGoalUseCase,
  type GoalParserPort,
  type GoalRepositoryPort,
} from '@unisson/learning-engine';
import { AI_GATEWAY, GoalParserAdapter, type AiGateway } from '@unisson/ai-orchestration';
import type { OutboxPort } from '@unisson/shared-kernel';
import { INFRA } from '../infra/infra.module';
import { GoalsController, LearnerGoalsController } from './goals.controller';

/**
 * Composition root du contexte Goal (§17.2). L'`AI_GATEWAY` (cache, réparation, télémétrie,
 * fournisseur réel ou stub) est fourni globalement par `InfraModule` (partagé avec le Format
 * Selector, §6.5) ; changer de fournisseur IA = changer une seule factory, rien d'autre à toucher ici.
 */
@Module({
  controllers: [GoalsController, LearnerGoalsController],
  providers: [
    {
      provide: GOAL_PARSER_PORT,
      useFactory: (gateway: AiGateway) => new GoalParserAdapter(gateway),
      inject: [AI_GATEWAY],
    },
    {
      provide: StartGoalUseCase,
      useFactory: (goalParser: GoalParserPort, goals: GoalRepositoryPort, outbox: OutboxPort) =>
        new StartGoalUseCase(goalParser, goals, outbox),
      inject: [GOAL_PARSER_PORT, GOAL_REPOSITORY_PORT, INFRA.Outbox],
    },
  ],
})
export class GoalsModule {}
