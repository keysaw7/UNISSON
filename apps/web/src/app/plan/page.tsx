import Link from 'next/link';
import { CreatePlanForm } from '@/features/plan/create-plan-form';
import { PlanView } from '@/features/plan/plan-view';
import { LearningHistory } from '@/features/history/learning-history';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getLearnerId } from '@/lib/get-learner-id';
import { plansApi } from '@/lib/api';

interface PlanPageProps {
  searchParams: Promise<{
    domain?: string;
    targetSkills?: string;
    goalId?: string;
    motivation?: string;
  }>;
}

export default async function PlanPage({ searchParams }: PlanPageProps) {
  const sp = await searchParams;
  const targetSkills = sp.targetSkills?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plan</h1>
        <p className="text-sm text-muted-foreground">Curriculum Planner — §6.3 ARCHITECTURE.md</p>
      </div>

      <LearningHistory />

      {targetSkills.length > 0 ? (
        <CreatePlanForm domain={sp.domain ?? 'japanese'} targetSkills={targetSkills} goalId={sp.goalId} motivation={sp.motivation} />
      ) : (
        <ExistingPlanOrEmptyState />
      )}
    </div>
  );
}

async function ExistingPlanOrEmptyState() {
  const learnerId = await getLearnerId();
  const plans = await plansApi.listPlansForLearner(learnerId).catch(() => []);
  const latest = [...plans].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  if (!latest) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 pt-6 text-sm text-muted-foreground">
          <p>Vous n&apos;avez pas encore de plan. Commencez par définir un objectif et un diagnostic.</p>
          <Button asChild>
            <Link href="/goal">Définir mon objectif</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <PlanView plan={latest} />;
}
