import { NextResponse, type NextRequest } from 'next/server';
import { LEARNER_COOKIE_NAME, LEARNER_COOKIE_OPTIONS, createLearnerId, signLearnerId, verifySignedLearnerId } from '@/lib/session';

/**
 * Garantit qu'un `learnerId` pseudonyme (invité, V1) existe pour chaque visiteur avant que les
 * Server Components/Route Handlers ne s'exécutent. Mutate `request.cookies` (pas seulement la
 * réponse) pour que le rendu de LA MÊME requête voie déjà le cookie fraîchement créé.
 *
 * Next.js 16 : convention `proxy.ts` (anciennement `middleware.ts`), runtime Node.js.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const existing = request.cookies.get(LEARNER_COOKIE_NAME)?.value;
  const verified = await verifySignedLearnerId(existing);
  if (verified) {
    return NextResponse.next();
  }

  const learnerId = createLearnerId();
  const signed = await signLearnerId(learnerId);

  request.cookies.set(LEARNER_COOKIE_NAME, signed);
  const response = NextResponse.next({ request });
  response.cookies.set(LEARNER_COOKIE_NAME, signed, LEARNER_COOKIE_OPTIONS);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
