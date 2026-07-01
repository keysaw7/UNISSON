'use server';

import type { ConceptType } from '@unisson/knowledge-graph';
import type { LearnerFormatContext, PedagogicalIntent } from '@unisson/learning-engine';
import type { ActivityType } from '@unisson/assessment';
import { getLearnerId } from '@/lib/get-learner-id';
import { plansApi, graphApi, formatApi, learnersApi } from '@/lib/api';
import type { NextActivityResponse, SelectFormatResponse, SubmitAnswerResponse, EvidenceResponse } from '@/lib/api/types';

export interface NextStepResult {
  activity: NextActivityResponse['activity'];
  format: SelectFormatResponse | null;
}

function mapKindToIntent(kind: string): PedagogicalIntent {
  switch (kind) {
    case 'introduce':
      return 'introduce';
    case 'remediate':
      return 'remediate';
    case 'review':
      return 'review';
    default:
      return 'practice';
  }
}

/**
 * Orchestration Sequencer → Format Selector (§9, §6.5) en un seul aller-retour serveur :
 * détermine l'activité, résout le type du concept (§7) puis choisit le format + génère le
 * contenu concret.
 */
export async function loadNextStepAction(input: {
  planId: string;
  learnerContext?: LearnerFormatContext;
}): Promise<NextStepResult> {
  const learnerId = await getLearnerId();
  const next = await plansApi.getNextActivity({ learnerId, planId: input.planId });
  const { activity } = next;

  if (activity.kind === 'idle' || !activity.conceptId || !activity.skillId) {
    return { activity, format: null };
  }

  const concepts = await graphApi.getConceptsForSkill(activity.skillId).catch(() => []);
  const concept = concepts.find((c) => c.id === activity.conceptId);

  const format = await formatApi.selectFormat({
    learnerId,
    conceptId: activity.conceptId,
    skillId: activity.skillId,
    conceptType: (concept?.type as ConceptType | undefined) ?? 'generic',
    intent: mapKindToIntent(activity.kind),
    targetDifficulty: activity.targetDifficulty,
    learnerContext: input.learnerContext,
  });

  return { activity, format };
}

export async function submitEvidenceAction(input: {
  conceptId: string;
  correct: boolean;
  score?: number;
  difficulty?: number;
  responseTimeMs?: number;
}): Promise<EvidenceResponse> {
  const learnerId = await getLearnerId();
  return learnersApi.submitEvidence({ learnerId, ...input });
}

export async function submitAnswerAction(input: {
  activityId: string;
  activityType: ActivityType;
  expected: string;
  learnerAnswer: string;
  conceptsCovered: string[];
  difficulty?: number;
  signals?: { latencyMs?: number; usedHint?: boolean; attempts?: number };
}): Promise<SubmitAnswerResponse> {
  const learnerId = await getLearnerId();
  return learnersApi.submitAnswer({ learnerId, ...input });
}
