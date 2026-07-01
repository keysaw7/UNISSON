import type { MasteryStage } from '@unisson/learner-modeling';

export const STAGE_INFO: Record<MasteryStage, { label: string; variant: 'secondary' | 'warning' | 'success' | 'outline' }> = {
  unknown: { label: 'Inconnu', variant: 'outline' },
  emerging: { label: 'Émergent', variant: 'secondary' },
  developing: { label: 'En développement', variant: 'warning' },
  proficient: { label: 'Compétent', variant: 'success' },
  mastered: { label: 'Maîtrisé', variant: 'success' },
};
