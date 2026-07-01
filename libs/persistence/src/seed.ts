import { JAPANESE_N5_SEED, type KnowledgeGraphSeed } from '@unisson/knowledge-graph';
import type { Db } from './client';
import { concept, skill, skillConcept, skillPrerequisite } from './schema';

/** Charge un graphe (par défaut Japonais N5) dans Postgres. Idempotent (onConflictDoNothing). */
export async function seedKnowledgeGraph(db: Db, seed: KnowledgeGraphSeed = JAPANESE_N5_SEED): Promise<void> {
  await db
    .insert(skill)
    .values(seed.skills.map((s) => ({ id: s.id, title: s.title, domain: s.domain })))
    .onConflictDoNothing({ target: skill.id });

  await db
    .insert(concept)
    .values(seed.concepts.map((c) => ({ id: c.id, type: c.type, payload: c.payload, difficulty: c.difficulty })))
    .onConflictDoNothing({ target: concept.id });

  await db
    .insert(skillPrerequisite)
    .values(
      seed.prerequisites.map((e) => ({
        skillId: e.skillId,
        requiresSkillId: e.requiresSkillId,
        strength: e.strength,
      })),
    )
    .onConflictDoNothing({ target: [skillPrerequisite.skillId, skillPrerequisite.requiresSkillId] });

  await db
    .insert(skillConcept)
    .values(seed.skillConcepts.map((sc) => ({ skillId: sc.skillId, conceptId: sc.conceptId })))
    .onConflictDoNothing({ target: [skillConcept.skillId, skillConcept.conceptId] });
}
