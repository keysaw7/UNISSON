'use client';

import { useState } from 'react';
import { CheckCircle2, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { StructuredMcqContent } from './parse-structured';

export function McqView({
  content,
  onAnswer,
  disabled,
  hintsEnabled,
  onHintUsed,
}: {
  content: StructuredMcqContent;
  onAnswer: (learnerAnswer: string) => void;
  disabled?: boolean;
  hintsEnabled?: boolean;
  onHintUsed?: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hintVisible, setHintVisible] = useState(false);

  function revealHint() {
    setHintVisible(true);
    onHintUsed?.();
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 pt-6">
        <p className="text-lg font-medium">{content.prompt}</p>
        {hintsEnabled && hintVisible && (
          <p className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
            Indice : éliminez les options qui ne correspondent pas au contexte du concept.
          </p>
        )}
        <RadioGroup value={selected ?? undefined} onValueChange={setSelected}>
          {content.choices.map((choice, i) => (
            <div key={choice} className="flex items-center">
              <RadioGroupItem value={choice} id={`choice-${i}`} className="w-full">
                <Label htmlFor={`choice-${i}`} className="flex-1 cursor-pointer">
                  {choice}
                </Label>
              </RadioGroupItem>
            </div>
          ))}
        </RadioGroup>
        <div className="flex flex-wrap gap-2">
          {hintsEnabled && !hintVisible && (
            <Button type="button" variant="outline" disabled={disabled} onClick={revealHint}>
              <Lightbulb /> Indice
            </Button>
          )}
          <Button disabled={!selected || disabled} onClick={() => selected && onAnswer(selected)}>
            <CheckCircle2 /> Valider ma réponse
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
