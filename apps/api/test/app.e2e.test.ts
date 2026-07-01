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
    expect(res.body.events).toContain('GoalCreated');

    const fetched = await request(app.getHttpServer()).get(`/goals/${res.body.id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.id).toBe(res.body.id);

    const listed = await request(app.getHttpServer()).get('/learners/learner-1/goals');
    expect(listed.status).toBe(200);
    expect(listed.body.some((g: { id: string }) => g.id === res.body.id)).toBe(true);
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

    const listed = await request(app.getHttpServer()).get('/learners/learner-2/plans');
    expect(listed.status).toBe(200);
    expect(listed.body.some((p: { id: string }) => p.id === planId)).toBe(true);
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

  it('Diagnostic adaptatif : démarre, converge et sème les priors dans la maîtrise', async () => {
    const started = await request(app.getHttpServer())
      .post('/learners/learner-4/diagnostic')
      .send({ domain: 'japanese', targetSkills: ['sentence'], declaredLevel: 'novice', budget: 12 });

    expect(started.status).toBe(201);
    expect(started.body.done).toBe(false);
    expect(started.body.nextProbe.conceptId).toBeTruthy();
    expect(started.body.events).toContain('DiagnosticStarted');

    const sessionId = started.body.sessionId;
    let probe = started.body.nextProbe;
    let last: request.Response | null = null;
    let guard = 0;

    while (probe && guard < 20) {
      last = await request(app.getHttpServer())
        .post(`/learners/learner-4/diagnostic/${sessionId}`)
        .send({ conceptId: probe.conceptId, correct: true });
      expect(last.status).toBe(201);
      probe = last.body.nextProbe;
      guard += 1;
    }

    expect(last).not.toBeNull();
    expect(last!.body.done).toBe(true);
    expect(last!.body.priors.length).toBeGreaterThan(0);
    expect(last!.body.seededConcepts).toBeGreaterThan(0);
    expect(last!.body.events).toContain('InitialStateEstimated');

    // Le prior est bien visible comme état de maîtrise initial.
    const mastery = await request(app.getHttpServer()).get('/learners/learner-4/mastery/hiragana-a');
    expect(mastery.status).toBe(200);
    expect(mastery.body.state.pMastery).toBeGreaterThan(0);
  });

  it('POST /learners/:id/diagnostic/:sessionId → 404 si session inconnue', async () => {
    const res = await request(app.getHttpServer())
      .post('/learners/learner-4/diagnostic/does-not-exist')
      .send({ conceptId: 'hiragana-a', correct: true });
    expect(res.status).toBe(404);
  });

  it('Format Selector : choisit un format pédagogiquement valide et génère le contenu (AI Gateway)', async () => {
    const res = await request(app.getHttpServer())
      .post('/learners/learner-5/format')
      .send({ conceptId: 'hiragana-a', skillId: 'hiragana', conceptType: 'kana', intent: 'introduce' });

    expect(res.status).toBe(201);
    expect(['activation_probe', 'explanation', 'worked_example']).toContain(res.body.format);
    expect(res.body.learningObject.format).toBe(res.body.format);
    expect(res.body.learningObject.contentRef).toContain(res.body.format);
    expect(res.body.events).toContain('FormatSelected');
  });

  it('Format Selector : une misconception force la remédiation contrastive', async () => {
    const res = await request(app.getHttpServer())
      .post('/learners/learner-5/format')
      .send({ conceptId: 'particle-wa', skillId: 'sentence', conceptType: 'grammar', hasMisconception: true });
    expect(res.status).toBe(201);
    expect(res.body.format).toBe('contrastive_remediation');
  });

  it('POST /format-efficacy alimente le bandit, GET renvoie la moyenne agrégée', async () => {
    const rec = await request(app.getHttpServer())
      .post('/format-efficacy')
      .send({ formatType: 'cloze', conceptType: 'grammar', stabilityGainPerMinute: 0.3 });
    expect(rec.status).toBe(201);
    expect(rec.body.stat.observations).toBe(1);
    expect(rec.body.events).toContain('FormatEfficacyRecorded');

    const read = await request(app.getHttpServer()).get('/format-efficacy/cloze/grammar');
    expect(read.status).toBe(200);
    expect(read.body.stat.stabilityGainPerMinute).toBeCloseTo(0.3, 5);
  });

  it('Second domaine pilote (Espagnol A1) : goal → plan → next-activity sans code métier spécifique', async () => {
    const goal = await request(app.getHttpServer())
      .post('/goals')
      .send({ learnerId: 'spanish-learner', statement: 'je veux apprendre l’espagnol pour voyager' });
    expect(goal.status).toBe(201);
    expect(goal.body.domain).toBe('spanish');
    expect(goal.body.targetSkills).toContain('greetings');

    const plan = await request(app.getHttpServer())
      .post('/learners/spanish-learner/plan')
      .send({
        goalId: goal.body.id,
        targetSkills: ['basic-conversation'],
        motivation: 'voyage',
        domain: 'spanish',
      });
    expect(plan.status).toBe(201);
    expect(plan.body.plan.skillOrder.length).toBe(5);

    const next = await request(app.getHttpServer()).get(
      `/learners/spanish-learner/plans/${plan.body.plan.id}/next-activity`,
    );
    expect(next.status).toBe(200);
    expect(next.body.activity.kind).toBeTruthy();
  });
});
