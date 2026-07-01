import { Module } from '@nestjs/common';
import { GraphController } from './graph.controller';
import { LearnersController } from './learners.controller';
import { PlansController } from './plans.controller';

/**
 * Endpoints du Learning Engine : graphe (N5), boucle de maîtrise (Phase 1), planification et
 * séquençage (Phase 2). Les dépendances proviennent de `InfraModule` (@Global).
 */
@Module({
  controllers: [GraphController, LearnersController, PlansController],
})
export class EngineModule {}
