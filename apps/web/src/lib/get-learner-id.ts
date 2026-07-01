import 'server-only';
import { cookies } from 'next/headers';
import { LEARNER_COOKIE_NAME, verifySignedLearnerId } from './session';

/**
 * Lit le `learnerId` pseudonyme depuis le cookie de session (posé par `middleware.ts`).
 * À utiliser dans les Server Components, Route Handlers et Server Actions uniquement.
 */
export async function getLearnerId(): Promise<string> {
  const store = await cookies();
  const learnerId = await verifySignedLearnerId(store.get(LEARNER_COOKIE_NAME)?.value);
  if (!learnerId) {
    // Ne devrait pas arriver : le middleware garantit le cookie avant le rendu.
    throw new Error("Session invité introuvable — le middleware d'identité n'a pas pu s'exécuter.");
  }
  return learnerId;
}
