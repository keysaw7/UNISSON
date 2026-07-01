import { asId, type ActivityId, type ConceptId } from '@unisson/shared-kernel';
import type { AssessmentEvidence, EvidenceSignals } from '../domain/assessment-evidence';
import { classifyError, computeEvidenceWeight } from '../domain/error-analysis';
import { gradeExact, gradeFuzzy, type ScoreResult } from '../domain/scoring';
import type { GradingInput, GradingStrategyPort } from '../ports/grading-strategy.port';

const DEFAULT_SIGNALS: EvidenceSignals = { latencyMs: 5000, usedHint: false, attempts: 1 };

/**
 * Correction par RÈGLES (§6.4) : méthode fiable la moins chère d'abord. `exact` → déterministe,
 * `short_answer` → fuzzy. `free_text` relèvera de l'AI Gateway (capability `grade_free_text`) —
 * non branché ici, on lève explicitement pour ne pas produire une fausse évidence.
 */
export class RuleBasedGradingStrategy implements GradingStrategyPort {
  async grade(input: GradingInput): Promise<AssessmentEvidence> {
    const signals: EvidenceSignals = { ...DEFAULT_SIGNALS, ...input.signals };
    const difficulty = input.difficulty ?? 0.5;

    let result: ScoreResult;
    switch (input.activityType) {
      case 'exact':
        result = gradeExact(input.expected, input.learnerAnswer);
        break;
      case 'short_answer':
        result = gradeFuzzy(input.expected, input.learnerAnswer);
        break;
      case 'free_text':
        throw new Error("grade_free_text nécessite l'AI Gateway (non branché en Phase 3).");
    }

    const errorType = classifyError({
      correct: result.correct,
      score: result.score,
      difficulty,
      signals,
    });

    return {
      activityId: asId<'ActivityId'>(input.activityId) as ActivityId,
      conceptsCovered: input.conceptsCovered.map((c) => asId<'ConceptId'>(c) as ConceptId),
      correct: result.correct,
      score: result.score,
      errorType,
      signals,
      evidenceWeight: computeEvidenceWeight(errorType, signals),
    };
  }
}
