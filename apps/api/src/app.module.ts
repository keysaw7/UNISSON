import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { GoalsModule } from './goals/goals.module';

@Module({
  imports: [GoalsModule],
  controllers: [HealthController],
})
export class AppModule {}
