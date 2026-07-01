import { DiagnosticRunner } from '@/features/diagnostic/diagnostic-runner';
import type { DeclaredLevel } from '@/lib/api/diagnostic';

interface DiagnosticPageProps {
  searchParams: Promise<{
    domain?: string;
    targetSkills?: string | string[];
    declaredLevel?: string;
    goalId?: string;
    motivation?: string;
  }>;
}

const VALID_LEVELS: DeclaredLevel[] = ['beginner', 'novice', 'intermediate', 'advanced'];

export default async function DiagnosticPage({ searchParams }: DiagnosticPageProps) {
  const sp = await searchParams;
  const domain = sp.domain ?? 'japanese';
  const targetSkills = Array.isArray(sp.targetSkills) ? sp.targetSkills : sp.targetSkills ? [sp.targetSkills] : [];
  const declaredLevel = (VALID_LEVELS as string[]).includes(sp.declaredLevel ?? '')
    ? (sp.declaredLevel as DeclaredLevel)
    : 'novice';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Diagnostic</h1>
        <p className="text-sm text-muted-foreground">Diagnostic adaptatif graph-aware — §6.2 ARCHITECTURE.md</p>
      </div>
      <DiagnosticRunner
        domain={domain}
        targetSkills={targetSkills}
        declaredLevel={declaredLevel}
        goalId={sp.goalId}
        motivation={sp.motivation}
      />
    </div>
  );
}
