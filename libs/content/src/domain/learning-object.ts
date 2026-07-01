/** Modalités pédagogiques (§6.5). */
export type Format =
  | 'explanation'
  | 'worked_example'
  | 'flashcard_recognition'
  | 'mcq'
  | 'cloze'
  | 'recall_production'
  | 'translation'
  | 'listening'
  | 'speaking'
  | 'dialogue_socratic'
  | 'project_task'
  | 'spaced_review'
  | 'contrastive_remediation'
  | 'activation_probe'
  | 'generation_exercise'
  | 'transfer_probe';

/** Objet pédagogique réutilisable (§7, couche 2). */
export interface LearningObject {
  id: string;
  targetRef: string; // conceptId ou skillId
  format: Format;
  difficulty: number; // 0..1
  contentRef: string;
}
