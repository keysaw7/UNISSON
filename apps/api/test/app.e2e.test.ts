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

  it('GET /graph/skills/:id/prerequisites renvoie la fermeture transitive (N5)', async () => {
    const res = await request(app.getHttpServer()).get('/graph/skills/sentence/prerequisites');
    expect(res.status).toBe(200);
    expect(res.body.skill.title).toBe('Construire une phrase');
    expect(res.body.transitive).toContain('hiragana');
    expect(res.body.transitive).toHaveLength(6);
  });

  it('POST /learners/:id/evidence met à jour la maîtrise et émet des événements', async () => {
    const res = await request(app.getHttpServer())
      .post('/learners/learner-1/evidence')
      .send({ conceptId: 'hiragana-a', correct: true });

    expect(res.status).toBe(201);
    expect(res.body.state.pMastery).toBeGreaterThan(0);
    expect(res.body.events).toContain('MasteryUpdated');

    const read = await request(app.getHttpServer()).get('/learners/learner-1/mastery/hiragana-a');
    expect(read.status).toBe(200);
    expect(read.body.state.pMastery).toBeCloseTo(res.body.state.pMastery, 6);
    expect(read.body.stage).toBeTruthy();
  });

  it('POST /learners/:id/plan planifie le sous-DAG N5 et GET next-activity propose une activité', async () => {
    const created = await request(app.getHttpServer())
      .post('/learners/learner-2/plan')
      .send({ targetSkills: ['sentence'], motivation: 'voyage' });

    expect(created.status).toBe(201);
    expect(created.body.plan.skillOrder).toHaveLength(7);
    expect(created.body.events).toContain('PlanCreated');
    const planId = created.body.plan.id;

    const fetched = await request(app.getHttpServer()).get(`/plans/${planId}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.id).toBe(planId);

    const next = await request(app.getHttpServer()).get(`/learners/learner-2/plans/${planId}/next-activity`);
    expect(next.status).toBe(200);
    expect(['introduce', 'remediate', 'review']).toContain(next.body.activity.kind);
    expect(next.body.activity.rationale).toBeTruthy();
  });

  it('POST /learners/:id/answers ferme la boucle : correction → évidence → maîtrise', async () => {
    const res = await request(app.getHttpServer())
      .post('/learners/learner-3/answers')
      .send({
        activityId: 'act-e2e-1',
        activityType: 'exact',
        expected: 'a',
        learnerAnswer: 'a',
        conceptsCovered: ['hiragana-a'],
      });

    expect(res.status).toBe(201);
    expect(res.body.evidence.correct).toBe(true);
    expect(res.body.evidence.errorType).toBe('correct');
    expect(res.body.events).toContain('AnswerEvaluated');
    expect(res.body.events).toContain('MasteryUpdated');
    expect(res.body.state.pMastery).toBeGreaterThan(0);

    const read = await request(app.getHttpServer()).get('/learners/learner-3/mastery/hiragana-a');
    expect(read.body.state.pMastery).toBeCloseTo(res.body.state.pMastery, 6);
  });

  it('POST /learners/:id/answers détecte une misconception connue (は/が) et l’attribue', async () => {
    const res = await request(app.getHttpServer())
      .post('/learners/learner-3/answers')
      .send({
        activityId: 'act-e2e-2',
        activityType: 'exact',
        expected: 'は',
        learnerAnswer: 'が',
        conceptsCovered: ['particle-wa'],
      });

    expect(res.status).toBe(201);
    expect(res.body.evidence.correct).toBe(false);
    expect(res.body.evidence.errorType).toBe('misconception');
    expect(res.body.evidence.attributedConcept).toBe('particle-wa');
    expect(res.body.events).toContain('MisconceptionDetected');
  });
});
