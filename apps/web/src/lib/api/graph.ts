import 'server-only';
import { api } from './http';
import type { ConceptDto, SkillDto, SkillPrerequisitesResponse } from './types';

/** Graphe de connaissances (§7) : compétences, prérequis, concepts. */
export function listSkills(domain?: string): Promise<SkillDto[]> {
  const query = domain ? `?domain=${encodeURIComponent(domain)}` : '';
  return api.get<SkillDto[]>(`/graph/skills${query}`);
}

export function getSkillPrerequisites(skillId: string): Promise<SkillPrerequisitesResponse> {
  return api.get<SkillPrerequisitesResponse>(`/graph/skills/${encodeURIComponent(skillId)}/prerequisites`);
}

export function getConceptsForSkill(skillId: string): Promise<ConceptDto[]> {
  return api.get<ConceptDto[]>(`/graph/skills/${encodeURIComponent(skillId)}/concepts`);
}
