'use client';

import { useActionState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RationaleCallout } from '@/components/rationale-callout';
import { submitGoalAction, type GoalFormState } from './actions';

const DECLARED_LEVELS = [
  { value: 'beginner', label: 'Grand débutant' },
  { value: 'novice', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
] as const;

const INITIAL_STATE: GoalFormState = {};

export function GoalForm() {
  const [state, formAction, isPending] = useActionState(submitGoalAction, INITIAL_STATE);
  const { goal, availableSkills = [] } = state;

  const suggested = new Set(goal?.targetSkills ?? []);
  const preselected = availableSkills.filter((s) => suggested.has(s.id));
  const skillsToShow = preselected.length > 0 ? availableSkills : availableSkills;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Quel est votre objectif ?</CardTitle>
          <CardDescription>
            Décrivez-le en langage libre — le moteur l&apos;analyse et propose une cible dans le graphe de
            compétences (§6.1). L&apos;IA propose, le moteur décide.
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="flex flex-col gap-3">
            <Label htmlFor="statement">Votre objectif</Label>
            <Textarea
              id="statement"
              name="statement"
              placeholder="ex. je veux apprendre le japonais pour voyager"
              required
              minLength={3}
              defaultValue="je veux apprendre le japonais pour voyager"
            />
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              Analyser mon objectif
            </Button>
          </CardFooter>
        </form>
      </Card>

      {goal && (
        <Card>
          <CardHeader>
            <CardTitle>Objectif compris</CardTitle>
            <CardDescription>« {goal.rawStatement} »</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">domaine : {goal.domain}</Badge>
              <Badge variant="secondary">niveau visé : {goal.targetLevel}</Badge>
              {goal.motivation && <Badge variant="outline">motivation : {goal.motivation}</Badge>}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Confiance de l&apos;analyse</span>
                <span>{Math.round(goal.confidence * 100)}%</span>
              </div>
              <Progress value={goal.confidence * 100} />
            </div>

            {goal.clarificationsNeeded.length > 0 && (
              <RationaleCallout>
                L&apos;objectif reste ambigu sur certains points : {goal.clarificationsNeeded.join(' · ')}. Vous
                pouvez tout de même continuer — le diagnostic affinera votre profil au fil des questions.
              </RationaleCallout>
            )}

            {goal.domain === 'unknown' || availableSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Domaine non reconnu par le pilote actuel (japonais N5 uniquement pour l&apos;instant). Reformulez
                votre objectif autour du japonais pour continuer.
              </p>
            ) : (
              <form action="/diagnostic" method="GET" className="flex flex-col gap-4 border-t border-border pt-4">
                <input type="hidden" name="goalId" value={goal.id} />
                <input type="hidden" name="domain" value={goal.domain} />
                {goal.motivation && <input type="hidden" name="motivation" value={goal.motivation} />}

                <div className="flex flex-col gap-2">
                  <Label>Compétences cibles à diagnostiquer</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {skillsToShow.map((skill) => (
                      <label
                        key={skill.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          name="targetSkills"
                          value={skill.id}
                          defaultChecked={preselected.length > 0 ? suggested.has(skill.id) : true}
                          className="accent-primary"
                        />
                        {skill.title}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:max-w-xs">
                  <Label htmlFor="declaredLevel">Votre niveau déclaré</Label>
                  <select
                    id="declaredLevel"
                    name="declaredLevel"
                    defaultValue="novice"
                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    {DECLARED_LEVELS.map((lvl) => (
                      <option key={lvl.value} value={lvl.value}>
                        {lvl.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Button type="submit">
                    Démarrer le diagnostic <ArrowRight />
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
