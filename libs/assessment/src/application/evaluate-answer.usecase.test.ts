import { describe, expect, it } from 'vitest';
import { asId, InMemoryOutbox, type LearnerId } from '@unisson/shared-kernel';
import { ASSESSMENT_EVENTS } from '../domain/assessment-events';
import { InMemoryMisconceptionCatalog } from '../adapters/in-memory-misconception-catalog';
import { RuleBasedGradingStrategy } from '../adapters/rule-based-grading.strategy';
import { EvaluateAnswerUseCase } from './evaluate-answer.usecase';

const learnerId = asId<'LearnerId'>('learner-1') as LearnerId;

function setup() {
  const outbox = new InMemoryOutbox();
  const usecase = new EvaluateAnswerUseCase(new RuleBasedGradingStrategy(), new InMemoryMisconceptionCatalog(), outbox);
  return { outbox, usecase };
}

describe('EvaluateAnswerUseCase (§6.4)', () => {
  it('bonne réponse exacte → AnswerEvaluated + évidence correcte alimentant la maîtrise', async () => {
    const { usecase, outbox } = setup();
    const { evidence, events } = await usecase.execute({
      learnerId,
      activityId: 'act-1',
      activityType: 'exact',
      expected: 'a',
      learnerAnswer: 'A',
      conceptsCovered: ['hiragana-a'],
    });

    expect(evidence.correct).toBe(true);
    expect(evidence.errorType).toBe('correct');
    expect(events.map((e) => e.type)).toEqual([ASSESSMENT_EVENTS.AnswerEvaluated]);
    expect(await outbox.pullUnpublished()).toHaveLength(1);
  });

  it('détecte une misconception connue (は/が) et l’attribue au bon concept', async () => {
    const { usecase } = setup();
    const { evidence, events } = await usecase.execute({
      learnerId,
      activityId: 'act-2',
      activityType: 'exact',
      expected: 'は',
      learnerAnswer: 'が',
      conceptsCovered: ['particle-wa'],
    });

    expect(evidence.correct).toBe(false);
    expect(evidence.errorType).toBe('misconception');
    expect(evidence.attributedConcept).toBe(asId<'ConceptId'>('particle-wa'));
    const types = events.map((e) => e.type);
    expect(types).toContain(ASSESSMENT_EVENTS.MisconceptionDetected);
  });

  it('erreur très rapide sans misconception → slip (SlipDetected), preuve peu pénalisante', async () => {
    const { usecase } = setup();
    const { evidence, events } = await usecase.execute({
      learnerId,
      activityId: 'act-3',
      activityType: 'exact',
      expected: 'a',
      learnerAnswer: 'i',
      conceptsCovered: ['hiragana-a'],
      signals: { latencyMs: 600 },
    });

    expect(evidence.errorType).toBe('slip');
    expect(evidence.evidenceWeight).toBeLessThan(0.5);
    expect(events.map((e) => e.type)).toContain(ASSESSMENT_EVENTS.SlipDetected);
  });

  it('réponse courte avec faute de frappe → correcte (fuzzy)', async () => {
    const { usecase } = setup();
    const { evidence } = await usecase.execute({
      learnerId,
      activityId: 'act-4',
      activityType: 'short_answer',
      expected: 'arigatou',
      learnerAnswer: 'arigato',
      conceptsCovered: ['vocab-neko'],
    });
    expect(evidence.correct).toBe(true);
  });
});
