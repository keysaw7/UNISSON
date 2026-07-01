import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { LearningPlan } from '@unisson/learning-engine';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RationaleCallout } from '@/components/rationale-callout';

const STATUS_LABEL: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' }> = {
  mastered: { label: 'Maîtrisé', variant: 'success' },
  to_remediate: { label: 'À remédier', variant: 'warning' },
  to_acquire: { label: 'À acquérir', variant: 'secondary' },
};

export function PlanView({ plan }: { plan: LearningPlan }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Votre parcours</span>
          <Badge variant="outline">v{plan.version}</Badge>
        </CardTitle>
        <CardDescription>
          {plan.skillOrder.length} compétence{plan.skillOrder.length > 1 ? 's' : ''} · ~{plan.estimatedEffortMinutes}{' '}
          min estimées
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!plan.assumptions.feasible && (
          <RationaleCallout className="border-amber-500/30 bg-amber-500/10">
            <span className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-4" /> Objectif potentiellement irréaliste
            </span>{' '}
            avec le rythme indiqué ({plan.assumptions.minutesPerDay ?? '?'} min/jour) : le moteur propose le plan
            quand même, à vous de réduire le périmètre ou d&apos;allonger le délai.
          </RationaleCallout>
        )}

        <ol className="flex flex-col gap-3">
          {plan.skillOrder.map((skill, i) => {
            const status = STATUS_LABEL[skill.status] ?? { label: skill.status, variant: 'secondary' as const };
            return (
              <li key={skill.skillId} className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {i + 1}
                  </span>
                  <span className="font-medium">{skill.title}</span>
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">~{skill.estimatedEffortMinutes} min</span>
                </div>
                <p className="pl-8 text-sm text-muted-foreground">{skill.rationale}</p>
              </li>
            );
          })}
        </ol>
      </CardContent>
      <CardFooter>
        <Button asChild>
          <Link href={`/session?planId=${plan.id}`}>
            <CheckCircle2 /> Commencer une session <ArrowRight />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
