import type { ConceptId, LearnerId, SkillId } from '@unisson/shared-kernel';
import type { KnowledgeGraphRepositoryPort } from '@unisson/knowledge-graph';
import type { LearnerStateRepositoryPort } from '@unisson/learner-modeling';
import { computeEvidenceWeight } from '../domain/error-analysis';

const PREREQUISITE_WEAK_THRESHOLD = 0.45;

export interface PrerequisiteCheckInput {
  learnerId: LearnerId;
  skillId: SkillId;
  conceptsCovered: ConceptId[];
}

export interface PrerequisiteCheckResult {
  missing: boolean;
  weakConceptId?: ConceptId;
}

/**
 * Détecte si l'échec pourrait venir d'un prérequis faible (PEDAGOG § phases 10-11).
 */
export class PrerequisiteChecker {
  constructor(
    private readonly graph: KnowledgeGraphRepositoryPort,
    private readonly state: LearnerStateRepositoryPort,
  ) {}

  async check(input: PrerequisiteCheckInput): Promise<PrerequisiteCheckResult> {
    const prereqSkillIds = await this.graph.getTransitivePrerequisiteIds(input.skillId);
    if (prereqSkillIds.length === 0) return { missing: false };

    let weakest: { conceptId: ConceptId; pMastery: number } | null = null;

    for (const prereqSkillId of prereqSkillIds) {
      const concepts = await this.graph.getConceptsForSkill(prereqSkillId);
      for (const concept of concepts) {
        const st = await this.state.getMastery(input.learnerId, concept.id);
        const p = st?.pMastery ?? 0;
        if (p < PREREQUISITE_WEAK_THRESHOLD && (!weakest || p < weakest.pMastery)) {
          weakest = { conceptId: concept.id, pMastery: p };
        }
      }
    }

    if (!weakest) return { missing: false };
    return { missing: true, weakConceptId: weakest.conceptId };
  }
}

export { computeEvidenceWeight };
