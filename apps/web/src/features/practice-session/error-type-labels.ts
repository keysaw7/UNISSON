import type { ErrorType } from '@unisson/assessment';

/** Taxonomie d'erreurs propriétaire (§6.4) — restituée à l'apprenant pour l'explicabilité. */
export const ERROR_TYPE_INFO: Record<ErrorType, { label: string; explanation: string; tone: 'success' | 'warning' | 'destructive' }> = {
  correct: { label: 'Correct', explanation: 'Bonne réponse, votre maîtrise progresse.', tone: 'success' },
  slip: { label: 'Étourderie', explanation: "Vous connaissez ce point : ça compte à peine contre votre maîtrise.", tone: 'warning' },
  guess: { label: 'Probablement deviné', explanation: 'Réponse correcte mais peu fiable comme preuve — impact limité.', tone: 'warning' },
  partial: { label: 'Partiellement correct', explanation: 'Une partie de la réponse est bonne — la maîtrise progresse partiellement.', tone: 'warning' },
  misconception: { label: 'Erreur systématique connue', explanation: 'Ce type d’erreur est référencé — une remédiation ciblée va être proposée.', tone: 'destructive' },
  missing_prerequisite: {
    label: 'Prérequis manquant',
    explanation: 'L’échec semble venir d’un prérequis non maîtrisé — signalé pour re-planification.',
    tone: 'destructive',
  },
};
