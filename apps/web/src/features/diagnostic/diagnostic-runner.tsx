'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RationaleCallout } from '@/components/rationale-callout';
import { humanizeId } from '@/lib/utils';
import type { DeclaredLevel } from '@/lib/api/diagnostic';
import type { ConceptPriorDto, DiagnosticProbeDto } from '@/lib/api/types';
import { answerDiagnosticAction, startDiagnosticAction } from './actions';

// Budget par défaut du diagnostic (§6.2, StartDiagnosticUseCase) — sert d'estimation de
// progression côté UI ; le vrai critère d'arrêt reste géré par le moteur (budget OU incertitude).
const ESTIMATED_BUDGET = 10;

interface Props {
  domain: string;
  targetSkills: string[];
  declaredLevel: DeclaredLevel;
  goalId?: string;
  motivation?: string;
}

interface RunState {
  sessionId: string | null;
  probe: DiagnosticProbeDto | null;
  askedCount: number;
  done: boolean;
  priors: ConceptPriorDto[] | null;
  seededConcepts: number;
}

const INITIAL_RUN_STATE: RunState = { sessionId: null, probe: null, askedCount: 0, done: false, priors: null, seededConcepts: 0 };

export function DiagnosticRunner({ domain, targetSkills, declaredLevel, goalId, motivation }: Props) {
  const [run, setRun] = useState<RunState>(INITIAL_RUN_STATE);

  const start = useMutation({
    mutationFn: () => startDiagnosticAction({ domain, targetSkills, declaredLevel }),
    onSuccess: (res) => setRun((r) => ({ ...r, sessionId: res.sessionId, probe: res.nextProbe, done: res.done })),
  });

  const answer = useMutation({
    mutationFn: (correct: boolean) => {
      if (!run.sessionId || !run.probe) throw new Error('Session de diagnostic non initialisée.');
      return answerDiagnosticAction({ sessionId: run.sessionId, conceptId: run.probe.conceptId, correct });
    },
    onSuccess: (res) =>
      setRun((r) => ({
        ...r,
        askedCount: r.askedCount + 1,
        probe: res.nextProbe,
        done: res.done,
        priors: res.priors,
        seededConcepts: res.seededConcepts,
      })),
  });

  useEffect(() => {
    if (targetSkills.length > 0) start.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne (re)démarrer que si les cibles changent
  }, [domain, JSON.stringify(targetSkills), declaredLevel]);

  const planHref = `/plan?${new URLSearchParams({
    domain,
    ...(goalId ? { goalId } : {}),
    ...(motivation ? { motivation } : {}),
    targetSkills: targetSkills.join(','),
  }).toString()}`;

  if (targetSkills.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Aucune compétence cible sélectionnée. <Link href="/goal" className="underline">Retournez à l&apos;étape objectif</Link>.
        </CardContent>
      </Card>
    );
  }

  const error = start.error ?? answer.error;
  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 text-sm">
          <p className="text-destructive">{error instanceof Error ? error.message : 'Erreur inattendue.'}</p>
          <div>
            <Button variant="outline" onClick={() => start.mutate()}>
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (start.isPending && !run.sessionId) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 pt-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Préparation du diagnostic adaptatif…
        </CardContent>
      </Card>
    );
  }

  if (run.done) {
    const sorted = [...(run.priors ?? [])].sort((a, b) => b.pMastery - a.pMastery);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600" /> Diagnostic terminé
          </CardTitle>
          <CardDescription>
            {run.seededConcepts} concept{run.seededConcepts > 1 ? 's' : ''} initialisé{run.seededConcepts > 1 ? 's' : ''} dans
            votre modèle de maîtrise à partir de {run.askedCount} question{run.askedCount > 1 ? 's' : ''}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RationaleCallout>
            Le diagnostic n&apos;a besoin que de quelques questions ciblées car il propage vos réponses sur le
            graphe de prérequis (réussir un concept avancé implique les prérequis ; échouer sur un concept de
            base implique les suivants).
          </RationaleCallout>
          {sorted.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {sorted.map((p) => (
                <li key={p.conceptId} className="flex items-center justify-between gap-2 border-b border-border/60 py-1.5 last:border-0">
                  <span>{humanizeId(p.conceptId)}</span>
                  <span className="flex items-center gap-2">
                    <Progress value={p.pMastery * 100} className="w-24" />
                    <span className="w-10 text-right text-xs text-muted-foreground">{Math.round(p.pMastery * 100)}%</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div>
            <Button asChild>
              <Link href={planHref}>
                Construire mon plan <ArrowRight />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Question de diagnostic</CardTitle>
        <CardDescription>
          Le moteur choisit le concept le plus informatif à tester ensuite — pas d&apos;ordre fixe.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progression estimée</span>
            <span>~{Math.min(run.askedCount, ESTIMATED_BUDGET)}/{ESTIMATED_BUDGET}</span>
          </div>
          <Progress value={Math.min(100, (run.askedCount / ESTIMATED_BUDGET) * 100)} />
        </div>

        {run.probe && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/40 py-10 text-center">
            <Badge variant="outline">{humanizeId(run.probe.skillId)}</Badge>
            <p className="text-xl font-medium">{humanizeId(run.probe.conceptId)}</p>
            <p className="text-sm text-muted-foreground">Maîtrisez-vous déjà ce concept ?</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" disabled={answer.isPending} onClick={() => answer.mutate(false)}>
            <XCircle /> Pas encore
          </Button>
          <Button size="lg" disabled={answer.isPending} onClick={() => answer.mutate(true)}>
            <CheckCircle2 /> Je maîtrise
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
