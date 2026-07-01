import type { ConceptCycleStage } from '@unisson/learning-engine';

/** Libellés visibles de l'étape du cycle pédagogique (PEDAGOG.md). */
export const CYCLE_STAGE_INFO: Record<
  ConceptCycleStage,
  { label: string; description: string }
> = {
  activation: { label: 'Activation', description: 'Réactivation des connaissances préalables' },
  exposure: { label: 'Exposition', description: 'Découverte structurée du concept' },
  activeRecall: { label: 'Rappel actif', description: 'Vérification immédiate sans indice' },
  guidedPractice: { label: 'Pratique guidée', description: 'Exercices avec indices dégressifs' },
  freePractice: { label: 'Pratique autonome', description: 'Entraînement en zone proximale' },
  consolidation: { label: 'Consolidation', description: 'Renforcement et interleaving' },
  generationTransfer: { label: 'Génération & transfert', description: 'Expliquer et appliquer en contexte nouveau' },
  remediation: { label: 'Remédiation', description: 'Correction ciblée d’une erreur systématique' },
};
