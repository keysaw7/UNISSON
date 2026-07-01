import { randomUUID } from 'node:crypto';

/** Type "marqué" pour éviter de mélanger des identifiants de nature différente. */
export type Brand<T, B extends string> = T & { readonly __brand: B };

export type Id<Tag extends string> = Brand<string, Tag>;

/** Génère un identifiant typé (UUID v4). */
export function makeId<Tag extends string>(): Id<Tag> {
  return randomUUID() as Id<Tag>;
}

/** Convertit une chaîne existante en identifiant typé (frontières, désérialisation). */
export function asId<Tag extends string>(value: string): Id<Tag> {
  return value as Id<Tag>;
}

export type LearnerId = Id<'LearnerId'>;
export type GoalId = Id<'GoalId'>;
export type PlanId = Id<'PlanId'>;
export type ConceptId = Id<'ConceptId'>;
export type SkillId = Id<'SkillId'>;
export type ActivityId = Id<'ActivityId'>;
export type DiagnosticSessionId = Id<'DiagnosticSessionId'>;
