'use client';

import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlanView } from './plan-view';
import { createPlanAction, type PlanFormState } from './actions';

interface Props {
  domain: string;
  targetSkills: string[];
  goalId?: string;
  motivation?: string;
}

const INITIAL_STATE: PlanFormState = {};

export function CreatePlanForm({ domain, targetSkills, goalId, motivation }: Props) {
  const [state, formAction, isPending] = useActionState(createPlanAction, INITIAL_STATE);

  if (state.result) {
    return <PlanView plan={state.result.plan} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Construire votre plan</CardTitle>
        <CardDescription>
          {targetSkills.length} compétence{targetSkills.length > 1 ? 's' : ''} cible{targetSkills.length > 1 ? 's' : ''}{' '}
          diagnostiquée{targetSkills.length > 1 ? 's' : ''}. Indiquez votre rythme pour un plan réaliste (§6.3).
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <input type="hidden" name="domain" value={domain} />
          <input type="hidden" name="targetSkills" value={targetSkills.join(',')} />
          {goalId && <input type="hidden" name="goalId" value={goalId} />}
          {motivation && <input type="hidden" name="motivation" value={motivation} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="minutesPerDay">Minutes par jour disponibles</Label>
              <Input id="minutesPerDay" name="minutesPerDay" type="number" min={1} defaultValue={20} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="horizonDays">Horizon (jours)</Label>
              <Input id="horizonDays" name="horizonDays" type="number" min={1} defaultValue={30} />
            </div>
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : null}
            Générer mon plan
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
