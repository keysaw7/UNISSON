import 'server-only';
import { graphApi, learnersApi } from '@/lib/api';
import type { ConceptDto, MasteryResponse, SkillDto } from '@/lib/api/types';

export interface SkillMasteryGroup {
  skill: SkillDto;
  concepts: Array<{ concept: ConceptDto; mastery: MasteryResponse }>;
}

/** Assemble skills → concepts → maîtrise pour le dashboard (§8 ARCHITECTURE.md). */
export async function loadMasteryOverview(learnerId: string, domain: string): Promise<SkillMasteryGroup[]> {
  const skills = await graphApi.listSkills(domain);

  return Promise.all(
    skills.map(async (skill) => {
      const concepts = await graphApi.getConceptsForSkill(skill.id);
      const withMastery = await Promise.all(
        concepts.map(async (concept) => ({ concept, mastery: await learnersApi.getMastery(learnerId, concept.id) })),
      );
      return { skill, concepts: withMastery };
    }),
  );
}
