import { GoalForm } from '@/features/goal-intake/goal-form';

export default function GoalPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Objectif</h1>
        <p className="text-sm text-muted-foreground">Goal Intake — §6.1 ARCHITECTURE.md</p>
      </div>
      <GoalForm />
    </div>
  );
}
