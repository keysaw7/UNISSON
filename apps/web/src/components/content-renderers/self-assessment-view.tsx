'use client';

import type { LearningObject } from '@unisson/content';
import { CheckCircle2, Lightbulb, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FORMAT_LABELS } from '@/features/practice-session/format-labels';

export function SelfAssessmentView({
  learningObject,
  onAssess,
  disabled,
  hintsEnabled,
  onHintUsed,
}: {
  learningObject: LearningObject;
  onAssess: (correct: boolean) => void;
  disabled?: boolean;
  hintsEnabled?: boolean;
  onHintUsed?: () => void;
}) {
  const [hintVisible, setHintVisible] = useState(false);

  function revealHint() {
    setHintVisible(true);
    onHintUsed?.();
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 pt-6">
        <div className="text-sm font-medium text-primary">{FORMAT_LABELS[learningObject.format]}</div>
        <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-border bg-muted/40 px-6 py-8 text-center">
          <p className="whitespace-pre-line text-lg">{learningObject.contentRef}</p>
        </div>
        {hintsEnabled && hintVisible && (
          <p className="text-center text-sm text-muted-foreground">
            Indice : rappelez-vous la règle ou l&apos;exemple travaillé juste avant.
          </p>
        )}
        <p className="text-center text-sm text-muted-foreground">Auto-évaluez-vous avant de continuer.</p>
        <div className="grid grid-cols-2 gap-3">
          {hintsEnabled && !hintVisible && (
            <Button type="button" variant="outline" className="col-span-2" disabled={disabled} onClick={revealHint}>
              <Lightbulb /> Indice
            </Button>
          )}
          <Button variant="outline" size="lg" disabled={disabled} onClick={() => onAssess(false)}>
            <XCircle /> Je ne savais pas
          </Button>
          <Button size="lg" disabled={disabled} onClick={() => onAssess(true)}>
            <CheckCircle2 /> Je savais
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
