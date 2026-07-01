# UNISSON — Learning Engine

Moteur d'apprentissage adaptatif. Monolithe **modulaire**, architecture **hexagonale + DDD**,
découplé des fournisseurs d'IA.

> Conception complète dans [`ARCHITECTURE.md`](./ARCHITECTURE.md) (39+ ADR).
> Ce dépôt implémente le **squelette Phase 0** (§17) : structure, frontières, walking skeleton.

## Prérequis

- Node.js >= 20 (testé sur Node 24)
- npm (workspaces)

## Installation

```bash
npm install
```

## Scripts

```bash
npm run typecheck   # tsc --noEmit sur tout le monorepo
npm run lint        # ESLint + frontières de modules (§17.2)
npm test            # Vitest (domaine + e2e walking skeleton)
npm run start:api   # démarre l'API NestJS (http://localhost:3000)
```

Vérifier le walking skeleton une fois l'API démarrée :

```bash
curl http://localhost:3000/health
curl -X POST http://localhost:3000/goals \
  -H 'content-type: application/json' \
  -d '{"learnerId":"learner-1","statement":"je veux apprendre le japonais pour voyager"}'
```

## Structure (§17)

```
apps/
  api/                 # Composition root NestJS (câble adapters ↔ ports par tokens)
libs/
  shared-kernel/       # DomainEvent, IDs typés, Result, EventBus
  learning-engine/     # KERNEL : StructuredGoal, GoalParserPort, StartGoalUseCase
  knowledge-graph/     # Concept/Skill, prérequis pondérés
  learner-modeling/    # MasteryState (Maîtrise + Oubli), stades
  assessment/          # Évidence pondérée, taxonomie d'erreurs
  content/             # Learning Objects, formats
  ai-orchestration/    # AI Gateway : LLMPort, capability parse_goal (Zod), adapters
  identity/            # IAM (générique)
```

Chaque `lib/` suit la même structure hexagonale : `domain/`, `application/`, `ports/`,
`adapters/`, et un `index.ts` qui est la **seule API publique** du contexte.

## Règles de frontières (imposées par le lint)

1. `domain/` et `ports/` n'importent jamais d'infra (adapters, NestJS, DB, zod).
2. Les imports inter-contextes passent par le nom de package `@unisson/*` (jamais un chemin interne).
3. Seul `apps/api` connaît les implémentations concrètes.

Un import interdit **fait échouer `npm run lint`** (donc la CI).

## Note d'implémentation (Phase 0)

Réalisation pragmatique fidèle à l'intention des ADR (voir `ARCHITECTURE.md`, ADR-040) :
**npm workspaces** (au lieu de Nx) pour le monorepo, frontières via **ESLint** + résolution
limitée aux points d'entrée publics. Les libs du domaine restent **agnostiques du framework**
(aucun décorateur NestJS) ; NestJS n'intervient qu'en composition root. Ajustable ensuite.
