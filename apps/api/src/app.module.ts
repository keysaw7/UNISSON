import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { GoalsModule } from './goals/goals.module';
import { InfraModule } from './infra/infra.module';
import { EngineModule } from './engine/engine.module';

@Module({
  imports: [InfraModule, GoalsModule, EngineModule],
  controllers: [HealthController],
})
export class AppModule {}
