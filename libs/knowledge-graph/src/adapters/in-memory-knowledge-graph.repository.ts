import type { ConceptId, SkillId } from '@unisson/shared-kernel';
import type { Concept, PrerequisiteEdge, Skill } from '../domain/concept';
import { transitivePrerequisites } from '../domain/graph-algorithms';
import { DEFAULT_KNOWLEDGE_GRAPH_SEED } from '../domain/domain-seeds';
import type { KnowledgeGraphSeed } from '../domain/japanese-n5';
import type { KnowledgeGraphRepositoryPort } from '../ports/knowledge-graph.repository.port';

/**
 * Adapter mémoire du graphe (dev/tests). Mêmes réponses que l'adapter Postgres, mais la
 * fermeture transitive est calculée par BFS au lieu d'un `WITH RECURSIVE`.
 */
export class InMemoryKnowledgeGraphRepository implements KnowledgeGraphRepositoryPort {
  private readonly skills: Skill[];
  private readonly prerequisites: PrerequisiteEdge[];
  private readonly concepts: Concept[];
  private readonly skillConcepts: Array<{ skillId: SkillId; conceptId: ConceptId }>;

  constructor(seed: KnowledgeGraphSeed = DEFAULT_KNOWLEDGE_GRAPH_SEED) {
    this.skills = seed.skills;
    this.prerequisites = seed.prerequisites;
    this.concepts = seed.concepts;
    this.skillConcepts = seed.skillConcepts;
  }

  async getSkill(id: SkillId): Promise<Skill | null> {
    return this.skills.find((s) => s.id === id) ?? null;
  }

  async listSkills(domain?: string): Promise<Skill[]> {
    return domain ? this.skills.filter((s) => s.domain === domain) : [...this.skills];
  }

  async getPrerequisites(id: SkillId): Promise<PrerequisiteEdge[]> {
    return this.prerequisites.filter((e) => e.skillId === id);
  }

  async getAllPrerequisites(domain?: string): Promise<PrerequisiteEdge[]> {
    if (!domain) return [...this.prerequisites];
    const inDomain = new Set(this.skills.filter((s) => s.domain === domain).map((s) => s.id));
    return this.prerequisites.filter((e) => inDomain.has(e.skillId));
  }

  async getTransitivePrerequisiteIds(id: SkillId): Promise<SkillId[]> {
    return transitivePrerequisites(id, this.prerequisites);
  }

  async getConceptsForSkill(id: SkillId): Promise<Concept[]> {
    const ids = new Set(this.skillConcepts.filter((sc) => sc.skillId === id).map((sc) => sc.conceptId));
    return this.concepts.filter((c) => ids.has(c.id));
  }
}
