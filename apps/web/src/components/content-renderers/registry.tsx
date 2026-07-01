import type { LearningObject } from '@unisson/content';
import { ExposureView } from './exposure-view';
import { SelfAssessmentView } from './self-assessment-view';
import { McqView } from './mcq-view';
import { tryParseStructuredMcq } from './parse-structured';

const EXPOSURE_FORMATS = new Set(['explanation', 'worked_example', 'activation_probe']);

export interface ContentRendererProps {
  learningObject: LearningObject;
  disabled?: boolean;
  hintsEnabled?: boolean;
  onHintUsed?: () => void;
  onContinue: () => void;
  onSelfAssess: (correct: boolean) => void;
  onStructuredAnswer: (input: { learnerAnswer: string; expected: string }) => void;
}

export function ContentRenderer({
  learningObject,
  disabled,
  hintsEnabled,
  onHintUsed,
  onContinue,
  onSelfAssess,
  onStructuredAnswer,
}: ContentRendererProps) {
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
          hintsEnabled={hintsEnabled}
          onHintUsed={onHintUsed}
          onAnswer={(learnerAnswer) => onStructuredAnswer({ learnerAnswer, expected: structured.correctAnswer })}
        />
      );
    }
  }

  return (
    <SelfAssessmentView
      learningObject={learningObject}
      disabled={disabled}
      hintsEnabled={hintsEnabled}
      onHintUsed={onHintUsed}
      onAssess={onSelfAssess}
    />
  );
}
