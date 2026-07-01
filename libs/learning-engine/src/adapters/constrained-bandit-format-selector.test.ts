import { describe, expect, it } from 'vitest';
import { asId, type ConceptId, type SkillId } from '@unisson/shared-kernel';
import { RuleBasedFormatSelector, type FormatDecisionContext } from '../domain/format-selector';
import { InMemoryFormatEfficacyRepository } from './in-memory-format-efficacy.repository';
import { ConstrainedBanditFormatSelector, type RandomSource } from './constrained-bandit-format-selector';

const ctx: FormatDecisionContext = {
  conceptId: asId<'ConceptId'>('c1') as ConceptId,
  skillId: asId<'SkillId'>('s1') as SkillId,
  conceptType: 'vocab',
  intent: 'practice',
  masteryStage: 'developing', // bande : cloze, recall_production, translation
  hasMisconception: false,
};

const fixedRandom = (...values: number[]): RandomSource => {
  let i = 0;
  return { next: () => values[Math.min(i++, values.length - 1)]! };
};

describe('ConstrainedBanditFormatSelector (approche C, §6.5)', () => {
  it('cold start (aucune stat) → retombe sur le plancher de sécurité B', async () => {
    const efficacy = new InMemoryFormatEfficacyRepository();
    const bandit = new ConstrainedBanditFormatSelector(
      new RuleBasedFormatSelector(),
      efficacy,
      0.15,
      fixedRandom(0.99), // pas d'exploration
    );
    const spec = await bandit.select(ctx);
    expect(spec.format).toBe('cloze'); // premier choix des règles
  });

  it('exploite la meilleure efficacité connue DANS la bande valide (jamais hors bande)', async () => {
    const efficacy = new InMemoryFormatEfficacyRepository();
    await efficacy.recordObservation('cloze', 'vocab', 0.1);
    await efficacy.recordObservation('recall_production', 'vocab', 0.5); // meilleure
    // Un format hors bande (mieux noté ailleurs) ne doit JAMAIS être choisi ici.
    await efficacy.recordObservation('project_task', 'vocab', 0.9);

    const bandit = new ConstrainedBanditFormatSelector(new RuleBasedFormatSelector(), efficacy, 0.15, fixedRandom(0.99));
    const spec = await bandit.select(ctx);
    expect(spec.format).toBe('recall_production');
    expect(['cloze', 'recall_production', 'translation']).toContain(spec.format);
  });

  it('explore avec probabilité ε, mais toujours dans la bande valide', async () => {
    const efficacy = new InMemoryFormatEfficacyRepository();
    // random.next() < epsilon → exploration ; second appel choisit l'index dans la bande.
    const bandit = new ConstrainedBanditFormatSelector(
      new RuleBasedFormatSelector(),
      efficacy,
      0.5,
      fixedRandom(0.01, 0.99),
    );
    const spec = await bandit.select(ctx);
    expect(['cloze', 'recall_production', 'translation']).toContain(spec.format);
    expect(spec.rationale).toContain('exploration');
  });
});
