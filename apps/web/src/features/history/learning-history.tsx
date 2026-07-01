import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getLearnerId } from '@/lib/get-learner-id';
import { goalsApi, plansApi } from '@/lib/api';

/** Historique des objectifs et plans passés (reprise de session, P2). */
export async function LearningHistory() {
  const learnerId = await getLearnerId();
  const [goals, plans] = await Promise.all([
    goalsApi.listGoalsForLearner(learnerId).catch(() => []),
    plansApi.listPlansForLearner(learnerId).catch(() => []),
  ]);

  if (goals.length === 0 && plans.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Historique</CardTitle>
        <CardDescription>Vos objectifs et plans précédents sur cet appareil.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {goals.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="font-medium text-foreground">Objectifs</p>
            <ul className="flex flex-col gap-1.5">
              {[...goals].reverse().slice(0, 5).map((g) => (
                <li key={g.id} className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-1.5 last:border-0">
                  <span className="text-muted-foreground truncate max-w-[16rem]">« {g.rawStatement} »</span>
                  <Badge variant="secondary">{g.domain}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
        {plans.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="font-medium text-foreground">Plans</p>
            <ul className="flex flex-col gap-1.5">
              {[...plans].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-1.5 last:border-0">
                  <span>{p.domain}</span>
                  <Badge variant="outline">v{p.version}</Badge>
                  <span className="text-xs text-muted-foreground">{p.skillOrder.length} compétences</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
