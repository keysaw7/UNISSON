import type { ConceptId, LearnerId } from '@unisson/shared-kernel';
import type { EvidenceEvent } from './evidence-event';
import type { MasteryState } from './mastery-state';

/**
 * Modèle unifié Maîtrise + Oubli (§8, ADR-006). Un seul état latent par (apprenant, concept)
 * combine deux dynamiques scientifiquement éprouvées :
 *
 *  1. APPRENTISSAGE (BKT-like) — chaque preuve met à jour bayésiennement `pMastery`.
 *  2. OUBLI (FSRS/Ebbinghaus) — entre deux révisions la rétention décroît selon une courbe
 *     de puissance, d'autant plus lentement que la `stability` est haute. Réviser au bon moment
 *     (rétention basse mais réussie) fait bondir la stabilité → effet d'espacement.
 *
 * Ce contrat est le point d'extension (`MasteryModelPort`) : on pourra brancher un DKN/DKT
 * (Python) plus tard sans toucher au reste (ADR-006).
 */
export interface MasteryModel {
  /** État initial d'un concept jamais vu (prior). */
  initialState(learnerId: LearnerId, conceptId: ConceptId, now?: string): MasteryState;

  /** Rétention mémoire pure en [0,1] : probabilité que la trace soit encore récupérable. */
  memoryRetention(state: MasteryState, now?: string): number;

  /** Rétrievabilité courante = pMastery × oubli(t, stabilité) (§8). */
  retrievability(state: MasteryState, now?: string): number;

  /** Applique une preuve et renvoie le nouvel état (immuable). */
  applyEvidence(state: MasteryState, evidence: EvidenceEvent): MasteryState;

  /** Recalcule l'état complet en rejouant une séquence de preuves (source de vérité, §12.2). */
  project(
    learnerId: LearnerId,
    conceptId: ConceptId,
    events: readonly EvidenceEvent[],
    now?: string,
  ): MasteryState;

  /** Le concept est-il « connu mais en train de s'effacer » → à réviser ? */
  isDue(state: MasteryState, now?: string, targetRetention?: number): boolean;
}

/** Paramètres du modèle. Réglables par domaine ; défauts calibrés « raisonnables » pour le N5. */
export interface MasteryModelParams {
  /** Prior de maîtrise d'un concept neuf. */
  readonly pInit: number;
  /** P(réponse incorrecte | concept connu) — étourderie. */
  readonly pSlip: number;
  /** P(réponse correcte | concept non connu) — devinette. */
  readonly pGuess: number;
  /** P(apprendre | non connu) par opportunité pédagogique. */
  readonly pTransit: number;
  /** Stabilité initiale (en jours) juste après la 1re rencontre. */
  readonly initialStability: number;
  /** Stabilité (jours) attribuée après une 1re réponse correcte. */
  readonly initialSuccessStability: number;
  /** Facteur multiplicatif de la stabilité après un échec (lapse). */
  readonly lapseFactor: number;
  /** Gain de stabilité maximal par révision réussie. */
  readonly maxGrowth: number;
  /** Bornes de stabilité (jours). */
  readonly minStability: number;
  readonly maxStability: number;
  /** Rétention cible pour décider qu'une révision est due (FSRS : ~0.9). */
  readonly targetRetention: number;
  /** Seuil de pMastery au-dessus duquel un concept est considéré « connu ». */
  readonly knownThreshold: number;
}

export const DEFAULT_MASTERY_PARAMS: MasteryModelParams = {
  pInit: 0.1,
  pSlip: 0.1,
  pGuess: 0.2,
  pTransit: 0.15,
  initialStability: 0.5,
  initialSuccessStability: 1,
  lapseFactor: 0.4,
  maxGrowth: 4,
  minStability: 0.2,
  maxStability: 3650,
  targetRetention: 0.9,
  knownThreshold: 0.7,
};

// Courbe d'oubli FSRS (fonction puissance) : R(t) = (1 + FACTOR·t/S)^(-1/2).
// Calibrée pour que R = 0.9 exactement quand t = S (jours).
const DECAY = 0.5;
const FACTOR = 19 / 81; // (0.9^(-1/DECAY) - 1)

const MS_PER_DAY = 86_400_000;
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

function elapsedDays(fromIso: string, toIso: string): number {
  const dt = (Date.parse(toIso) - Date.parse(fromIso)) / MS_PER_DAY;
  return dt > 0 ? dt : 0;
}

/** Implémentation TypeScript pure (aucune dépendance ML/infra) du modèle Maîtrise + Oubli. */
export class FsrsBayesianMasteryModel implements MasteryModel {
  constructor(private readonly params: MasteryModelParams = DEFAULT_MASTERY_PARAMS) {}

  initialState(learnerId: LearnerId, conceptId: ConceptId, now = new Date().toISOString()): MasteryState {
    return {
      learnerId,
      conceptId,
      pMastery: this.params.pInit,
      stability: this.params.initialStability,
      lastReviewedAt: now,
    };
  }

  memoryRetention(state: MasteryState, now = new Date().toISOString()): number {
    const t = elapsedDays(state.lastReviewedAt, now);
    const s = Math.max(this.params.minStability, state.stability);
    return Math.pow(1 + (FACTOR * t) / s, -DECAY);
  }

  retrievability(state: MasteryState, now = new Date().toISOString()): number {
    return clamp01(state.pMastery * this.memoryRetention(state, now));
  }

  isDue(state: MasteryState, now = new Date().toISOString(), targetRetention = this.params.targetRetention): boolean {
    // Un concept est « dû » s'il est connu mais que la mémoire a suffisamment décru.
    if (state.pMastery < this.params.knownThreshold) return true; // lacune → à travailler
    return this.memoryRetention(state, now) < targetRetention;
  }

  applyEvidence(state: MasteryState, evidence: EvidenceEvent): MasteryState {
    const p = this.params;
    const w = clamp01(evidence.evidenceWeight);

    // 1) Oubli : rétention de la trace au moment de la preuve.
    const ret = this.memoryRetention(state, evidence.occurredAt);
    const pKnownNow = clamp01(state.pMastery * ret);

    // 2) Mise à jour bayésienne (BKT) de la probabilité « connu » au vu de l'observation.
    let posterior: number;
    if (evidence.correct) {
      const num = pKnownNow * (1 - p.pSlip);
      const den = num + (1 - pKnownNow) * p.pGuess;
      posterior = den > 0 ? num / den : pKnownNow;
    } else {
      const num = pKnownNow * p.pSlip;
      const den = num + (1 - pKnownNow) * (1 - p.pGuess);
      posterior = den > 0 ? num / den : pKnownNow;
    }
    // Pondération par la fiabilité de la preuve : une preuve faible bouge peu l'estimation.
    const posteriorEff = pKnownNow + w * (posterior - pKnownNow);

    // 3) Transition d'apprentissage (on apprend surtout quand on réussit / feedback utile).
    const learnGain = p.pTransit * w * evidence.score;
    const pMastery = clamp01(posteriorEff + (1 - posteriorEff) * learnGain);

    // 4) Mise à jour de la stabilité (mémoire).
    const stability = this.nextStability(state, evidence, ret, w);

    return {
      learnerId: state.learnerId,
      conceptId: state.conceptId,
      pMastery,
      stability,
      lastReviewedAt: evidence.occurredAt,
    };
  }

  private nextStability(
    state: MasteryState,
    evidence: EvidenceEvent,
    retention: number,
    weight: number,
  ): number {
    const p = this.params;
    const success = evidence.correct && evidence.score >= 0.5;
    const fresh = state.stability <= p.initialStability + 1e-9;

    if (!success) {
      // Lapse : la stabilité s'effondre (mais jamais sous le plancher).
      return Math.max(p.minStability, state.stability * p.lapseFactor);
    }

    if (fresh) {
      // Première réussite : ancre une stabilité de base modulée par la difficulté.
      const base = p.initialSuccessStability * (1 + evidence.difficulty);
      return clamp(base, p.minStability, p.maxStability);
    }

    // Effet d'espacement : réviser avec succès alors que la rétention avait baissé
    // (grand écart) et sur un item difficile fait bondir la stabilité.
    const growth = p.maxGrowth * (1 - retention) * (0.5 + evidence.difficulty) * weight;
    const next = state.stability * (1 + growth);
    return clamp(next, p.minStability, p.maxStability);
  }

  project(
    learnerId: LearnerId,
    conceptId: ConceptId,
    events: readonly EvidenceEvent[],
    now?: string,
  ): MasteryState {
    const ordered = [...events].sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
    let state = this.initialState(learnerId, conceptId, ordered[0]?.occurredAt ?? now);
    for (const ev of ordered) {
      state = this.applyEvidence(state, ev);
    }
    return state;
  }
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
