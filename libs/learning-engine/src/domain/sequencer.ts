import type { ConceptId, SkillId } from '@unisson/shared-kernel';
import type { ConceptCycleStage } from './concept-learning-cycle';

/** Un concept dû en révision (connu mais mémoire estompée). */
export interface DueConcept {
  conceptId: ConceptId;
  skillId: SkillId;
  retrievability: number;
}

/** Candidat d'apprentissage : nouveau concept à introduire ou concept faible à remédier. */
export interface LearnCandidate {
  kind: 'introduce' | 'remediate';
  conceptId: ConceptId;
  skillId: SkillId;
  skillTitle: string;
  pMastery: number;
  cycleStage?: ConceptCycleStage;
}

export interface CycleCandidate {
  conceptId: ConceptId;
  skillId: SkillId;
  cycleStage: ConceptCycleStage;
  skillTitle: string;
  pMastery: number;
  retrievability?: number;
}

export interface SequencerContext {
  /** Concepts dus, triés par urgence croissante (rétrievabilité la plus basse d'abord). */
  due: DueConcept[];
  /** Prochaine brique d'apprentissage selon le plan, ou null si tout est traité. */
  learn: LearnCandidate | null;
  /** Rappel actif bloquant post-exposition (PEDAGOG § phase 8). */
  blockingActiveRecall?: CycleCandidate[];
  /** Concepts en remédiation transversale. */
  remediation?: CycleCandidate[];
  /** Pool d'interleaving (≥2 concepts en pratique libre / consolidation). */
  interleavePool?: CycleCandidate[];
  /** Dernier concept servi en interleaving (anti-répétition immédiate). */
  lastInterleavedConceptId?: ConceptId;
  /** En-dessous de ce seuil, une révision est URGENTE et passe avant tout (§9). */
  urgentThreshold?: number;
}

export type ActivityKind = 'review' | 'remediate' | 'introduce' | 'idle';

export interface NextActivity {
  kind: ActivityKind;
  conceptId?: ConceptId;
  skillId?: SkillId;
  cycleStage?: ConceptCycleStage;
  /** Difficulté cible = maîtrise actuelle + ε (zone proximale, ni ennui ni décrochage). */
  targetDifficulty?: number;
  rationale: string;
}

const DEFAULT_URGENT_THRESHOLD = 0.6;
const PROXIMAL_EPSILON = 0.15;

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

/**
 * Sequencer (§9) — arbitrage tactique, ENTIÈREMENT dans notre code (l'IA ne produit que le
 * contenu, en aval). Ordre de priorité :
 *   1. révisions URGENTES (sinon l'apprenant oublie — erreur n°1 des apps de cours) ;
 *   2. remédiation d'un prérequis faible (respect strict des prérequis) ;
 *   3. introduction d'un nouveau concept (difficulté = maîtrise + ε) ;
 *   4. consolidation (révisions non urgentes) s'il n'y a rien de neuf ;
 *   5. sinon, rien à faire.
 */
export function chooseNextActivity(ctx: SequencerContext): NextActivity {
  const urgentThreshold = ctx.urgentThreshold ?? DEFAULT_URGENT_THRESHOLD;
  const urgent = ctx.due.filter((d) => d.retrievability < urgentThreshold);

  if (urgent.length > 0) {
    const top = urgent[0]!;
    return {
      kind: 'review',
      conceptId: top.conceptId,
      skillId: top.skillId,
      cycleStage: 'consolidation',
      rationale: `révision urgente (rétrievabilité ${top.retrievability.toFixed(2)} < ${urgentThreshold})`,
    };
  }

  const blocking = ctx.blockingActiveRecall ?? [];
  if (blocking.length > 0) {
    const b = blocking[0]!;
    return {
      kind: 'introduce',
      conceptId: b.conceptId,
      skillId: b.skillId,
      cycleStage: b.cycleStage,
      targetDifficulty: clamp(b.pMastery + PROXIMAL_EPSILON, 0.1, 0.95),
      rationale: `rappel actif immédiat obligatoire post-exposition (PEDAGOG § phase 8)`,
    };
  }

  const remediation = ctx.remediation ?? [];
  if (remediation.length > 0) {
    const r = remediation[0]!;
    return {
      kind: 'remediate',
      conceptId: r.conceptId,
      skillId: r.skillId,
      cycleStage: 'remediation',
      targetDifficulty: clamp(r.pMastery + PROXIMAL_EPSILON, 0.1, 0.95),
      rationale: `remédiation ciblée sur « ${r.skillTitle} »`,
    };
  }

  if (ctx.learn) {
    const c = ctx.learn;
    const targetDifficulty = clamp(c.pMastery + PROXIMAL_EPSILON, 0.1, 0.95);
    return {
      kind: c.kind,
      conceptId: c.conceptId,
      skillId: c.skillId,
      cycleStage: c.cycleStage,
      targetDifficulty,
      rationale:
        c.kind === 'remediate'
          ? `remédiation du prérequis faible « ${c.skillTitle} » (maîtrise ${c.pMastery.toFixed(2)})`
          : `nouveau concept de « ${c.skillTitle} » à difficulté ${targetDifficulty.toFixed(2)} (zone proximale)`,
    };
  }

  const pool = ctx.interleavePool ?? [];
  if (pool.length >= 2) {
    const rotated =
      ctx.lastInterleavedConceptId && pool.length > 1
        ? [...pool.filter((p) => p.conceptId !== ctx.lastInterleavedConceptId), ...pool.filter((p) => p.conceptId === ctx.lastInterleavedConceptId)]
        : pool;
    const pick = rotated[0]!;
    return {
      kind: 'review',
      conceptId: pick.conceptId,
      skillId: pick.skillId,
      cycleStage: pick.cycleStage,
      rationale: `interleaving entre ${pool.length} concepts (PEDAGOG § phase 13)`,
    };
  }

  if (ctx.due.length > 0) {
    const top = ctx.due[0]!;
    return {
      kind: 'review',
      conceptId: top.conceptId,
      skillId: top.skillId,
      cycleStage: 'consolidation',
      rationale: 'consolidation (aucun nouveau contenu prêt, on renforce l’acquis)',
    };
  }

  return { kind: 'idle', rationale: 'rien à réviser et plan terminé' };
}
