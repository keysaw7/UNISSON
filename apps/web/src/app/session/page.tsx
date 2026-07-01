import Link from 'next/link';
import { SessionRunner } from '@/features/practice-session/session-runner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface SessionPageProps {
  searchParams: Promise<{ planId?: string }>;
}

export default async function SessionPage({ searchParams }: SessionPageProps) {
  const { planId } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Session de pratique</h1>
        <p className="text-sm text-muted-foreground">Sequencer + Format Selector + Assessment — §9, §6.5, §6.4 ARCHITECTURE.md</p>
      </div>

      {planId ? (
        <SessionRunner planId={planId} />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 pt-6 text-sm text-muted-foreground">
            <p>Aucun plan sélectionné.</p>
            <Button asChild>
              <Link href="/plan">Aller à mon plan</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
