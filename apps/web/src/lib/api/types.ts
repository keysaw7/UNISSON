/**
 * Formes de réponse HTTP des contrôleurs `apps/api` (§2 du plan frontend : "Contrats HTTP non
 * couverts par les libs domaine"). Les DTOs de `apps/api/src/**\/*.controller.ts` sont des
 * interfaces locales non exportées — ces types sont calqués dessus à la main tant qu'il n'existe
 * pas de lib `api-contracts` partagée. Les types domaine réels (`LearningPlan`, `MasteryState`...)
 * sont importés directement depuis `@unisson/*` (voir modules `lib/api/*.ts`).
 */
import type { LearningPlan } from '@unisson/learning-engine';
import type { MasteryStage, MasteryState } from '@unisson/learner-modeling';
import type { AssessmentEvidence, ErrorType } from '@unisson/assessment';
import type { Format, LearningObject } from '@unisson/content';
import type { ActivityKind, ConceptCycleStage } from '@unisson/learning-engine';

export interface StructuredGoalResponse {
  id: string;
  learnerId: string;
  domain: string;
  rawStatement: string;
  targetSkills: string[];
  targetLevel: string;
  motivation?: string;
  constraints: { minutesPerDay?: number; deadline?: string; preferredFormats?: string[] };
  confidence: number;
  clarificationsNeeded: string[];
  successCriteria?: Array<{ id: string; description: string; measurable: boolean }>;
}

export interface CreatePlanResponse {
  plan: LearningPlan;
  events: string[];
}

export interface NextActivityResponse {
  activity: {
    kind: ActivityKind;
    conceptId?: string;
    skillId?: string;
    cycleStage?: ConceptCycleStage;
    targetDifficulty?: number;
    rationale: string;
  };
  planId: string;
  planVersion: number;
}

export interface SelectFormatResponse {
  format: Format;
  difficulty: number;
  rationale: string;
  fallbackFormats: Format[];
  masteryStage: MasteryStage;
  cycleStage?: ConceptCycleStage;
  learningObject: LearningObject;
  events: string[];
}

export interface SubmitAnswerResponse {
  evidence: AssessmentEvidence;
  state: MasteryState | null;
  stage: MasteryStage | null;
  cycleState?: { stage: ConceptCycleStage } | null;
  events: string[];
}

export interface MasteryResponse {
  state: MasteryState;
  retrievability: number;
  memoryRetention: number;
  stage: MasteryStage;
  isDue: boolean;
  cycleStage?: ConceptCycleStage | null;
}

export interface EvidenceResponse {
  state: MasteryState;
  retrievability: number;
  stage: MasteryStage;
  isDue: boolean;
  cycleState?: { stage: ConceptCycleStage } | null;
  events: string[];
}

export interface DiagnosticProbeDto {
  conceptId: string;
  skillId: string;
  difficulty: number;
}

export interface StartDiagnosticResponse {
  sessionId: string;
  done: boolean;
  nextProbe: DiagnosticProbeDto | null;
  events: string[];
}

export interface ConceptPriorDto {
  conceptId: string;
  pMastery: number;
  confidence: number;
}

export interface AnswerDiagnosticResponse {
  done: boolean;
  nextProbe: DiagnosticProbeDto | null;
  priors: ConceptPriorDto[] | null;
  seededConcepts: number;
  events: string[];
}

export interface SkillDto {
  id: string;
  title: string;
  domain: string;
}

export interface ConceptDto {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  difficulty: number;
}

export interface SkillPrerequisitesResponse {
  skill: SkillDto;
  direct: SkillDto[];
  transitive: string[];
}

export type { ErrorType };
