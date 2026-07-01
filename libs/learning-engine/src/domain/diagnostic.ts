import type { ConceptId, DiagnosticSessionId, LearnerId, SkillId } from '@unisson/shared-kernel';

/**
 * Diagnostic adaptatif GRAPH-AWARE (§6.2, approche C). Le domaine est PUR : il ne connaît ni le
 * graphe concret ni l'IA. Il raisonne sur une croyance par concept et exploite la structure de
 * prérequis pour INFÉRER sans demander (réussite → prérequis ↑, échec → dépendants ↓), ce qui rend
 * le diagnostic court (≈ 8–12 items). La sortie n'est qu'un PRIOR ; le modèle Maîtrise+Oubli (§8)
 * corrige ensuite à chaque interaction.
 */

export type DeclaredLevel = 'beginner' | 'novice' | 'intermediate' | 'advanced';

/** Aptitude a priori (0..1) déduite du niveau déclaré. */
const LEVEL_ABILITY: Record<DeclaredLevel, number> = {
  beginner: 0.15,
  novice: 0.35,
  intermediate: 0.6,
  advanced: 0.82,
};

const PRIOR_CONFIDENCE = 0.08; // croyance initiale : très incertaine
const DIRECT_GAIN = 0.7; // impact d'un item servi directement
const PROP_GAIN = 0.35; // impact de la propagation sur les voisins
const PROP_CONFIDENCE_GAIN = 0.2; // gain de certitude inféré (sans demander)

/** Croyance sur un concept : probabilité de maîtrise + certitude de cette estimation. */
export interface ConceptBelief {
  pMastery: number; // 0..1
  confidence: number; // 0..1 (0 = pur prior, 1 = certain)
}

/**
 * Nœud du diagnostic : un concept + ses relations de prérequis/dépendance dérivées du graphe de
 * compétences (déjà aplaties en transitif par la couche application).
 */
export interface DiagnosticNode {
  conceptId: ConceptId;
  skillId: SkillId;
  difficulty: number; // 0..1
  prerequisiteConceptIds: ConceptId[];
  dependentConceptIds: ConceptId[];
}

export type Belief = Record<string, ConceptBelief>;

export interface DiagnosticSession {
  id: DiagnosticSessionId;
  learnerId: LearnerId;
  domain: string;
  targetSkills: SkillId[];
  budget: number; // nb max d'items servis
  confidenceTarget: number; // arrêt quand la certitude minimale l'atteint
  belief: Belief;
  asked: ConceptId[]; // concepts testés DIRECTEMENT
  status: 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

/** Prior par concept : logistique de (aptitude − difficulté), certitude basse. */
export function initialBelief(nodes: DiagnosticNode[], level: DeclaredLevel): Belief {
  const ability = LEVEL_ABILITY[level];
  const belief: Belief = {};
  for (const n of nodes) {
    belief[n.conceptId] = { pMastery: clamp01(sigmoid(4 * (ability - n.difficulty))), confidence: PRIOR_CONFIDENCE };
  }
  return belief;
}

/**
 * Sélectionne le concept-sonde le plus INFORMATIF : d'abord le plus incertain, avec un bonus de
 * levier (nb de voisins) car sa résolution propage l'information à beaucoup d'autres concepts.
 * Renvoie `null` s'il ne reste rien à sonder.
 */
export function selectNextConcept(nodes: DiagnosticNode[], belief: Belief, asked: readonly ConceptId[]): ConceptId | null {
  const askedSet = new Set<string>(asked);
  const candidates = nodes.filter((n) => !askedSet.has(n.conceptId));
  if (candidates.length === 0) return null;

  const maxNeighbors = Math.max(
    1,
    ...nodes.map((n) => n.prerequisiteConceptIds.length + n.dependentConceptIds.length),
  );

  let best: { id: ConceptId; score: number } | null = null;
  for (const n of candidates) {
    const b = belief[n.conceptId] ?? { pMastery: 0.5, confidence: 0 };
    const leverage = (n.prerequisiteConceptIds.length + n.dependentConceptIds.length) / maxNeighbors;
    const score = (1 - b.confidence) * (1 + 0.5 * leverage);
    if (!best || score > best.score) best = { id: n.conceptId, score };
  }
  return best ? best.id : null;
}

/**
 * Applique une réponse : mise à jour bayésienne du concept testé PUIS propagation sur le graphe.
 * Immuable (renvoie une nouvelle croyance).
 */
export function observe(nodes: DiagnosticNode[], belief: Belief, conceptId: ConceptId, correct: boolean): Belief {
  const next: Belief = { ...belief };
  const put = (id: string, b: ConceptBelief) => {
    next[id] = { pMastery: clamp01(b.pMastery), confidence: clamp01(b.confidence) };
  };

  // 1) Observation directe (fort impact).
  const cur = next[conceptId] ?? { pMastery: 0.5, confidence: 0 };
  const target = correct ? 1 : 0;
  put(conceptId, {
    pMastery: cur.pMastery + (target - cur.pMastery) * DIRECT_GAIN,
    confidence: cur.confidence + (1 - cur.confidence) * DIRECT_GAIN,
  });

  // 2) Propagation : réussite → prérequis inférés maîtrisés ; échec → dépendants inférés non maîtrisés.
  const node = nodes.find((n) => n.conceptId === conceptId);
  if (node) {
    const neighbors = correct ? node.prerequisiteConceptIds : node.dependentConceptIds;
    const inferTarget = correct ? 1 : 0;
    for (const nb of neighbors) {
      const b = next[nb] ?? { pMastery: 0.5, confidence: 0 };
      put(nb, {
        pMastery: b.pMastery + (inferTarget - b.pMastery) * PROP_GAIN,
        confidence: b.confidence + (1 - b.confidence) * PROP_CONFIDENCE_GAIN,
      });
    }
  }
  return next;
}

/** Certitude minimale sur la région (0 si vide). */
export function minConfidence(belief: Belief): number {
  const values = Object.values(belief);
  if (values.length === 0) return 0;
  return values.reduce((m, b) => Math.min(m, b.confidence), 1);
}

/** Arrêt : budget d'items atteint OU incertitude de la région sous le seuil. */
export function isComplete(session: Pick<DiagnosticSession, 'belief' | 'asked' | 'budget' | 'confidenceTarget'>): boolean {
  return session.asked.length >= session.budget || minConfidence(session.belief) >= session.confidenceTarget;
}

export interface ConceptPrior {
  conceptId: ConceptId;
  pMastery: number;
  confidence: number;
}

/** Sortie du diagnostic : prior de maîtrise par concept de la région. */
export function toPriors(belief: Belief): ConceptPrior[] {
  return Object.entries(belief).map(([conceptId, b]) => ({
    conceptId: conceptId as ConceptId,
    pMastery: b.pMastery,
    confidence: b.confidence,
  }));
}
