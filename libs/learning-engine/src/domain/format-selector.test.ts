import { describe, expect, it } from 'vitest';
import { asId, type ConceptId, type SkillId } from '@unisson/shared-kernel';
import { RuleBasedFormatSelector, type FormatDecisionContext } from './format-selector';

const baseCtx = (over: Partial<FormatDecisionContext> = {}): FormatDecisionContext => ({
  conceptId: asId<'ConceptId'>('c1') as ConceptId,
  skillId: asId<'SkillId'>('s1') as SkillId,
  conceptType: 'vocab',
  intent: 'practice',
  masteryStage: 'developing',
  hasMisconception: false,
  ...over,
});

describe('RuleBasedFormatSelector (approche B, §6.5)', () => {
  it('respecte la progression pédagogique par stade (unknown → exposition, mastered → application)', async () => {
    const selector = new RuleBasedFormatSelector();
    const unknown = await selector.select(baseCtx({ masteryStage: 'unknown' }));
    expect(['explanation', 'worked_example']).toContain(unknown.format);

    const mastered = await selector.select(baseCtx({ masteryStage: 'mastered' }));
    expect(['project_task', 'dialogue_socratic', 'spaced_review']).toContain(mastered.format);
  });

  it('une misconception détectée force la remédiation contrastive en tête', async () => {
    const selector = new RuleBasedFormatSelector();
    const spec = await selector.select(baseCtx({ hasMisconception: true, masteryStage: 'proficient' }));
    expect(spec.format).toBe('contrastive_remediation');
    expect(spec.rationale).toContain('remédiation');
  });

  it('l’intention « review » priorise la révision espacée, jamais « rappel avant exposition »', async () => {
    const selector = new RuleBasedFormatSelector();
    const spec = await selector.select(baseCtx({ intent: 'review', masteryStage: 'developing' }));
    expect(spec.format).toBe('spaced_review');
  });

  it('faisabilité : speaking exclu sans micro, formats courts si peu de temps', async () => {
    const selector = new RuleBasedFormatSelector();
    const noMic = await selector.select(
      baseCtx({ intent: 'apply', masteryStage: 'mastered', learnerContext: { capabilities: { mic: false, camera: true } } }),
    );
    expect(noMic.format).not.toBe('speaking');

    const shortOnTime = await selector.select(
      baseCtx({ masteryStage: 'developing', learnerContext: { availableMinutes: 2 } }),
    );
    expect(['flashcard_recognition', 'mcq', 'cloze']).toContain(shortOnTime.format);
  });

  it('variété : déprioritise (sans l’éliminer) le format juste servi', async () => {
    const selector = new RuleBasedFormatSelector();
    const spec = await selector.select(
      baseCtx({ masteryStage: 'developing', learnerContext: { recentFormats: ['cloze'] } }),
    );
    expect(spec.format).not.toBe('cloze');
    expect([spec.format, ...spec.fallbackFormats]).toContain('cloze'); // jamais éliminé, juste déprioritisé
  });

  it('la bande valide n’est jamais vide même avec des contraintes fortes', async () => {
    const selector = new RuleBasedFormatSelector();
    const spec = await selector.select(
      baseCtx({
        masteryStage: 'mastered',
        intent: 'apply',
        learnerContext: { fatigueLevel: 0.9, availableMinutes: 1, capabilities: { mic: false, camera: false } },
      }),
    );
    expect(spec.format).toBeTruthy();
  });

  it('utilise la difficulté cible fournie par le Sequencer si présente', async () => {
    const selector = new RuleBasedFormatSelector();
    const spec = await selector.select(baseCtx({ targetDifficulty: 0.42 }));
    expect(spec.difficulty).toBe(0.42);
  });
});
