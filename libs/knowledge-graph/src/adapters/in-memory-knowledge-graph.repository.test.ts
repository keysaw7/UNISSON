import { describe, expect, it } from 'vitest';
import { asId, type SkillId } from '@unisson/shared-kernel';
import { InMemoryKnowledgeGraphRepository } from './in-memory-knowledge-graph.repository';

const sk = (id: string): SkillId => asId<'SkillId'>(id) as SkillId;
const repo = new InMemoryKnowledgeGraphRepository();

describe('InMemoryKnowledgeGraphRepository (seed N5)', () => {
  it('récupère une compétence et ses prérequis directs', async () => {
    expect((await repo.getSkill(sk('vocab-n5')))?.title).toBe('Vocabulaire N5');
    const direct = await repo.getPrerequisites(sk('vocab-n5'));
    expect(new Set(direct.map((e) => e.requiresSkillId))).toEqual(new Set([sk('kana-words'), sk('kanji-n5')]));
  });

  it('expose la fermeture transitive (équivalent recursive CTE)', async () => {
    const ids = await repo.getTransitivePrerequisiteIds(sk('sentence'));
    expect(ids).toContain(sk('hiragana'));
    expect(ids).toContain(sk('kanji-n5'));
    expect(ids).toHaveLength(6);
  });

  it('liste les concepts (KC) rattachés à une compétence', async () => {
    const concepts = await repo.getConceptsForSkill(sk('hiragana'));
    expect(concepts).toHaveLength(3);
    expect(concepts.every((c) => c.type === 'kana')).toBe(true);
  });

  it('filtre les compétences par domaine', async () => {
    expect(await repo.listSkills('japanese')).toHaveLength(7);
    expect(await repo.listSkills('cooking')).toHaveLength(0);
  });
});
