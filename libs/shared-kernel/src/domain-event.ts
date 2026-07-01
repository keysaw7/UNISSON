import { randomUUID } from 'node:crypto';

/**
 * Enveloppe d'événement standard (§12.6). `correlationId`/`causationId` donnent la
 * traçabilité causale complète d'un parcours.
 */
export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  readonly eventId: string;
  readonly type: TType;
  readonly schemaVersion: number;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly occurredAt: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly payload: TPayload;
}

export interface NewEvent<TType extends string, TPayload> {
  type: TType;
  aggregateType: string;
  aggregateId: string;
  payload: TPayload;
  correlationId?: string;
  causationId?: string;
  schemaVersion?: number;
}

export function createEvent<TType extends string, TPayload>(
  input: NewEvent<TType, TPayload>,
): DomainEvent<TType, TPayload> {
  return {
    eventId: randomUUID(),
    type: input.type,
    schemaVersion: input.schemaVersion ?? 1,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    occurredAt: new Date().toISOString(),
    correlationId: input.correlationId ?? randomUUID(),
    causationId: input.causationId,
    payload: input.payload,
  };
}
