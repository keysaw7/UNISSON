import 'server-only';

/**
 * Base URL de l'API NestJS (`apps/api`), appelée côté serveur uniquement (pattern BFF, cf. plan
 * frontend §2). Aucun CORS requis : ces appels ne quittent jamais le serveur Next.js.
 */
const API_BASE_URL = process.env.UNISSON_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface NestErrorBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

function extractMessage(body: unknown, fallback: string): string {
  const b = body as NestErrorBody | null;
  if (!b || typeof b !== 'object') return fallback;
  if (Array.isArray(b.message)) return b.message.join(', ');
  if (typeof b.message === 'string') return b.message;
  return b.error ?? fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
      // Les décisions du moteur (plan, prochaine activité, maîtrise) changent après chaque
      // interaction : jamais de cache HTTP implicite côté fetch de Next.js.
      cache: 'no-store',
    });
  } catch (cause) {
    throw new ApiError(0, `API UNISSON injoignable sur ${API_BASE_URL} — l'avez-vous démarrée (npm run start:api) ?`, cause);
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiError(response.status, extractMessage(body, `Erreur API (${response.status}) sur ${path}`), body);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>(path),
  post: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
};
