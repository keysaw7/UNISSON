import type { SkillId } from '@unisson/shared-kernel';
import type { Concept, PrerequisiteEdge, Skill } from '../domain/concept';

/**
 * Accès au graphe de compétences (out-port). Impl. Postgres (recursive CTE) en Phase 1,
 * potentiellement Neo4j plus tard — sans impact domaine (ADR-005).
 */
export interface KnowledgeGraphRepositoryPort {
  getSkill(id: SkillId): Promise<Skill | null>;
  listSkills(domain?: string): Promise<Skill[]>;

  /** Prérequis DIRECTS d'une compétence. */
  getPrerequisites(id: SkillId): Promise<PrerequisiteEdge[]>;
  /** Toutes les arêtes de prérequis d'un domaine (pour planifier / trier). */
  getAllPrerequisites(domain?: string): Promise<PrerequisiteEdge[]>;

  /**
   * Prérequis TRANSITIFS (fermeture transitive) d'une compétence.
   * En Postgres = `WITH RECURSIVE` ; en mémoire = BFS. Le domaine ignore le « comment ».
   */
  getTransitivePrerequisiteIds(id: SkillId): Promise<SkillId[]>;

  /** Concepts (KC testables) rattachés à une compétence. */
  getConceptsForSkill(id: SkillId): Promise<Concept[]>;
}

export const KNOWLEDGE_GRAPH_REPOSITORY_PORT = Symbol('KnowledgeGraphRepositoryPort');
