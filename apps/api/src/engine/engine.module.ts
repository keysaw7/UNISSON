import { Module } from '@nestjs/common';
import { GraphController } from './graph.controller';
import { LearnersController } from './learners.controller';

/**
 * Endpoints du Learning Engine (Phase 1) : graphe de connaissances (N5) et boucle de maîtrise.
 * Les dépendances (repos, modèle, outbox, relais) proviennent de `InfraModule` (@Global).
 */
@Module({
  controllers: [GraphController, LearnersController],
})
export class EngineModule {}
