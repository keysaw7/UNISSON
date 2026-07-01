# @unisson/web

Frontend Next.js (App Router) d'UNISSON, en pattern **BFF** (Backend-for-Frontend) : ce serveur
appelle l'API NestJS (`apps/api`) uniquement côté serveur — aucun CORS requis, aucune clé/API
exposée au navigateur. Voir le plan de développement frontend pour le détail des décisions
d'architecture.

## Démarrer en local

```bash
# Terminal 1 — API (depuis la racine du monorepo)
npm run start:api

# Terminal 2 — frontend
cd apps/web
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) (ou le port choisi par Next si 3000 est déjà
pris par l'API — le message au démarrage l'indique).

Variables d'environnement (voir `.env.example` à la racine du monorepo) :

- `UNISSON_API_URL` — URL de l'API NestJS appelée côté serveur (défaut `http://localhost:3000`).
- `LEARNER_SESSION_SECRET` — secret HMAC signant le cookie d'identité invité (voir `src/lib/session.ts`).

## Structure

```
src/
├── app/                    # App Router : /goal, /diagnostic, /plan, /session, /mastery
├── features/               # logique par capacité métier (goal-intake, diagnostic, plan, practice-session, mastery)
├── components/             # UI (primitives façon shadcn/ui) + registre content-renderers/ par Format
└── lib/                    # client API (lib/api), session invité, utilitaires
```

- **Identité** : invité pseudonyme en V1 — `learnerId` généré côté client, cookie `httpOnly` signé
  posé par `src/proxy.ts` (convention Next.js 16, ex-`middleware.ts`).
- **Rendu de contenu** : `components/content-renderers/registry.tsx` sélectionne le rendu par
  `Format` ; dégrade en auto-évaluation tant que `generate_content` (API) ne renvoie qu'un texte
  brut, bascule en QCM structuré si un JSON `{prompt, choices, correctAnswer}` est détecté.

## Scripts

```bash
npm run dev         # serveur de dev
npm run build        # build de production
npm run lint          # eslint (config Next.js dédiée, indépendante du reste du monorepo)
npm run typecheck   # tsc --noEmit
npm run test          # tests unitaires (Vitest + Testing Library)
npm run e2e           # tests e2e (Playwright) — voir tests/e2e/README.md
```
