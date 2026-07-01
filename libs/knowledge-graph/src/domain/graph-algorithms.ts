import type { SkillId } from '@unisson/shared-kernel';
import type { PrerequisiteEdge } from './concept';

/**
 * Algorithmes de graphe purs (§7). Le domaine sait raisonner sur un DAG de compétences
 * indépendamment du stockage : l'adapter mémoire s'appuie dessus, l'adapter Postgres délègue
 * l'équivalent à des `recursive CTE`.
 *
 * Convention d'arête : `edge.skillId` REQUIERT `edge.requiresSkillId`
 * (le prérequis doit être maîtrisé avant la compétence).
 */

/** Fermeture transitive des prérequis d'une compétence (tous ses ancêtres). BFS. */
export function transitivePrerequisites(start: SkillId, edges: readonly PrerequisiteEdge[]): SkillId[] {
  const requiresBySkill = new Map<string, SkillId[]>();
  for (const e of edges) {
    const list = requiresBySkill.get(e.skillId) ?? [];
    list.push(e.requiresSkillId);
    requiresBySkill.set(e.skillId, list);
  }

  const seen = new Set<SkillId>();
  const queue = [...(requiresBySkill.get(start) ?? [])];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const next of requiresBySkill.get(current) ?? []) {
      if (!seen.has(next)) queue.push(next);
    }
  }
  return [...seen];
}

/** Détecte un cycle dans le graphe de prérequis (un DAG valide n'en a aucun). */
export function hasCycle(skills: readonly SkillId[], edges: readonly PrerequisiteEdge[]): boolean {
  try {
    topologicalOrder(skills, edges);
    return false;
  } catch {
    return true;
  }
}

/**
 * Tri topologique (Kahn) : ordonne les compétences de sorte que chaque prérequis précède la
 * compétence qui en dépend. Base du Curriculum Planner (§6.3, ADR-016). Lève si cycle.
 */
export function topologicalOrder(skills: readonly SkillId[], edges: readonly PrerequisiteEdge[]): SkillId[] {
  const nodes = new Set<SkillId>(skills);
  for (const e of edges) {
    nodes.add(e.skillId);
    nodes.add(e.requiresSkillId);
  }

  // indegree = nombre de prérequis non encore satisfaits.
  const indegree = new Map<SkillId, number>();
  for (const n of nodes) indegree.set(n, 0);
  const dependents = new Map<string, SkillId[]>(); // prereq → compétences qui en dépendent
  for (const e of edges) {
    indegree.set(e.skillId, (indegree.get(e.skillId) ?? 0) + 1);
    const list = dependents.get(e.requiresSkillId) ?? [];
    list.push(e.skillId);
    dependents.set(e.requiresSkillId, list);
  }

  // File des nœuds sans prérequis, triée pour un résultat déterministe.
  const ready = [...nodes].filter((n) => (indegree.get(n) ?? 0) === 0).sort();
  const order: SkillId[] = [];

  while (ready.length > 0) {
    const n = ready.shift()!;
    order.push(n);
    for (const dep of dependents.get(n) ?? []) {
      const d = (indegree.get(dep) ?? 0) - 1;
      indegree.set(dep, d);
      if (d === 0) {
        ready.push(dep);
        ready.sort();
      }
    }
  }

  if (order.length !== nodes.size) {
    throw new Error('Cycle détecté dans le graphe de prérequis (DAG invalide).');
  }
  return order;
}
