import { describe, it, expect } from 'vitest';
import { asId, InMemoryOutbox, type LearnerId } from '@unisson/shared-kernel';
import { StartGoalUseCase } from './start-goal.usecase';
import type { GoalParserPort, ParsedGoalDraft } from '../ports/goal-parser.port';
import { goalNeedsClarification } from '../domain/structured-goal';
import { InMemoryGoalRepository } from '../adapters/in-memory-goal.repository';
import { GOAL_EVENTS } from '../domain/goal-events';

function parserReturning(draft: ParsedGoalDraft): GoalParserPort {
  return { parse: async () => draft };
}

const learnerId = asId<'LearnerId'>('learner-1') as LearnerId;

function makeUseCase(draft: ParsedGoalDraft) {
  const goals = new InMemoryGoalRepository();
  const outbox = new InMemoryOutbox();
  const useCase = new StartGoalUseCase(parserReturning(draft), goals, outbox);
  return { useCase, goals, outbox };
}

describe('StartGoalUseCase', () => {
  it('construit un objectif structuré à partir du brouillon de l’IA', async () => {
    const { useCase, goals, outbox } = makeUseCase({
      domain: 'japanese',
      targetSkills: ['hiragana', 'vocab-n5'],
      targetLevel: 'N5',
      motivation: 'voyage',
      constraints: { minutesPerDay: 20 },
      confidence: 0.9,
      clarificationsNeeded: [],
    });

    const { goal, events } = await useCase.execute({ learnerId, rawStatement: 'apprendre le japonais' });

    expect(goal.domain).toBe('japanese');
    expect(goal.targetSkills).toContain('hiragana');
    expect(goal.id).toBeTruthy();
    expect(goalNeedsClarification(goal)).toBe(false);

    const stored = await goals.getById(goal.id);
    expect(stored?.id).toBe(goal.id);
    expect(events.map((e) => e.type)).toContain(GOAL_EVENTS.GoalCreated);
    expect((await outbox.pullUnpublished()).length).toBeGreaterThan(0);
  });

  it('force une clarification quand le domaine est inconnu (décision moteur)', async () => {
    const { useCase } = makeUseCase({
      domain: 'unknown',
      targetSkills: [],
      targetLevel: 'unknown',
      constraints: {},
      confidence: 0.8,
      clarificationsNeeded: [],
    });

    const { goal } = await useCase.execute({ learnerId, rawStatement: 'je veux progresser' });

    expect(goal.clarificationsNeeded.length).toBeGreaterThan(0);
    expect(goalNeedsClarification(goal)).toBe(true);
  });

  it('rejette un énoncé vide', async () => {
    const { useCase } = makeUseCase({} as ParsedGoalDraft);
    await expect(useCase.execute({ learnerId, rawStatement: '   ' })).rejects.toThrow();
  });
});
