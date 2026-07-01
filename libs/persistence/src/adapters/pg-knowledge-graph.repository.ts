import { eq, inArray, sql } from 'drizzle-orm';
import { asId, type SkillId } from '@unisson/shared-kernel';
import type {
  Concept,
  KnowledgeGraphRepositoryPort,
  PrerequisiteEdge,
  Skill,
} from '@unisson/knowledge-graph';
import type { Db } from '../client';
import { concept, skill, skillConcept, skillPrerequisite } from '../schema';

/** Adapter Postgres du graphe (ADR-005). La fermeture transitive utilise un `WITH RECURSIVE`. */
export class PgKnowledgeGraphRepository implements KnowledgeGraphRepositoryPort {
  constructor(private readonly db: Db) {}

  async getSkill(id: SkillId): Promise<Skill | null> {
    const rows = await this.db.select().from(skill).where(eq(skill.id, id)).limit(1);
    const row = rows[0];
    return row ? { id: asId<'SkillId'>(row.id), title: row.title, domain: row.domain } : null;
  }

  async listSkills(domain?: string): Promise<Skill[]> {
    const rows = domain
      ? await this.db.select().from(skill).where(eq(skill.domain, domain))
      : await this.db.select().from(skill);
    return rows.map((r) => ({ id: asId<'SkillId'>(r.id), title: r.title, domain: r.domain }));
  }

  async getPrerequisites(id: SkillId): Promise<PrerequisiteEdge[]> {
    const rows = await this.db.select().from(skillPrerequisite).where(eq(skillPrerequisite.skillId, id));
    return rows.map(this.toEdge);
  }

  async getAllPrerequisites(domain?: string): Promise<PrerequisiteEdge[]> {
    if (!domain) {
      return (await this.db.select().from(skillPrerequisite)).map(this.toEdge);
    }
    const rows = await this.db
      .select({
        skillId: skillPrerequisite.skillId,
        requiresSkillId: skillPrerequisite.requiresSkillId,
        strength: skillPrerequisite.strength,
      })
      .from(skillPrerequisite)
      .innerJoin(skill, eq(skill.id, skillPrerequisite.skillId))
      .where(eq(skill.domain, domain));
    return rows.map(this.toEdge);
  }

  async getTransitivePrerequisiteIds(id: SkillId): Promise<SkillId[]> {
    // Fermeture transitive côté base : c'est LE cas d'usage du recursive CTE (§7).
    const result = await this.db.execute<{ id: string }>(sql`
      WITH RECURSIVE prereqs(id) AS (
        SELECT requires_skill_id FROM skill_prerequisite WHERE skill_id = ${id}
        UNION
        SELECT sp.requires_skill_id
        FROM skill_prerequisite sp
        JOIN prereqs p ON sp.skill_id = p.id
      )
      SELECT DISTINCT id FROM prereqs
    `);
    return result.rows.map((r) => asId<'SkillId'>(r.id));
  }

  async getConceptsForSkill(id: SkillId): Promise<Concept[]> {
    const links = await this.db
      .select({ conceptId: skillConcept.conceptId })
      .from(skillConcept)
      .where(eq(skillConcept.skillId, id));
    const ids = links.map((l) => l.conceptId);
    if (ids.length === 0) return [];
    const rows = await this.db.select().from(concept).where(inArray(concept.id, ids));
    return rows.map((r) => ({
      id: asId<'ConceptId'>(r.id),
      type: r.type as Concept['type'],
      payload: r.payload,
      difficulty: r.difficulty,
    }));
  }

  private toEdge = (r: { skillId: string; requiresSkillId: string; strength: number }): PrerequisiteEdge => ({
    skillId: asId<'SkillId'>(r.skillId),
    requiresSkillId: asId<'SkillId'>(r.requiresSkillId),
    strength: r.strength,
  });
}
