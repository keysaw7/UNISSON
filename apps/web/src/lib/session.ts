/**
 * Identité invité pseudonyme (V1, cf. plan frontend §2 "Identité").
 *
 * En l'absence d'IAM réelle côté backend (`libs/identity` ne fait que mapper
 * `learnerId ↔ createdAt`, aucun login), le BFF Next.js génère un `learnerId`
 * pseudonyme côté client et le persiste dans un cookie `httpOnly` signé. La
 * signature empêche un client de falsifier son `learnerId` sans avoir besoin
 * d'une base de sessions côté serveur. Migration future vers une vraie IAM :
 * remplacer uniquement la source de ce `learnerId`, rien d'autre ne change
 * (le moteur ne connaît déjà que ce pseudonyme, §13.2 ARCHITECTURE.md).
 */
export const LEARNER_COOKIE_NAME = 'unisson_learner';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 an

function getSecret(): string {
  // Pas de secret fort requis pour une identité invité (aucune donnée sensible
  // protégée par cette signature) ; sert seulement à détecter une valeur altérée.
  return process.env.LEARNER_SESSION_SECRET ?? 'unisson-dev-insecure-secret';
}

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = Array.from(new Uint8Array(bytes), (b) => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return toBase64Url(signature);
}

/** Signe un `learnerId` : `<learnerId>.<signature>`. */
export async function signLearnerId(learnerId: string): Promise<string> {
  const signature = await hmac(learnerId);
  return `${learnerId}.${signature}`;
}

/** Vérifie une valeur de cookie signée ; renvoie le `learnerId` si valide, sinon `null`. */
export async function verifySignedLearnerId(cookieValue: string | undefined): Promise<string | null> {
  if (!cookieValue) return null;
  const separatorIndex = cookieValue.lastIndexOf('.');
  if (separatorIndex <= 0) return null;
  const learnerId = cookieValue.slice(0, separatorIndex);
  const signature = cookieValue.slice(separatorIndex + 1);
  const expected = await hmac(learnerId);
  return signature === expected ? learnerId : null;
}

export function createLearnerId(): string {
  return crypto.randomUUID();
}

export const LEARNER_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: COOKIE_MAX_AGE_SECONDS,
};
