import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Walking skeleton (§17.4) : prouve le câblage DI de bout en bout à travers
 * apps/api → learning-engine (use-case) → ai-orchestration (adapter + LLM stub).
 */
describe('API (e2e) — walking skeleton', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health répond ok', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /goals traverse le moteur et l’AI Gateway (stub)', async () => {
    const res = await request(app.getHttpServer())
      .post('/goals')
      .send({ learnerId: 'learner-1', statement: 'je veux apprendre le japonais pour voyager' });

    expect(res.status).toBe(201);
    expect(res.body.domain).toBe('japanese');
    expect(res.body.targetSkills).toContain('hiragana');
    expect(res.body.id).toBeTruthy();
  });
});
