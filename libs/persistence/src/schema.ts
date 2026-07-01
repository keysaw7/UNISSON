import { boolean, doublePrecision, index, integer, jsonb, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';

/**
 * Schéma Postgres (§12.7). Règle stricte (ADR-027) : chaque bounded context possède ses tables,
 * AUCUNE FK inter-contextes — on référence par ID. C'est ce qui permet d'extraire un contexte
 * en service plus tard sans démêler des jointures.
 *
 * Choix : les instants sont stockés en `text` ISO-8601 (round-trip identique au domaine et aux
 * adapters mémoire, pas de dérive de fuseau). Les IDs typés (branded) sont des `text`.
 */

// ── Knowledge Graph ────────────────────────────────────────────────────────────
export const skill = pgTable('skill', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  domain: text('domain').notNull(),
});

export const concept = pgTable('concept', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  difficulty: doublePrecision('difficulty').notNull(),
});

export const skillPrerequisite = pgTable(
  'skill_prerequisite',
  {
    skillId: text('skill_id').notNull(),
    requiresSkillId: text('requires_skill_id').notNull(),
    strength: doublePrecision('strength').notNull(),
  },
  (t) => [primaryKey({ columns: [t.skillId, t.requiresSkillId] })],
);

export const skillConcept = pgTable(
  'skill_concept',
  {
    skillId: text('skill_id').notNull(),
    conceptId: text('concept_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.skillId, t.conceptId] })],
);

// ── Learner Modeling ────────────────────────────────────────────────────────────
export const masteryState = pgTable(
  'mastery_state',
  {
    learnerId: text('learner_id').notNull(),
    conceptId: text('concept_id').notNull(),
    pMastery: doublePrecision('p_mastery').notNull(),
    stability: doublePrecision('stability').notNull(),
    lastReviewedAt: text('last_reviewed_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.learnerId, t.conceptId] })],
);

export const evidenceEvent = pgTable(
  'evidence_event',
  {
    id: text('id').primaryKey(),
    learnerId: text('learner_id').notNull(),
    conceptId: text('concept_id').notNull(),
    occurredAt: text('occurred_at').notNull(),
    correct: boolean('correct').notNull(),
    score: doublePrecision('score').notNull(),
    difficulty: doublePrecision('difficulty').notNull(),
    responseTimeMs: integer('response_time_ms'),
    evidenceWeight: doublePrecision('evidence_weight').notNull(),
  },
  (t) => [index('evidence_by_learner_concept').on(t.learnerId, t.conceptId, t.occurredAt)],
);

// ── Cross-cutting : outbox + journal (§12.3, §12.7) ──────────────────────────────
export const outbox = pgTable(
  'outbox',
  {
    eventId: text('event_id').primaryKey(),
    seq: integer('seq').generatedAlwaysAsIdentity(),
    type: text('type').notNull(),
    aggregateType: text('aggregate_type').notNull(),
    aggregateId: text('aggregate_id').notNull(),
    schemaVersion: integer('schema_version').notNull(),
    occurredAt: text('occurred_at').notNull(),
    correlationId: text('correlation_id').notNull(),
    causationId: text('causation_id'),
    payload: jsonb('payload').$type<unknown>().notNull(),
    publishedAt: text('published_at'),
  },
  (t) => [index('outbox_unpublished').on(t.publishedAt, t.seq)],
);

// ── Planning (Learning Engine) ───────────────────────────────────────────────────
export const learningPlan = pgTable(
  'learning_plan',
  {
    id: text('id').primaryKey(),
    goalId: text('goal_id').notNull(),
    learnerId: text('learner_id').notNull(),
    domain: text('domain').notNull(),
    version: integer('version').notNull(),
    plan: jsonb('plan').$type<unknown>().notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('plan_by_goal').on(t.goalId, t.version)],
);

export const domainEvent = pgTable('domain_event', {
  eventId: text('event_id').primaryKey(),
  type: text('type').notNull(),
  aggregateType: text('aggregate_type').notNull(),
  aggregateId: text('aggregate_id').notNull(),
  schemaVersion: integer('schema_version').notNull(),
  occurredAt: text('occurred_at').notNull(),
  correlationId: text('correlation_id').notNull(),
  causationId: text('causation_id'),
  payload: jsonb('payload').$type<unknown>().notNull(),
});

export const schema = {
  skill,
  concept,
  skillPrerequisite,
  skillConcept,
  masteryState,
  evidenceEvent,
  learningPlan,
  outbox,
  domainEvent,
};
