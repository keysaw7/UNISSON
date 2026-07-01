import type { ConceptId, SkillId } from '@unisson/shared-kernel';
import type { KnowledgeGraphRepositoryPort } from '@unisson/knowledge-graph';
import type { DiagnosticNode } from '../domain/diagnostic';

/**
 * Aplati le graphe de compétences (prérequis au niveau SKILL) en relations au niveau CONCEPT pour le
 * diagnostic : un concept d'une compétence hérite comme prérequis tous les concepts des compétences
 * transitivement requises, et comme dépendants tous les concepts des compétences qui en dépendent.
 * La région = compétences cibles + clôture transitive de leurs prérequis.
 */
export async function buildDiagnosticGraph(
  graph: KnowledgeGraphRepositoryPort,
  targetSkills: SkillId[],
): Promise<DiagnosticNode[]> {
  const region = new Set<SkillId>(targetSkills);
  for (const t of targetSkills) {
    for (const dep of await graph.getTransitivePrerequisiteIds(t)) region.add(dep);
  }
  const regionSkills = [...region];

  const transPrereq = new Map<SkillId, Set<SkillId>>();
  const conceptsBySkill = new Map<SkillId, ConceptId[]>();
  const difficulty = new Map<string, number>();
  for (const s of regionSkills) {
    const prereqs = (await graph.getTransitivePrerequisiteIds(s)).filter((id) => region.has(id));
    transPrereq.set(s, new Set(prereqs));
    const concepts = await graph.getConceptsForSkill(s);
    conceptsBySkill.set(
      s,
      concepts.map((c) => {
        difficulty.set(c.id, c.difficulty);
        return c.id;
      }),
    );
  }

  // Dépendants = inverse des prérequis, restreint à la région.
  const dependentSkills = new Map<SkillId, Set<SkillId>>(regionSkills.map((s) => [s, new Set<SkillId>()]));
  for (const s of regionSkills) {
    for (const pre of transPrereq.get(s) ?? []) dependentSkills.get(pre)?.add(s);
  }

  const conceptIdsOf = (skills: Iterable<SkillId>): ConceptId[] => {
    const ids: ConceptId[] = [];
    for (const sk of skills) ids.push(...(conceptsBySkill.get(sk) ?? []));
    return ids;
  };

  const nodes: DiagnosticNode[] = [];
  for (const s of regionSkills) {
    const prerequisiteConceptIds = conceptIdsOf(transPrereq.get(s) ?? []);
    const dependentConceptIds = conceptIdsOf(dependentSkills.get(s) ?? []);
    for (const conceptId of conceptsBySkill.get(s) ?? []) {
      nodes.push({
        conceptId,
        skillId: s,
        difficulty: difficulty.get(conceptId) ?? 0.5,
        prerequisiteConceptIds,
        dependentConceptIds,
      });
    }
  }
  return nodes;
}
