import Link from 'next/link';
import { ArrowRight, BrainCircuit, ClipboardList, Compass, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const LOOP_STEPS = [
  { icon: Target, title: 'Objectif', description: "Dites ce que vous voulez apprendre, en langage libre.", href: '/goal' },
  { icon: Compass, title: 'Diagnostic', description: 'Quelques questions ciblées pour savoir où vous en êtes.', href: '/goal' },
  { icon: ClipboardList, title: 'Plan', description: 'Un parcours ordonné et justifié vers votre objectif.', href: '/plan' },
  { icon: BrainCircuit, title: 'Pratique', description: 'Une activité à la fois, au bon niveau de difficulté.', href: '/session' },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Apprenez ce que vous voulez, à votre rythme</h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          UNISSON diagnostique votre niveau, construit un parcours explicable et adapte chaque activité à votre
          maîtrise réelle — sans jamais laisser l&apos;IA décider à votre place.
        </p>
        <div>
          <Button asChild size="lg">
            <Link href="/goal">
              Commencer <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {LOOP_STEPS.map((step) => (
          <Link key={step.title} href={step.href}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader>
                <step.icon className="size-6 text-primary" aria-hidden />
                <CardTitle>{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>

      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Vous naviguez en tant qu&apos;<span className="font-medium text-foreground">invité</span>. Votre progression est
          rattachée à cet appareil/navigateur (identité pseudonyme, sans compte) — voir la section « Maîtrise » pour
          suivre votre mémorisation par compétence.
        </CardContent>
      </Card>
    </div>
  );
}
