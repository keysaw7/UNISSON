import { describe, expect, it } from 'vitest';
import { asId, type SkillId } from '@unisson/shared-kernel';
import type { PrerequisiteEdge } from './concept';
import { hasCycle, topologicalOrder, transitivePrerequisites } from './graph-algorithms';
import { N5_PREREQUISITES, N5_SKILLS } from './japanese-n5';

const sk = (id: string): SkillId => asId<'SkillId'>(id) as SkillId;
const skillIds = N5_SKILLS.map((s) => s.id);

const before = (order: SkillId[], a: string, b: string): boolean =>
  order.indexOf(sk(a)) < order.indexOf(sk(b));

describe('Algorithmes de graphe — Japonais N5', () => {
  it('le tri topologique respecte tous les prérequis', () => {
    const order = topologicalOrder(skillIds, N5_PREREQUISITES);
    expect(order).toHaveLength(N5_SKILLS.length);
    expect(before(order, 'hiragana', 'kana-words')).toBe(true);
    expect(before(order, 'katakana', 'kana-words')).toBe(true);
    expect(before(order, 'kana-words', 'vocab-n5')).toBe(true);
    expect(before(order, 'kanji-n5', 'vocab-n5')).toBe(true);
    expect(before(order, 'vocab-n5', 'particles')).toBe(true);
    expect(before(order, 'particles', 'sentence')).toBe(true);
  });

  it('la fermeture transitive remonte toute la chaîne de prérequis', () => {
    const deps = transitivePrerequisites(sk('sentence'), N5_PREREQUISITES);
    expect(new Set(deps)).toEqual(
      new Set([sk('particles'), sk('vocab-n5'), sk('kana-words'), sk('kanji-n5'), sk('hiragana'), sk('katakana')]),
    );
    expect(transitivePrerequisites(sk('hiragana'), N5_PREREQUISITES)).toEqual([]);
  });

  it('le graphe N5 est un DAG (aucun cycle)', () => {
    expect(hasCycle(skillIds, N5_PREREQUISITES)).toBe(false);
  });

  it('détecte un cycle introduit artificiellement', () => {
    const cyclic: PrerequisiteEdge[] = [
      { skillId: sk('a'), requiresSkillId: sk('b'), strength: 1 },
      { skillId: sk('b'), requiresSkillId: sk('c'), strength: 1 },
      { skillId: sk('c'), requiresSkillId: sk('a'), strength: 1 },
    ];
    expect(hasCycle([sk('a'), sk('b'), sk('c')], cyclic)).toBe(true);
    expect(() => topologicalOrder([sk('a'), sk('b'), sk('c')], cyclic)).toThrow(/[Cc]ycle/);
  });
});
