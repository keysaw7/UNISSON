import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getLearnerId } from '@/lib/get-learner-id';
import { conceptLabel } from '@/features/mastery/concept-label';
import { loadMasteryOverview } from '@/features/mastery/load-mastery-overview';
import { STAGE_INFO } from '@/features/mastery/stage-labels';

const DOMAIN = 'japanese'; // domaine pilote unique (§14) — à paramétrer quand le moteur en gèrera plusieurs.

export default async function MasteryPage() {
  const learnerId = await getLearnerId();
  const groups = await loadMasteryOverview(learnerId, DOMAIN);

  const allConcepts = groups.flatMap((g) => g.concepts);
  const dueCount = allConcepts.filter((c) => c.mastery.isDue).length;
  const averageMastery =
    allConcepts.length > 0 ? allConcepts.reduce((sum, c) => sum + c.mastery.state.pMastery, 0) / allConcepts.length : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Maîtrise</h1>
        <p className="text-sm text-muted-foreground">Modèle Maîtrise + Oubli (FSRS + bayésien) — §8 ARCHITECTURE.md</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Maîtrise moyenne</CardDescription>
            <CardTitle className="text-3xl">{Math.round(averageMastery * 100)}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Concepts suivis</CardDescription>
            <CardTitle className="text-3xl">{allConcepts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-1">
              <Clock className="size-3.5" /> À réviser maintenant
            </CardDescription>
            <CardTitle className="text-3xl">{dueCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        {groups.map(({ skill, concepts }) => (
          <Card key={skill.id}>
            <CardHeader>
              <CardTitle>{skill.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {concepts.length === 0 && <p className="text-sm text-muted-foreground">Aucun concept rattaché.</p>}
              {concepts.map(({ concept, mastery }) => {
                const { title, subtitle } = conceptLabel(concept);
                const stage = STAGE_INFO[mastery.stage];
                return (
                  <div key={concept.id} className="flex flex-col gap-1.5 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{title}</span>
                      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
                      <Badge variant={stage.variant}>{stage.label}</Badge>
                      {mastery.isDue && (
                        <Badge variant="warning" className="flex items-center gap-1">
                          <Clock className="size-3" /> à réviser
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={mastery.state.pMastery * 100} className="max-w-64" />
                      <span className="text-xs text-muted-foreground">{Math.round(mastery.state.pMastery * 100)}%</span>
                      <span className="text-xs text-muted-foreground">
                        · rétrievabilité {Math.round(mastery.retrievability * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
