import type { LearningObject } from '@unisson/content';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FORMAT_LABELS } from '@/features/practice-session/format-labels';

/**
 * Rendu générique par auto-évaluation (façon flashcard/Anki) : le format légitime cette approche
 * (`flashcard_recognition`, `spaced_review`...) et compense le contrat `generate_content` actuel
 * qui ne fournit pas de réponse attendue exploitable pour une correction automatique (§1 du plan
 * frontend, "contrat de contenu encore minimal"). Envoie l'évidence via `POST /evidence`.
 */
export function SelfAssessmentView({
  learningObject,
  onAssess,
  disabled,
}: {
  learningObject: LearningObject;
  onAssess: (correct: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5 pt-6">
        <div className="text-sm font-medium text-primary">{FORMAT_LABELS[learningObject.format]}</div>
        <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-border bg-muted/40 px-6 py-8 text-center">
          <p className="whitespace-pre-line text-lg">{learningObject.contentRef}</p>
        </div>
        <p className="text-center text-sm text-muted-foreground">Auto-évaluez-vous avant de continuer.</p>
        <div className="grid grid-cols-2 gap-3">
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
