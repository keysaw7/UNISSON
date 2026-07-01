'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { StructuredMcqContent } from './parse-structured';

export function McqView({
  content,
  onAnswer,
  disabled,
}: {
  content: StructuredMcqContent;
  onAnswer: (learnerAnswer: string) => void;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 pt-6">
        <p className="text-lg font-medium">{content.prompt}</p>
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
        <div>
          <Button disabled={!selected || disabled} onClick={() => selected && onAnswer(selected)}>
            <CheckCircle2 /> Valider ma réponse
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
