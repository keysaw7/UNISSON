import { describe, expect, it } from 'vitest';
import { asId, type ConceptId, type SkillId } from '@unisson/shared-kernel';
import { RuleBasedFormatSelector, type FormatDecisionContext } from './format-selector';

const baseCtx = (over: Partial<FormatDecisionContext> = {}): FormatDecisionContext => ({
  conceptId: asId<'ConceptId'>('c1') as ConceptId,
  skillId: asId<'SkillId'>('s1') as SkillId,
  conceptType: 'vocab',
  intent: 'practice',
  masteryStage: 'developing',
  cycleStage: 'freePractice',
  hasMisconception: false,
  ...over,
});

describe('RuleBasedFormatSelector (approche B, §6.5 + cycle PEDAGOG)', () => {
  it('respecte la progression pédagogique par cycle (exposition → rappel → génération)', async () => {
    const selector = new RuleBasedFormatSelector();
    const exposure = await selector.select(baseCtx({ cycleStage: 'exposure' }));
    expect(['explanation', 'worked_example']).toContain(exposure.format);

    const activeRecall = await selector.select(baseCtx({ cycleStage: 'activeRecall' }));
    expect(['recall_production', 'cloze', 'mcq']).toContain(activeRecall.format);

    const transfer = await selector.select(baseCtx({ cycleStage: 'generationTransfer' }));
    expect(['generation_exercise', 'transfer_probe', 'project_task']).toContain(transfer.format);
  });

  it('une misconception détectée force la remédiation contrastive en tête', async () => {
    const selector = new RuleBasedFormatSelector();
    const spec = await selector.select(baseCtx({ hasMisconception: true, cycleStage: 'freePractice' }));
    expect(spec.format).toBe('contrastive_remediation');
    expect(spec.rationale).toContain('remédiation');
  });

  it('l’étape consolidation priorise la révision espacée', async () => {
    const selector = new RuleBasedFormatSelector();
    const spec = await selector.select(baseCtx({ cycleStage: 'consolidation' }));
    expect(spec.format).toBe('spaced_review');
  });

  it('faisabilité : formats courts si peu de temps', async () => {
    const selector = new RuleBasedFormatSelector();
    const shortOnTime = await selector.select(
      baseCtx({ cycleStage: 'guidedPractice', learnerContext: { availableMinutes: 2 } }),
    );
    expect(['flashcard_recognition', 'mcq', 'cloze']).toContain(shortOnTime.format);
  });

  it('variété : déprioritise (sans l’éliminer) le format juste servi', async () => {
    const selector = new RuleBasedFormatSelector();
    const spec = await selector.select(
      baseCtx({ cycleStage: 'freePractice', learnerContext: { recentFormats: ['cloze'] } }),
    );
    expect(spec.format).not.toBe('cloze');
    expect([spec.format, ...spec.fallbackFormats]).toContain('cloze'); // jamais éliminé, juste déprioritisé
  });

  it('la bande valide n’est jamais vide', async () => {
    const selector = new RuleBasedFormatSelector();
    const spec = await selector.select(
      baseCtx({
        cycleStage: 'generationTransfer',
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
