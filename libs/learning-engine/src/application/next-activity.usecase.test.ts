import { beforeEach, describe, expect, it } from 'vitest';
import { asId, InMemoryOutbox, type GoalId, type LearnerId, type SkillId } from '@unisson/shared-kernel';
import { InMemoryKnowledgeGraphRepository } from '@unisson/knowledge-graph';
import {
  FsrsBayesianMasteryModel,
  InMemoryLearnerStateRepository,
  type MasteryState,
} from '@unisson/learner-modeling';
import { WeightedGreedyPlanner } from '../domain/planner-strategy';
import { InMemoryPlanRepository } from '../adapters/in-memory-plan.repository';
import { InMemoryConceptCycleRepository } from '../adapters/in-memory-concept-cycle.repository';
import { AdvanceConceptCycleUseCase } from './advance-concept-cycle.usecase';
import { CreatePlanUseCase } from './create-plan.usecase';
import { NextActivityUseCase } from './next-activity.usecase';

const goalId = asId<'GoalId'>('goal-1') as GoalId;
const learnerId = asId<'LearnerId'>('learner-1') as LearnerId;
const sentence = asId<'SkillId'>('sentence') as SkillId;
const t0 = '2026-01-01T00:00:00.000Z';
const daysLater = (n: number) => new Date(Date.parse(t0) + n * 86_400_000).toISOString();

const graph = new InMemoryKnowledgeGraphRepository();
const model = new FsrsBayesianMasteryModel();
let state: InMemoryLearnerStateRepository;
let plans: InMemoryPlanRepository;
let cycles: InMemoryConceptCycleRepository;

function makeNextActivityUseCase() {
  const cycleResolver = new AdvanceConceptCycleUseCase(cycles, state, model);
  return new NextActivityUseCase(graph, state, model, plans, cycles, cycleResolver);
}

async function makePlan() {
  const planner = new CreatePlanUseCase(graph, state, new WeightedGreedyPlanner(), plans, new InMemoryOutbox());
  const { plan } = await planner.execute({ goalId, learnerId, domain: 'japanese', targetSkills: [sentence] });
  return plan;
}

beforeEach(() => {
  state = new InMemoryLearnerStateRepository();
  plans = new InMemoryPlanRepository();
  cycles = new InMemoryConceptCycleRepository();
});

const saveState = (conceptId: string, over: Partial<MasteryState>): Promise<void> =>
  state.saveMastery({
    learnerId,
    conceptId: asId<'ConceptId'>(conceptId),
    pMastery: 0.9,
    stability: 1,
    lastReviewedAt: t0,
    ...over,
  });

describe('NextActivityUseCase (Sequencer §9)', () => {
  it('sans historique → introduit un nouveau concept de la première compétence du plan', async () => {
    const plan = await makePlan();
    const uc = makeNextActivityUseCase();

    const { activity } = await uc.execute({ learnerId, planId: plan.id, now: t0 });
    expect(activity.kind).toBe('introduce');
    expect(activity.targetDifficulty).toBeGreaterThan(0);
    expect(activity.conceptId).toBeTruthy();
  });

  it('donne la priorité absolue à une révision urgente (mémoire estompée)', async () => {
    const plan = await makePlan();
    await saveState('hiragana-a', { pMastery: 0.9, stability: 1, lastReviewedAt: t0 });
    const uc = makeNextActivityUseCase();

    const { activity } = await uc.execute({ learnerId, planId: plan.id, now: daysLater(60) });
    expect(activity.kind).toBe('review');
    expect(activity.conceptId).toBe(asId<'ConceptId'>('hiragana-a'));
  });

  it('remédie le concept le plus faible quand la compétence de tête est partiellement connue', async () => {
    for (const c of ['katakana-a', 'katakana-ka', 'kanji-ichi', 'kanji-nichi']) {
      await saveState(c, { pMastery: 0.95, stability: 30, lastReviewedAt: daysLater(59) });
    }
    for (const [c, p] of [['hiragana-a', 0.6], ['hiragana-ka', 0.55], ['hiragana-sa', 0.7]] as const) {
      await saveState(c, { pMastery: p, stability: 20, lastReviewedAt: daysLater(59) });
    }
    const plan = await makePlan();
    const uc = makeNextActivityUseCase();

    const { activity } = await uc.execute({ learnerId, planId: plan.id, now: daysLater(59) });
    expect(activity.kind).toBe('remediate');
    expect(activity.skillId).toBe(asId<'SkillId'>('hiragana'));
    expect(activity.conceptId).toBe(asId<'ConceptId'>('hiragana-ka'));
  });
});
