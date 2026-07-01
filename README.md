# UNISSON — Learning Engine

Moteur d'apprentissage adaptatif. Monolithe **modulaire**, architecture **hexagonale + DDD**,
découplé des fournisseurs d'IA.

> Conception complète dans [`ARCHITECTURE.md`](./ARCHITECTURE.md) (50 ADR).
> Ce dépôt implémente les **Phases 1–3** : cœur scientifique Maîtrise+Oubli (FSRS+bayésien), graphe
> Japonais N5, outbox + journal d'événements, **Curriculum Planner** + **Sequencer**, **Diagnostic
> adaptatif graph-aware**, **Assessment** (correction + évidence pondérée), **Format Selector**
> (règles → bandit contraint) avec génération de contenu via l'**AI Gateway** (cache, réparation,
> fallback, télémétrie ; fournisseurs Anthropic et/ou OpenAI optionnels), persistance
> Postgres/Drizzle optionnelle.

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

### Fournisseur LLM (optionnel — Anthropic et/ou OpenAI)

Sans `ANTHROPIC_API_KEY` ni `OPENAI_API_KEY`, l'AI Gateway utilise `StubLlmAdapter` (déterministe,
dev/CI, aucun appel réseau). Avec une clé, le fournisseur correspondant devient **primaire**
derrière `LLMPort` ; avec les deux, Anthropic est primaire par défaut et OpenAI sert de **secours
automatique** (bascule inversable avec `LLM_PROVIDER`) — même principe que Postgres vs. mémoire,
zéro ligne à changer dans le domaine ou les use-cases (§10.7) :

```bash
cp .env.example .env               # renseigne ANTHROPIC_API_KEY et/ou OPENAI_API_KEY
export ANTHROPIC_API_KEY=sk-ant-...
# export OPENAI_API_KEY=sk-...     # optionnel : second fournisseur, sert de secours
# export LLM_PROVIDER=openai       # optionnel : force explicitement un fournisseur
npm test -w @unisson/ai-orchestration   # inclut les tests d'intégration réels (sautés sans clé)
npm run start:api
```

Le Gateway (`AiGateway`, §10.2) ajoute par-dessus n'importe quel fournisseur : cache exact,
boucle de réparation (re-ask si la sortie ne respecte pas le schéma Zod), fallback de modèle,
et télémétrie structurée par capacité. Toutes les variables (rôle, valeur par défaut, où obtenir
une clé) sont documentées dans [`.env.example`](./.env.example).

**Modèles de raisonnement (`gpt-5-nano`, `o1`, `o3`…)** : `OpenAiLlmAdapter` les détecte au préfixe
du nom de modèle et applique automatiquement `reasoning_effort=minimal` + `verbosity=low` (nos
capacités sont de l'extraction JSON déterministe, pas une tâche qui bénéficie de délibération) et un
plafond `max_completion_tokens` — le raisonnement est facturé et consomme ce budget même quand il
n'apparaît pas dans la réponse ; un plafond trop bas peut vider la réponse visible, ce que l'adapter
détecte et signale avec une erreur explicite plutôt qu'un échec silencieux. Rien à configurer pour
utiliser `gpt-5-nano`, mais `OPENAI_REASONING_EFFORT` / `OPENAI_VERBOSITY` /
`OPENAI_MAX_COMPLETION_TOKENS` permettent de surcharger ces défauts.

### Essayer l'API

```bash
curl http://localhost:3000/health
# Objectif (Phase 0) — persisté + événement GoalCreated
curl -X POST http://localhost:3000/goals -H 'content-type: application/json' \
  -d '{"learnerId":"learner-1","statement":"je veux apprendre le japonais pour voyager"}'
curl http://localhost:3000/learners/learner-1/goals
# Graphe N5 : prérequis directs + transitifs (recursive CTE côté Postgres)
curl http://localhost:3000/graph/skills/sentence/prerequisites
# Boucle de maîtrise : enregistrer une preuve puis lire l'état
curl -X POST http://localhost:3000/learners/learner-1/evidence -H 'content-type: application/json' \
  -d '{"conceptId":"hiragana-a","correct":true}'
curl http://localhost:3000/learners/learner-1/mastery/hiragana-a
# Planifier un parcours (sous-DAG requis + ordre glouton pondéré) puis demander l'activité suivante
PLAN=$(curl -s -X POST http://localhost:3000/learners/learner-1/plan -H 'content-type: application/json' \
  -d '{"targetSkills":["sentence"],"motivation":"voyage"}')
echo "$PLAN"                       # plan.skillOrder + rationale par compétence
PLAN_ID=$(echo "$PLAN" | sed -E 's/.*"id":"([^"]+)".*/\1/')
curl "http://localhost:3000/learners/learner-1/plans/$PLAN_ID/next-activity"
# Boucle fermée : corriger une réponse (Assessment) → évidence pondérée → maîtrise mise à jour
curl -X POST http://localhost:3000/learners/learner-1/answers -H 'content-type: application/json' \
  -d '{"activityId":"a1","activityType":"exact","expected":"a","learnerAnswer":"a","conceptsCovered":["hiragana-a"]}'
# Détection de misconception connue (は/が) → attribution au bon concept
curl -X POST http://localhost:3000/learners/learner-1/answers -H 'content-type: application/json' \
  -d '{"activityId":"a2","activityType":"exact","expected":"は","learnerAnswer":"が","conceptsCovered":["particle-wa"]}'
# Diagnostic adaptatif graph-aware : démarrer (renvoie l'item-sonde), puis répondre jusqu'à convergence
DIAG=$(curl -s -X POST http://localhost:3000/learners/learner-1/diagnostic -H 'content-type: application/json' \
  -d '{"domain":"japanese","targetSkills":["sentence"],"declaredLevel":"novice"}')
echo "$DIAG"                        # sessionId + nextProbe (conceptId le plus informatif)
SID=$(echo "$DIAG" | sed -E 's/.*"sessionId":"([^"]+)".*/\1/')
CID=$(echo "$DIAG" | sed -E 's/.*"conceptId":"([^"]+)".*/\1/')
# Répondre à l'item courant → MàJ + propagation sur le graphe ; à l'arrêt, priors semés dans la maîtrise
curl -X POST "http://localhost:3000/learners/learner-1/diagnostic/$SID" -H 'content-type: application/json' \
  -d "{\"conceptId\":\"$CID\",\"correct\":true}"
# Format Selector : choisit le format (règles → bandit) puis génère le contenu via l'AI Gateway
curl -X POST http://localhost:3000/learners/learner-1/format -H 'content-type: application/json' \
  -d '{"conceptId":"hiragana-a","skillId":"hiragana","conceptType":"kana","intent":"introduce"}'
# Alimente le bandit contraint avec une observation réelle (gain de stabilité/minute)
curl -X POST http://localhost:3000/format-efficacy -H 'content-type: application/json' \
  -d '{"formatType":"cloze","conceptType":"grammar","stabilityGainPerMinute":0.3}'
curl http://localhost:3000/format-efficacy/cloze/grammar
```

### Frontend (apps/web)

Next.js (App Router), pattern **BFF** — voir [`apps/web/README.md`](./apps/web/README.md) :

```bash
npm run start:api          # terminal 1 (port 3000)
npm run dev -w apps/web    # terminal 2
```

## Structure (§17)

```
apps/
  api/                 # Composition root NestJS (câble adapters ↔ ports par tokens)
  web/                 # Frontend Next.js (App Router, BFF) — voir apps/web/README.md
libs/
  shared-kernel/       # DomainEvent, IDs typés, Result, EventBus, Outbox + journal + relais
  learning-engine/     # KERNEL : Goal, Diagnostic graph-aware, Planner, Sequencer, Format Selector
  knowledge-graph/     # Concept/Skill, prérequis pondérés, algos (topo, transitif), seed N5
  learner-modeling/    # Maîtrise + Oubli (FSRS+bayésien), EvidenceEvent, RecordEvidenceUseCase
  assessment/          # Correction déterministe/fuzzy, évidence pondérée, taxonomie + misconceptions
  content/             # Learning Objects, formats, ContentGeneratorPort
  ai-orchestration/    # AI Gateway : LLMPort, AiGateway (cache/réparation/fallback/télémétrie),
                       #   capabilities parse_goal + generate_content (Zod), adapters (stub, Anthropic, OpenAI)
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
