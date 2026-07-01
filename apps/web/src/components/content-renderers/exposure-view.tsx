import { BookOpen } from 'lucide-react';
import type { LearningObject } from '@unisson/content';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/** Formats d'exposition (`explanation`, `worked_example`) : pas d'évidence à collecter, on avance. */
export function ExposureView({ learningObject, onContinue }: { learningObject: LearningObject; onContinue: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <BookOpen className="size-4" /> À lire
        </div>
        <p className="whitespace-pre-line text-base leading-relaxed">{learningObject.contentRef}</p>
        <div>
          <Button onClick={onContinue}>J&apos;ai compris, continuer</Button>
        </div>
      </CardContent>
    </Card>
  );
}
