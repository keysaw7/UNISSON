import type { ConceptId, SkillId } from '@unisson/shared-kernel';

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
}

export interface SequencerContext {
  /** Concepts dus, triés par urgence croissante (rétrievabilité la plus basse d'abord). */
  due: DueConcept[];
  /** Prochaine brique d'apprentissage selon le plan, ou null si tout est traité. */
  learn: LearnCandidate | null;
  /** En-dessous de ce seuil, une révision est URGENTE et passe avant tout (§9). */
  urgentThreshold?: number;
}

export type ActivityKind = 'review' | 'remediate' | 'introduce' | 'idle';

export interface NextActivity {
  kind: ActivityKind;
  conceptId?: ConceptId;
  skillId?: SkillId;
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
      rationale: `révision urgente (rétrievabilité ${top.retrievability.toFixed(2)} < ${urgentThreshold})`,
    };
  }

  if (ctx.learn) {
    const c = ctx.learn;
    const targetDifficulty = clamp(c.pMastery + PROXIMAL_EPSILON, 0.1, 0.95);
    return {
      kind: c.kind,
      conceptId: c.conceptId,
      skillId: c.skillId,
      targetDifficulty,
      rationale:
        c.kind === 'remediate'
          ? `remédiation du prérequis faible « ${c.skillTitle} » (maîtrise ${c.pMastery.toFixed(2)})`
          : `nouveau concept de « ${c.skillTitle} » à difficulté ${targetDifficulty.toFixed(2)} (zone proximale)`,
    };
  }

  if (ctx.due.length > 0) {
    const top = ctx.due[0]!;
    return {
      kind: 'review',
      conceptId: top.conceptId,
      skillId: top.skillId,
      rationale: 'consolidation (aucun nouveau contenu prêt, on renforce l’acquis)',
    };
  }

  return { kind: 'idle', rationale: 'rien à réviser et plan terminé' };
}
