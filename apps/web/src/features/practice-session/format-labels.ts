import type { Format } from '@unisson/content';

/** Libellés + framing pédagogique par format (§6.5) — purement présentationnel. */
export const FORMAT_LABELS: Record<Format, string> = {
  explanation: 'Explication',
  worked_example: 'Exemple travaillé',
  flashcard_recognition: 'Flashcard',
  mcq: 'QCM',
  cloze: 'Texte à trous',
  recall_production: 'Rappel actif',
  translation: 'Traduction',
  listening: 'Écoute',
  speaking: 'Expression orale',
  dialogue_socratic: 'Dialogue socratique',
  project_task: 'Mini-projet',
  spaced_review: 'Révision espacée',
  contrastive_remediation: 'Remédiation contrastive',
  activation_probe: 'Question d’activation',
  generation_exercise: 'Génération (vos mots)',
  transfer_probe: 'Transfert (contexte nouveau)',
};

export const INTENT_LABELS: Record<string, string> = {
  introduce: 'Introduction',
  practice: 'Pratique',
  review: 'Révision',
  remediate: 'Remédiation',
  apply: 'Application',
};
