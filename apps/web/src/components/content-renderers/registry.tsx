import type { LearningObject } from '@unisson/content';
import { ExposureView } from './exposure-view';
import { SelfAssessmentView } from './self-assessment-view';
import { McqView } from './mcq-view';
import { tryParseStructuredMcq } from './parse-structured';

const EXPOSURE_FORMATS = new Set(['explanation', 'worked_example']);

export interface ContentRendererProps {
  learningObject: LearningObject;
  disabled?: boolean;
  onContinue: () => void;
  onSelfAssess: (correct: boolean) => void;
  onStructuredAnswer: (input: { learnerAnswer: string; expected: string }) => void;
}

/**
 * Registre de rendu par `Format` (§6.5, §2 du plan frontend "Rendu de contenu piloté par
 * `Format`"). Dégrade en auto-évaluation tant que `generate_content` ne fournit qu'un texte brut ;
 * bascule automatiquement en QCM structuré si le contenu contient un JSON `{prompt, choices,
 * correctAnswer}` exploitable — sans qu'aucun écran appelant n'ait à changer.
 */
export function ContentRenderer({ learningObject, disabled, onContinue, onSelfAssess, onStructuredAnswer }: ContentRendererProps) {
  if (EXPOSURE_FORMATS.has(learningObject.format)) {
    return <ExposureView learningObject={learningObject} onContinue={onContinue} />;
  }

  if (learningObject.format === 'mcq') {
    const structured = tryParseStructuredMcq(learningObject.contentRef);
    if (structured) {
      return (
        <McqView
          content={structured}
          disabled={disabled}
          onAnswer={(learnerAnswer) => onStructuredAnswer({ learnerAnswer, expected: structured.correctAnswer })}
        />
      );
    }
  }

  return <SelfAssessmentView learningObject={learningObject} disabled={disabled} onAssess={onSelfAssess} />;
}
