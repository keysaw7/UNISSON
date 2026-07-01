import type { ConceptId, SkillId } from '@unisson/shared-kernel';
import type { ConceptType } from '@unisson/knowledge-graph';
import type { MasteryStage } from '@unisson/learner-modeling';
import type { Format } from '@unisson/content';

/**
 * Format Selector (§6.5) — la 6e décision du moteur : « sous quelle forme ». Le bon format dépend
 * de l'INTENTION pédagogique et du STADE de maîtrise, pas seulement du concept (testing effect,
 * desirable difficulties, expertise reversal, Bloom).
 */
export type PedagogicalIntent = 'introduce' | 'practice' | 'review' | 'remediate' | 'apply';

export interface LearnerFormatContext {
  device?: 'mobile' | 'desktop';
  availableMinutes?: number;
  fatigueLevel?: number; // 0..1
  formatPreferences?: Format[];
  /** Formats récemment servis (le plus récent en dernier) — anti-monotonie. */
  recentFormats?: Format[];
  capabilities?: { mic: boolean; camera: boolean };
}

export interface FormatDecisionContext {
  conceptId: ConceptId;
  skillId: SkillId;
  conceptType: ConceptType;
  intent: PedagogicalIntent;
  masteryStage: MasteryStage;
  hasMisconception: boolean;
  /** Difficulté cible fournie par le Sequencer (zone proximale) ; sinon dérivée du stade. */
  targetDifficulty?: number;
  learnerContext?: LearnerFormatContext;
}

export interface FormatSpec {
  format: Format;
  difficulty: number;
  rationale: string;
  /** Bande VALIDE restante (hors format choisi) — plancher de sécurité pour un bandit (§6.5). */
  fallbackFormats: Format[];
}

/**
 * Stratégie de sélection de format (port swappable, §6.5) : approche B (règles pédagogiques,
 * interprétable) au départ, approche C (bandit contextuel CONTRAINT à la bande B) en surcouche.
 * `select` est asynchrone par contrat (le bandit a besoin de lire des stats d'efficacité) même si
 * l'implémentation par règles n'a besoin d'aucune I/O.
 */
export interface FormatSelectionStrategyPort {
  select(context: FormatDecisionContext): Promise<FormatSpec>;
}

export const FORMAT_SELECTION_STRATEGY_PORT = Symbol('FormatSelectionStrategyPort');

const DEFAULT_DIFFICULTY_BY_STAGE: Record<MasteryStage, number> = {
  unknown: 0.2,
  emerging: 0.35,
  developing: 0.5,
  proficient: 0.65,
  mastered: 0.8,
};

/** Bande pédagogiquement valide (approche B), fonction de l'intention et — à défaut — du stade. */
function bandForIntentAndStage(intent: PedagogicalIntent, stage: MasteryStage): Format[] {
  const byStage: Record<MasteryStage, Format[]> = {
    unknown: ['explanation', 'worked_example'],
    emerging: ['flashcard_recognition', 'mcq'],
    developing: ['cloze', 'recall_production', 'translation'],
    proficient: ['spaced_review', 'cloze', 'recall_production'],
    mastered: ['project_task', 'dialogue_socratic', 'spaced_review'],
  };
  switch (intent) {
    case 'introduce':
      return ['explanation', 'worked_example'];
    case 'review':
      return ['spaced_review', 'cloze', 'recall_production'];
    case 'apply':
      return ['project_task', 'dialogue_socratic', 'spaced_review'];
    case 'remediate':
      return ['contrastive_remediation', ...byStage[stage]];
    case 'practice':
    default:
      return byStage[stage];
  }
}

const SHORT_FORMATS = new Set<Format>(['flashcard_recognition', 'mcq', 'cloze']);
const HIGH_FATIGUE_THRESHOLD = 0.7;
const LOW_MINUTES_THRESHOLD = 3;

/** Faisabilité ici/maintenant : pas de speaking sans micro, court si peu de temps ou fatigue haute. */
function isFeasible(format: Format, learner?: LearnerFormatContext): boolean {
  if (!learner) return true;
  if (format === 'speaking' && learner.capabilities && !learner.capabilities.mic) return false;
  if (learner.availableMinutes !== undefined && learner.availableMinutes < LOW_MINUTES_THRESHOLD) {
    return SHORT_FORMATS.has(format);
  }
  if (learner.fatigueLevel !== undefined && learner.fatigueLevel > HIGH_FATIGUE_THRESHOLD) {
    return SHORT_FORMATS.has(format);
  }
  return true;
}

/** Variété anti-monotonie : déprioriser (sans jamais éliminer) une répétition immédiate. */
function applyVariety(band: Format[], recentFormats: Format[] = []): Format[] {
  if (band.length <= 1) return band;
  const last = recentFormats[recentFormats.length - 1];
  if (last && band[0] === last) return [...band.slice(1), band[0]!];
  return band;
}

function buildRationale(ctx: FormatDecisionContext, chosen: Format, fullBand: Format[]): string {
  const parts: string[] = [];
  if (ctx.hasMisconception && chosen === 'contrastive_remediation') {
    parts.push('misconception détectée → remédiation contrastive prioritaire');
  } else {
    parts.push(`intention « ${ctx.intent} » + stade « ${ctx.masteryStage} »`);
  }
  if (fullBand.length > 1) parts.push(`bande pédagogique valide : ${fullBand.join(', ')}`);
  return parts.join(' · ');
}

/**
 * Approche B : politique à RÈGLES pédagogiques (§6.5). Encode le modèle pédagogique (testing
 * effect, expertise reversal…), interprétable, marche sans données. C'est le PLANCHER DE SÉCURITÉ :
 * jamais « rappel avant exposition », jamais un format infaisable en tête.
 */
export class RuleBasedFormatSelector implements FormatSelectionStrategyPort {
  async select(ctx: FormatDecisionContext): Promise<FormatSpec> {
    let band = bandForIntentAndStage(ctx.intent, ctx.masteryStage);
    if (ctx.hasMisconception && band[0] !== 'contrastive_remediation') {
      band = ['contrastive_remediation', ...band.filter((f) => f !== 'contrastive_remediation')];
    }

    const feasible = band.filter((f) => isFeasible(f, ctx.learnerContext));
    const safeBand = feasible.length > 0 ? feasible : band; // jamais vide : plancher de sécurité
    const varied = applyVariety(safeBand, ctx.learnerContext?.recentFormats);

    const [chosen, ...fallbackFormats] = varied;
    const difficulty = ctx.targetDifficulty ?? DEFAULT_DIFFICULTY_BY_STAGE[ctx.masteryStage];

    return {
      format: chosen!,
      difficulty,
      rationale: buildRationale(ctx, chosen!, band),
      fallbackFormats,
    };
  }
}
