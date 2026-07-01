import type { Pool } from 'pg';

/**
 * DDL idempotent (§12.7). Volontairement auto-porté (pas de dépendance à drizzle-kit au runtime) :
 * `runMigrations` suffit à préparer une base vierge (dev, CI d'intégration, conteneur).
 * `drizzle.config.ts` reste disponible pour ceux qui préfèrent les migrations générées.
 */
export const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS skill (
  id text PRIMARY KEY,
  title text NOT NULL,
  domain text NOT NULL
);

CREATE TABLE IF NOT EXISTS concept (
  id text PRIMARY KEY,
  type text NOT NULL,
  payload jsonb NOT NULL,
  difficulty double precision NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_prerequisite (
  skill_id text NOT NULL,
  requires_skill_id text NOT NULL,
  strength double precision NOT NULL,
  PRIMARY KEY (skill_id, requires_skill_id)
);

CREATE TABLE IF NOT EXISTS skill_concept (
  skill_id text NOT NULL,
  concept_id text NOT NULL,
  PRIMARY KEY (skill_id, concept_id)
);

CREATE TABLE IF NOT EXISTS mastery_state (
  learner_id text NOT NULL,
  concept_id text NOT NULL,
  p_mastery double precision NOT NULL,
  stability double precision NOT NULL,
  last_reviewed_at text NOT NULL,
  PRIMARY KEY (learner_id, concept_id)
);

CREATE TABLE IF NOT EXISTS evidence_event (
  id text PRIMARY KEY,
  learner_id text NOT NULL,
  concept_id text NOT NULL,
  occurred_at text NOT NULL,
  correct boolean NOT NULL,
  score double precision NOT NULL,
  difficulty double precision NOT NULL,
  response_time_ms integer,
  evidence_weight double precision NOT NULL
);
CREATE INDEX IF NOT EXISTS evidence_by_learner_concept
  ON evidence_event (learner_id, concept_id, occurred_at);

CREATE TABLE IF NOT EXISTS outbox (
  event_id text PRIMARY KEY,
  seq integer GENERATED ALWAYS AS IDENTITY,
  type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  schema_version integer NOT NULL,
  occurred_at text NOT NULL,
  correlation_id text NOT NULL,
  causation_id text,
  payload jsonb NOT NULL,
  published_at text
);
CREATE INDEX IF NOT EXISTS outbox_unpublished ON outbox (published_at, seq);

CREATE TABLE IF NOT EXISTS learning_plan (
  id text PRIMARY KEY,
  goal_id text NOT NULL,
  learner_id text NOT NULL,
  domain text NOT NULL,
  version integer NOT NULL,
  plan jsonb NOT NULL,
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS plan_by_goal ON learning_plan (goal_id, version);

CREATE TABLE IF NOT EXISTS diagnostic_session (
  id text PRIMARY KEY,
  learner_id text NOT NULL,
  domain text NOT NULL,
  status text NOT NULL,
  session jsonb NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS diagnostic_by_learner ON diagnostic_session (learner_id, updated_at);

CREATE TABLE IF NOT EXISTS format_efficacy (
  format_type text NOT NULL,
  concept_type text NOT NULL,
  stability_gain_per_minute double precision NOT NULL,
  observations integer NOT NULL,
  retention_at_days jsonb NOT NULL,
  PRIMARY KEY (format_type, concept_type)
);

CREATE TABLE IF NOT EXISTS domain_event (
  event_id text PRIMARY KEY,
  type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  schema_version integer NOT NULL,
  occurred_at text NOT NULL,
  correlation_id text NOT NULL,
  causation_id text,
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS learner (
  id text PRIMARY KEY,
  created_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS goal (
  id text PRIMARY KEY,
  learner_id text NOT NULL,
  domain text NOT NULL,
  goal jsonb NOT NULL,
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS goal_by_learner ON goal (learner_id, created_at);

CREATE TABLE IF NOT EXISTS learning_object (
  id text PRIMARY KEY,
  target_ref text NOT NULL,
  format text NOT NULL,
  difficulty double precision NOT NULL,
  content_ref text NOT NULL,
  provider text NOT NULL,
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS learning_object_lookup ON learning_object (target_ref, format, difficulty);

CREATE TABLE IF NOT EXISTS concept_learning_cycle (
  learner_id text NOT NULL,
  concept_id text NOT NULL,
  skill_id text NOT NULL,
  stage text NOT NULL,
  consecutive_successes integer NOT NULL,
  updated_at text NOT NULL,
  PRIMARY KEY (learner_id, concept_id)
);

CREATE TABLE IF NOT EXISTS skill_activation (
  learner_id text NOT NULL,
  skill_id text NOT NULL,
  activated_at text NOT NULL,
  PRIMARY KEY (learner_id, skill_id)
);

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS semantic_cache (
  cache_key text PRIMARY KEY,
  seed_text text NOT NULL,
  response_text text NOT NULL,
  embedding vector(64) NOT NULL,
  created_at text NOT NULL
);
CREATE INDEX IF NOT EXISTS semantic_cache_embedding ON semantic_cache USING ivfflat (embedding vector_cosine_ops) WITH (lists = 16);
`;

export async function runMigrations(pool: Pool): Promise<void> {
  await pool.query(SCHEMA_DDL);
}
