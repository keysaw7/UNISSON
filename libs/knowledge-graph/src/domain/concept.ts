import type { ConceptId, SkillId } from '@unisson/shared-kernel';

export type ConceptType = 'kana' | 'kanji' | 'vocab' | 'grammar' | 'generic';

/** Atome de savoir testable (§7). */
export interface Concept {
  id: ConceptId;
  type: ConceptType;
  payload: Record<string, unknown>;
  difficulty: number; // 0..1
}

/** Compétence : nœud gros grain porteur des relations de prérequis (§7). */
export interface Skill {
  id: SkillId;
  title: string;
  domain: string;
}

/** Arête de prérequis pondérée : `strength` gère les prérequis souples (§14.4). */
export interface PrerequisiteEdge {
  skillId: SkillId;
  requiresSkillId: SkillId;
  strength: number; // 0..1 (1 = dur, <1 = souple)
}
