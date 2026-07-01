'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Loader2, PartyPopper, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RationaleCallout } from '@/components/rationale-callout';
import { ContentRenderer } from '@/components/content-renderers/registry';
import { useDeviceFormatContext } from '@/lib/device-context';
import { humanizeId } from '@/lib/utils';
import { CYCLE_STAGE_INFO } from './cycle-stage-labels';
import { ERROR_TYPE_INFO } from './error-type-labels';
import {
  advanceCycleAction,
  loadNextStepAction,
  submitAnswerAction,
  submitEvidenceAction,
  type NextStepResult,
} from './actions';
import { useSessionStore } from './store';

interface Feedback {
  stage?: string | null;
  cycleStage?: string | null;
  label: string;
  explanation: string;
  tone: 'success' | 'warning' | 'destructive';
}

export function SessionRunner({ planId }: { planId: string }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [usedHint, setUsedHint] = useState(false);
  const startedAtRef = useRef<number>(0);
  const deviceContext = useDeviceFormatContext();
  const {
    itemsCompleted,
    recentFormats,
    pendingMisconception,
    lastConceptId,
    recordCompletion,
    setPendingMisconception,
    setLastConceptId,
  } = useSessionStore();

  const nextStep = useMutation({
    mutationFn: () =>
      loadNextStepAction({
        planId,
        learnerContext: { ...deviceContext, recentFormats },
        hasMisconception: pendingMisconception,
        lastConceptId,
      }),
    onSuccess: (data) => {
      startedAtRef.current = Date.now();
      setUsedHint(false);
      setPendingMisconception(false);
      setFeedback(null);
      if (data.activity.conceptId) setLastConceptId(data.activity.conceptId);
    },
  });

  useEffect(() => {
    nextStep.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ne recharger qu'à la demande
  }, [planId]);

  const step: NextStepResult | undefined = nextStep.data;
  const cycleStage = step?.activity.cycleStage ?? step?.format?.cycleStage;
  const hintsEnabled = cycleStage === 'guidedPractice';

  const evidence = useMutation({
    mutationFn: (correct: boolean) => {
      if (!step?.activity.conceptId || !step.format) throw new Error('Activité non chargée.');
      return submitEvidenceAction({
        conceptId: step.activity.conceptId,
        skillId: step.activity.skillId,
        cycleStage: step.activity.cycleStage ?? step.format.cycleStage,
        correct,
        score: correct ? 1 : 0,
        difficulty: step.format.difficulty,
        responseTimeMs: Date.now() - startedAtRef.current,
        usedHint,
      });
    },
    onSuccess: (res, correct) => {
      if (step?.format) recordCompletion(step.format.format);
      setFeedback({
        stage: res.stage,
        cycleStage: res.cycleState?.stage ?? cycleStage ?? null,
        label: correct ? 'Correct' : 'Pas encore',
        explanation: correct
          ? 'Votre maîtrise de ce concept progresse.'
          : 'Ce concept sera reproposé plus tôt (rétrievabilité réduite).',
        tone: correct ? 'success' : 'warning',
      });
    },
  });

  const answer = useMutation({
    mutationFn: (input: { learnerAnswer: string; expected: string }) => {
      if (!step?.activity.conceptId || !step.format) throw new Error('Activité non chargée.');
      return submitAnswerAction({
        activityId: crypto.randomUUID(),
        activityType: 'exact',
        expected: input.expected,
        learnerAnswer: input.learnerAnswer,
        conceptsCovered: [step.activity.conceptId],
        skillId: step.activity.skillId,
        cycleStage: step.activity.cycleStage ?? step.format.cycleStage,
        difficulty: step.format.difficulty,
        signals: { latencyMs: Date.now() - startedAtRef.current, usedHint, attempts: 1 },
      });
    },
    onSuccess: (res) => {
      if (step?.format) recordCompletion(step.format.format);
      const info = ERROR_TYPE_INFO[res.evidence.errorType];
      if (res.evidence.errorType === 'misconception') setPendingMisconception(true);
      setFeedback({
        stage: res.stage,
        cycleStage: res.cycleState?.stage ?? cycleStage ?? null,
        label: info.label,
        explanation: info.explanation,
        tone: info.tone,
      });
    },
  });

  async function handleContinue() {
    if (!step?.activity.conceptId || !step.activity.skillId || !cycleStage) {
      if (step?.format) recordCompletion(step.format.format);
      nextStep.mutate();
      return;
    }
    await advanceCycleAction({
      conceptId: step.activity.conceptId,
      skillId: step.activity.skillId,
      event:
        cycleStage === 'activation'
          ? { type: 'activation_completed' }
          : { type: 'exposure_completed' },
    });
    if (step.format) recordCompletion(step.format.format);
    nextStep.mutate();
  }

  const busy = evidence.isPending || answer.isPending;
  const error = nextStep.error ?? evidence.error ?? answer.error;

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 text-sm">
          <p className="text-destructive">{error instanceof Error ? error.message : 'Erreur inattendue.'}</p>
          <div>
            <Button variant="outline" onClick={() => nextStep.mutate()}>
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (nextStep.isPending || !step) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 pt-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Préparation de la prochaine activité…
        </CardContent>
      </Card>
    );
  }

  if (step.activity.kind === 'idle' || !step.format) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <PartyPopper className="size-8 text-primary" />
          <p className="text-lg font-medium">Rien à réviser pour l&apos;instant</p>
          <p className="text-sm text-muted-foreground">{step.activity.rationale}</p>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/plan">Voir le plan</Link>
            </Button>
            <Button asChild>
              <Link href="/mastery">Voir ma maîtrise</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cycleInfo = cycleStage ? CYCLE_STAGE_INFO[cycleStage] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Sparkles className="size-4" /> {itemsCompleted} activité{itemsCompleted !== 1 ? 's' : ''} complétée
          {itemsCompleted !== 1 ? 's' : ''} cette session
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {cycleInfo && (
            <Badge variant="secondary" title={cycleInfo.description}>
              Étape : {cycleInfo.label}
            </Badge>
          )}
          {step.activity.skillId && <Badge variant="outline">{humanizeId(step.activity.skillId)}</Badge>}
        </div>
      </div>

      {!feedback && (
        <>
          <RationaleCallout>
            {step.activity.rationale} · {step.format.rationale}
          </RationaleCallout>
          <ContentRenderer
            learningObject={step.format.learningObject}
            disabled={busy}
            hintsEnabled={hintsEnabled}
            onHintUsed={() => setUsedHint(true)}
            onContinue={handleContinue}
            onSelfAssess={(correct) => evidence.mutate(correct)}
            onStructuredAnswer={(input) => answer.mutate(input)}
          />
        </>
      )}

      {feedback && (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={feedback.tone}>{feedback.label}</Badge>
              {feedback.stage && <Badge variant="outline">maîtrise : {feedback.stage}</Badge>}
              {feedback.cycleStage && (
                <Badge variant="outline">
                  cycle : {CYCLE_STAGE_INFO[feedback.cycleStage as keyof typeof CYCLE_STAGE_INFO]?.label ?? feedback.cycleStage}
                </Badge>
              )}
            </div>
            <RationaleCallout>{feedback.explanation}</RationaleCallout>
            <div>
              <Button onClick={() => nextStep.mutate()}>
                Activité suivante <ArrowRight />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
