import 'server-only';
import type { ConceptType } from '@unisson/knowledge-graph';
import type { ConceptCycleStage, LearnerFormatContext, PedagogicalIntent } from '@unisson/learning-engine';
import { api } from './http';
import type { SelectFormatResponse } from './types';

/** Format Selector (§6.5) : choisit la modalité (règles → bandit) puis génère le contenu concret. */
export function selectFormat(input: {
  learnerId: string;
  conceptId: string;
  skillId: string;
  conceptType?: ConceptType;
  intent?: PedagogicalIntent;
  cycleStage?: ConceptCycleStage;
  hasMisconception?: boolean;
  targetDifficulty?: number;
  learnerContext?: LearnerFormatContext;
}): Promise<SelectFormatResponse> {
  const { learnerId, ...body } = input;
  return api.post<SelectFormatResponse>(`/learners/${encodeURIComponent(learnerId)}/format`, body);
}
