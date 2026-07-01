# UNISSON — Learning Engine

Moteur d'apprentissage adaptatif. Monolithe **modulaire**, architecture **hexagonale + DDD**,
découplé des fournisseurs d'IA.

> Conception complète dans [`ARCHITECTURE.md`](./ARCHITECTURE.md) (44 ADR).
> Ce dépôt implémente la **Phase 1** : cœur scientifique Maîtrise+Oubli (FSRS+bayésien), graphe
> Japonais N5, outbox + journal d'événements, persistance Postgres/Drizzle optionnelle.

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
npm test            # Vitest (domaine + e2e) ; tests Postgres sautés sans DATABASE_URL
npm run start:api   # démarre l'API NestJS (http://localhost:3000)
```

### Persistance Postgres (optionnelle)

Sans `DATABASE_URL`, l'API et les tests utilisent des adapters **en mémoire**. Pour activer
Postgres (mêmes ports, adapters Drizzle) :

```bash
cp .env.example .env            # renseigne DATABASE_URL
npm run db:up                   # docker compose : Postgres 16
npm run db:setup                # migre le schéma + charge le graphe Japonais N5
DATABASE_URL=postgres://unisson:unisson@localhost:5432/unisson npm test   # inclut l'intégration PG
```

### Essayer l'API

```bash
curl http://localhost:3000/health
# Objectif (Phase 0)
curl -X POST http://localhost:3000/goals -H 'content-type: application/json' \
  -d '{"learnerId":"learner-1","statement":"je veux apprendre le japonais pour voyager"}'
# Graphe N5 : prérequis directs + transitifs (recursive CTE côté Postgres)
curl http://localhost:3000/graph/skills/sentence/prerequisites
# Boucle de maîtrise : enregistrer une preuve puis lire l'état
curl -X POST http://localhost:3000/learners/learner-1/evidence -H 'content-type: application/json' \
  -d '{"conceptId":"hiragana-a","correct":true}'
curl http://localhost:3000/learners/learner-1/mastery/hiragana-a
```

## Structure (§17)

```
apps/
  api/                 # Composition root NestJS (câble adapters ↔ ports par tokens)
libs/
  shared-kernel/       # DomainEvent, IDs typés, Result, EventBus, Outbox + journal + relais
  learning-engine/     # KERNEL : StructuredGoal, GoalParserPort, StartGoalUseCase
  knowledge-graph/     # Concept/Skill, prérequis pondérés, algos (topo, transitif), seed N5
  learner-modeling/    # Maîtrise + Oubli (FSRS+bayésien), EvidenceEvent, RecordEvidenceUseCase
  assessment/          # Évidence pondérée, taxonomie d'erreurs
  content/             # Learning Objects, formats
  ai-orchestration/    # AI Gateway : LLMPort, capability parse_goal (Zod), adapters
  identity/            # IAM (générique)
  persistence/         # Drizzle schema + client PG + adapters (derrière les ports) + migration/seed
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
