import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { applySecurityMiddleware } from './infra/security.middleware';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  applySecurityMiddleware(app);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'api.started', port }));
}

void bootstrap();
