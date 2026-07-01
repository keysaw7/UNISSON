import type { ConceptCycleStage } from '@unisson/learning-engine';

export const CYCLE_STAGE_LABELS: Record<ConceptCycleStage, string> = {
  activation: 'Activation',
  exposure: 'Exposition',
  activeRecall: 'Rappel actif',
  guidedPractice: 'Pratique guidée',
  freePractice: 'Pratique autonome',
  consolidation: 'Consolidation',
  generationTransfer: 'Génération & transfert',
  remediation: 'Remédiation',
};
