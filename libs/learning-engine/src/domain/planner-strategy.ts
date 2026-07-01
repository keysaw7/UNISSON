import type { SkillId } from '@unisson/shared-kernel';
import type { PlannedSkill, PlannedSkillStatus } from './learning-plan';

/** Une compétence candidate à ordonner (déjà classée par statut). */
export interface PlannerSkillInput {
  skillId: SkillId;
  title: string;
  status: PlannedSkillStatus;
  estimatedEffortMinutes: number;
  /** Prérequis (restreints à l'ensemble requis). */
  prerequisites: SkillId[];
}

export interface PlannerInput {
  skills: PlannerSkillInput[];
  motivation?: string;
  weights?: PlannerWeights;
}

/** Poids de la fonction de priorité (§6.3). Personnalisables (appris par le Learner Model plus tard). */
export interface PlannerWeights {
  relevance: number; // w1 — pertinence vs motivation
  quickWin: number; // w2 — 1/effort (momentum)
  unlock: number; // w3 — valeur de déblocage (leverage sur le DAG)
  depth: number; // w4 — pénalité de profondeur (rester proche du front)
}

export const DEFAULT_PLANNER_WEIGHTS: PlannerWeights = {
  relevance: 1,
  quickWin: 2,
  unlock: 3,
  depth: 1,
};

/**
 * Stratégie d'ordonnancement du Planner (§6.3, ADR-016). Port swappable :
 * approche B (glouton pondéré, interprétable) au départ, C (optimisation globale/deadline) ensuite.
 */
export interface PlannerStrategyPort {
  order(input: PlannerInput): PlannedSkill[];
}

export const PLANNER_STRATEGY_PORT = Symbol('PlannerStrategyPort');

/**
 * Approche B : tri topologique glouton pondéré. Parmi les compétences « prêtes » (tous prérequis
 * satisfaits), on sert celle de plus haute priorité :
 *
 *   priority = w1·pertinence + w2·(quickWin) + w3·valeurDeDéblocage − w4·profondeur
 *
 * Interprétable → on peut expliquer « pourquoi cet ordre » (rationale).
 */
export class WeightedGreedyPlanner implements PlannerStrategyPort {
  order(input: PlannerInput): PlannedSkill[] {
    const weights = input.weights ?? DEFAULT_PLANNER_WEIGHTS;
    const motivation = (input.motivation ?? '').toLowerCase();

    const toOrder = input.skills.filter((s) => s.status !== 'mastered');
    const toOrderIds = new Set(toOrder.map((s) => s.skillId));
    const byId = new Map(input.skills.map((s) => [s.skillId, s]));

    const unlockValue = this.computeUnlockValues(toOrder, toOrderIds);

    // Satisfait au départ : tout ce qui n'est pas à ordonner (maîtrisé ou hors périmètre).
    const satisfied = new Set<SkillId>(input.skills.filter((s) => !toOrderIds.has(s.skillId)).map((s) => s.skillId));

    const remaining = new Set(toOrderIds);
    const ordered: PlannedSkill[] = [];

    while (remaining.size > 0) {
      const ready = [...remaining]
        .map((id) => byId.get(id)!)
        .filter((s) => s.prerequisites.every((p) => !toOrderIds.has(p) || satisfied.has(p)));

      if (ready.length === 0) {
        throw new Error('Planner : aucune compétence prête (cycle ou prérequis manquant).');
      }

      const scored = ready.map((s) => ({
        skill: s,
        score: this.priority(
          s,
          motivation,
          unlockValue.get(s.skillId) ?? 0,
          s.prerequisites.filter((p) => toOrderIds.has(p)).length,
          weights,
        ),
      }));
      scored.sort(
        (a, b) =>
          b.score - a.score ||
          (unlockValue.get(b.skill.skillId) ?? 0) - (unlockValue.get(a.skill.skillId) ?? 0) ||
          a.skill.skillId.localeCompare(b.skill.skillId),
      );

      const chosen = scored[0]!.skill;
      const unlocks = unlockValue.get(chosen.skillId) ?? 0;
      ordered.push({
        skillId: chosen.skillId,
        title: chosen.title,
        status: chosen.status,
        priority: Number(scored[0]!.score.toFixed(4)),
        prerequisites: chosen.prerequisites,
        estimatedEffortMinutes: chosen.estimatedEffortMinutes,
        rationale: this.rationale(chosen, unlocks, motivation),
      });
      satisfied.add(chosen.skillId);
      remaining.delete(chosen.skillId);
    }

    return ordered;
  }

  private priority(
    s: PlannerSkillInput,
    motivation: string,
    unlocks: number,
    depthInScope: number,
    w: PlannerWeights,
  ): number {
    const relevance = this.relevance(s.title, motivation);
    const quickWin = 30 / Math.max(5, s.estimatedEffortMinutes);
    // Profondeur = prérequis ENCORE à acquérir (les prérequis déjà maîtrisés ne pénalisent pas).
    return w.relevance * relevance + w.quickWin * quickWin + w.unlock * unlocks - w.depth * depthInScope;
  }

  /** Pertinence lexicale simple titre↔motivation (placeholder d'un scoring sémantique ultérieur). */
  private relevance(title: string, motivation: string): number {
    if (!motivation) return 0;
    const words = title.toLowerCase().split(/\W+/).filter((wd) => wd.length > 2);
    return words.some((wd) => motivation.includes(wd)) ? 1 : 0;
  }

  /** Valeur de déblocage = nombre de compétences (à acquérir) qui dépendent transitivement de `s`. */
  private computeUnlockValues(skills: PlannerSkillInput[], scope: Set<SkillId>): Map<SkillId, number> {
    // Arêtes inverses : prereq → compétences qui le requièrent (dans le périmètre).
    const unlocks = new Map<SkillId, SkillId[]>();
    for (const s of skills) {
      for (const p of s.prerequisites) {
        if (!scope.has(p)) continue;
        const list = unlocks.get(p) ?? [];
        list.push(s.skillId);
        unlocks.set(p, list);
      }
    }

    const result = new Map<SkillId, number>();
    for (const s of skills) {
      const seen = new Set<SkillId>();
      const queue = [...(unlocks.get(s.skillId) ?? [])];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (seen.has(cur)) continue;
        seen.add(cur);
        for (const nxt of unlocks.get(cur) ?? []) if (!seen.has(nxt)) queue.push(nxt);
      }
      result.set(s.skillId, seen.size);
    }
    return result;
  }

  private rationale(s: PlannerSkillInput, unlocks: number, motivation: string): string {
    const parts: string[] = [];
    if (s.status === 'to_remediate') parts.push('remédiation ciblée (concepts faibles)');
    if (unlocks >= 2) parts.push(`débloque ${unlocks} compétences en aval`);
    else if (s.prerequisites.length === 0) parts.push('fondation sans prérequis');
    if (s.estimatedEffortMinutes <= 30) parts.push('victoire rapide');
    if (motivation && this.relevance(s.title, motivation)) parts.push('directement lié à ta motivation');
    if (parts.length === 0) parts.push('étape nécessaire vers la cible');
    return parts.join(' · ');
  }
}
