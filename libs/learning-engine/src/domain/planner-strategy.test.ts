import { describe, expect, it } from 'vitest';
import { asId, type SkillId } from '@unisson/shared-kernel';
import { WeightedGreedyPlanner, type PlannerSkillInput } from './planner-strategy';

const sk = (id: string): SkillId => asId<'SkillId'>(id) as SkillId;
const planner = new WeightedGreedyPlanner();

const N5: PlannerSkillInput[] = [
  { skillId: sk('hiragana'), title: 'Hiragana', status: 'to_acquire', estimatedEffortMinutes: 60, prerequisites: [] },
  { skillId: sk('katakana'), title: 'Katakana', status: 'to_acquire', estimatedEffortMinutes: 60, prerequisites: [] },
  { skillId: sk('kana-words'), title: 'Lire des mots en kana', status: 'to_acquire', estimatedEffortMinutes: 40, prerequisites: [sk('hiragana'), sk('katakana')] },
  { skillId: sk('kanji-n5'), title: 'Kanji N5', status: 'to_acquire', estimatedEffortMinutes: 120, prerequisites: [] },
  { skillId: sk('vocab-n5'), title: 'Vocabulaire N5', status: 'to_acquire', estimatedEffortMinutes: 90, prerequisites: [sk('kana-words'), sk('kanji-n5')] },
  { skillId: sk('particles'), title: 'Particules', status: 'to_acquire', estimatedEffortMinutes: 45, prerequisites: [sk('vocab-n5')] },
  { skillId: sk('sentence'), title: 'Construire une phrase', status: 'to_acquire', estimatedEffortMinutes: 60, prerequisites: [sk('particles')] },
];

const idx = (order: { skillId: SkillId }[], id: string) => order.findIndex((s) => s.skillId === sk(id));

describe('WeightedGreedyPlanner (approche B)', () => {
  it('respecte tous les prérequis (ordre topologiquement valide)', () => {
    const order = planner.order({ skills: N5 });
    expect(order).toHaveLength(7);
    expect(idx(order, 'hiragana')).toBeLessThan(idx(order, 'kana-words'));
    expect(idx(order, 'katakana')).toBeLessThan(idx(order, 'kana-words'));
    expect(idx(order, 'kana-words')).toBeLessThan(idx(order, 'vocab-n5'));
    expect(idx(order, 'kanji-n5')).toBeLessThan(idx(order, 'vocab-n5'));
    expect(idx(order, 'vocab-n5')).toBeLessThan(idx(order, 'particles'));
    expect(idx(order, 'particles')).toBeLessThan(idx(order, 'sentence'));
  });

  it('exclut les compétences déjà maîtrisées de l’ordre mais les traite comme satisfaites', () => {
    const withMastered = N5.map((s) =>
      s.skillId === sk('hiragana') || s.skillId === sk('katakana') ? { ...s, status: 'mastered' as const } : s,
    );
    const order = planner.order({ skills: withMastered });
    expect(order.find((s) => s.skillId === sk('hiragana'))).toBeUndefined();
    // kana-words redevient « prêt » car ses prérequis sont maîtrisés.
    expect(order[0]!.skillId).toBe(sk('kana-words'));
  });

  it('priorise les fondations à forte valeur de déblocage et produit un rationale', () => {
    const order = planner.order({ skills: N5 });
    // La 1re compétence servie doit être une fondation sans prérequis (hiragana/katakana/kanji).
    expect(order[0]!.prerequisites).toHaveLength(0);
    expect(order[0]!.rationale.length).toBeGreaterThan(0);
  });

  it('détecte un ensemble non ordonnançable (prérequis en cycle)', () => {
    const cyclic: PlannerSkillInput[] = [
      { skillId: sk('a'), title: 'A', status: 'to_acquire', estimatedEffortMinutes: 30, prerequisites: [sk('b')] },
      { skillId: sk('b'), title: 'B', status: 'to_acquire', estimatedEffortMinutes: 30, prerequisites: [sk('a')] },
    ];
    expect(() => planner.order({ skills: cyclic })).toThrow();
  });
});
