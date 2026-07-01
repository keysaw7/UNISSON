import type { LearnerId } from '@unisson/shared-kernel';

/**
 * IAM (générique) : seul contexte qui relie un `learnerId` pseudonyme à une identité
 * réelle (§13.2). Les données comportementales, elles, ne connaissent que le pseudonyme.
 */
export interface Learner {
  id: LearnerId;
  createdAt: string; // ISO
}
