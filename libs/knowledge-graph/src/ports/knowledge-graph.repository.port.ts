import type { SkillId } from '@unisson/shared-kernel';
import type { PrerequisiteEdge, Skill } from '../domain/concept';

/**
 * Accès au graphe de compétences (out-port). Impl. Postgres (recursive CTE) en Phase 1,
 * potentiellement Neo4j plus tard — sans impact domaine (ADR-005).
 */
export interface KnowledgeGraphRepositoryPort {
  getSkill(id: SkillId): Promise<Skill | null>;
  getPrerequisites(id: SkillId): Promise<PrerequisiteEdge[]>;
}

export const KNOWLEDGE_GRAPH_REPOSITORY_PORT = Symbol('KnowledgeGraphRepositoryPort');
