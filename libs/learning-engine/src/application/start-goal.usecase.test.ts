import { describe, it, expect } from 'vitest';
import { asId, type LearnerId } from '@unisson/shared-kernel';
import { StartGoalUseCase } from './start-goal.usecase';
import type { GoalParserPort, ParsedGoalDraft } from '../ports/goal-parser.port';
import { goalNeedsClarification } from '../domain/structured-goal';

function parserReturning(draft: ParsedGoalDraft): GoalParserPort {
  return { parse: async () => draft };
}

const learnerId = asId<'LearnerId'>('learner-1') as LearnerId;

describe('StartGoalUseCase', () => {
  it('construit un objectif structuré à partir du brouillon de l’IA', async () => {
    const useCase = new StartGoalUseCase(
      parserReturning({
        domain: 'japanese',
        targetSkills: ['hiragana', 'vocab-n5'],
        targetLevel: 'N5',
        motivation: 'voyage',
        constraints: { minutesPerDay: 20 },
        confidence: 0.9,
        clarificationsNeeded: [],
      }),
    );

    const goal = await useCase.execute({ learnerId, rawStatement: 'apprendre le japonais' });

    expect(goal.domain).toBe('japanese');
    expect(goal.targetSkills).toContain('hiragana');
    expect(goal.id).toBeTruthy();
    expect(goalNeedsClarification(goal)).toBe(false);
  });

  it('force une clarification quand le domaine est inconnu (décision moteur)', async () => {
    const useCase = new StartGoalUseCase(
      parserReturning({
        domain: 'unknown',
        targetSkills: [],
        targetLevel: 'unknown',
        constraints: {},
        confidence: 0.8,
        clarificationsNeeded: [],
      }),
    );

    const goal = await useCase.execute({ learnerId, rawStatement: 'je veux progresser' });

    expect(goal.clarificationsNeeded.length).toBeGreaterThan(0);
    expect(goalNeedsClarification(goal)).toBe(true);
  });

  it('rejette un énoncé vide', async () => {
    const useCase = new StartGoalUseCase(parserReturning({} as ParsedGoalDraft));
    await expect(useCase.execute({ learnerId, rawStatement: '   ' })).rejects.toThrow();
  });
});
