import { describe, expect, it } from 'vitest';
import {
  asId,
  InMemoryOutbox,
  type GoalId,
  type LearnerId,
  type SkillId,
} from '@unisson/shared-kernel';
import { InMemoryKnowledgeGraphRepository } from '@unisson/knowledge-graph';
import { InMemoryLearnerStateRepository, type MasteryState } from '@unisson/learner-modeling';
import { WeightedGreedyPlanner } from '../domain/planner-strategy';
import { PLANNER_EVENTS } from '../domain/planner-events';
import { InMemoryPlanRepository } from '../adapters/in-memory-plan.repository';
import { CreatePlanUseCase } from './create-plan.usecase';

const goalId = asId<'GoalId'>('goal-1') as GoalId;
const learnerId = asId<'LearnerId'>('learner-1') as LearnerId;
const sentence = asId<'SkillId'>('sentence') as SkillId;

function setup() {
  const graph = new InMemoryKnowledgeGraphRepository();
  const state = new InMemoryLearnerStateRepository();
  const plans = new InMemoryPlanRepository();
  const outbox = new InMemoryOutbox();
  const usecase = new CreatePlanUseCase(graph, state, new WeightedGreedyPlanner(), plans, outbox);
  return { graph, state, plans, outbox, usecase };
}

const masteredState = (conceptId: string): MasteryState => ({
  learnerId,
  conceptId: asId<'ConceptId'>(conceptId),
  pMastery: 0.95,
  stability: 30,
  lastReviewedAt: new Date().toISOString(),
});

describe('CreatePlanUseCase (§6.3)', () => {
  it('calcule le sous-DAG requis (cible + clôture transitive) et l’ordonne', async () => {
    const { usecase, plans, outbox } = setup();

    const { plan, events } = await usecase.execute({
      goalId,
      learnerId,
      domain: 'japanese',
      targetSkills: [sentence],
    });

    // 7 compétences requises (sentence + 6 prérequis transitifs), toutes à acquérir.
    expect(plan.skillOrder).toHaveLength(7);
    const ids = plan.skillOrder.map((s) => s.skillId);
    expect(ids.indexOf(asId<'SkillId'>('hiragana'))).toBeLessThan(ids.indexOf(asId<'SkillId'>('kana-words')));
    expect(ids.indexOf(asId<'SkillId'>('particles'))).toBeLessThan(ids.indexOf(asId<'SkillId'>('sentence')));
    expect(plan.version).toBe(1);
    expect(plan.estimatedEffortMinutes).toBeGreaterThan(0);

    expect(events.map((e) => e.type)).toContain(PLANNER_EVENTS.PlanCreated);
    expect(await plans.getById(plan.id)).not.toBeNull();
    expect(await outbox.pullUnpublished()).toHaveLength(events.length);
  });

  it('soustrait les compétences maîtrisées (concepts au-dessus du seuil)', async () => {
    const { usecase, state } = setup();
    for (const c of ['hiragana-a', 'hiragana-ka', 'hiragana-sa']) await state.saveMastery(masteredState(c));

    const { plan } = await usecase.execute({ goalId, learnerId, domain: 'japanese', targetSkills: [sentence] });

    expect(plan.skillOrder.find((s) => s.skillId === asId<'SkillId'>('hiragana'))).toBeUndefined();
    expect(plan.skillOrder).toHaveLength(6);
  });

  it('détecte l’infaisabilité vs budget et remonte des options', async () => {
    const { usecase } = setup();
    const { plan, events } = await usecase.execute({
      goalId,
      learnerId,
      domain: 'japanese',
      targetSkills: [sentence],
      minutesPerDay: 10,
      horizonDays: 3, // 30 min de budget << effort requis
    });

    expect(plan.assumptions.feasible).toBe(false);
    const infeasible = events.find((e) => e.type === PLANNER_EVENTS.GoalInfeasibleDetected);
    expect(infeasible).toBeTruthy();
    expect((infeasible!.payload as { options: string[] }).options.length).toBeGreaterThan(0);
  });

  it('incrémente la version à chaque re-planification du même objectif', async () => {
    const { usecase } = setup();
    const first = await usecase.execute({ goalId, learnerId, domain: 'japanese', targetSkills: [sentence] });
    const second = await usecase.execute({ goalId, learnerId, domain: 'japanese', targetSkills: [sentence] });
    expect(first.plan.version).toBe(1);
    expect(second.plan.version).toBe(2);
  });
});
