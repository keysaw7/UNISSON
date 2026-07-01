import { asc, inArray, isNull } from 'drizzle-orm';
import type { DomainEvent, DomainEventJournalPort, OutboxPort } from '@unisson/shared-kernel';
import type { Db } from '../client';
import { domainEvent, outbox } from '../schema';

const toEvent = (r: typeof outbox.$inferSelect | typeof domainEvent.$inferSelect): DomainEvent => ({
  eventId: r.eventId,
  type: r.type,
  schemaVersion: r.schemaVersion,
  aggregateType: r.aggregateType,
  aggregateId: r.aggregateId,
  occurredAt: r.occurredAt,
  correlationId: r.correlationId,
  causationId: r.causationId ?? undefined,
  payload: r.payload,
});

/** Outbox Postgres (§12.3). `enqueue` doit tourner dans la même TX que l'écriture d'état. */
export class PgOutbox implements OutboxPort {
  constructor(private readonly db: Db) {}

  async enqueue(events: readonly DomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    await this.db
      .insert(outbox)
      .values(
        events.map((e) => ({
          eventId: e.eventId,
          type: e.type,
          aggregateType: e.aggregateType,
          aggregateId: e.aggregateId,
          schemaVersion: e.schemaVersion,
          occurredAt: e.occurredAt,
          correlationId: e.correlationId,
          causationId: e.causationId ?? null,
          payload: e.payload,
        })),
      )
      .onConflictDoNothing({ target: outbox.eventId });
  }

  async pullUnpublished(limit = 100): Promise<DomainEvent[]> {
    const rows = await this.db
      .select()
      .from(outbox)
      .where(isNull(outbox.publishedAt))
      .orderBy(asc(outbox.seq))
      .limit(limit);
    return rows.map(toEvent);
  }

  async markPublished(eventIds: readonly string[]): Promise<void> {
    if (eventIds.length === 0) return;
    await this.db
      .update(outbox)
      .set({ publishedAt: new Date().toISOString() })
      .where(inArray(outbox.eventId, [...eventIds]));
  }
}

/** Journal `domain_event` append-only (§12.7). */
export class PgEventJournal implements DomainEventJournalPort {
  constructor(private readonly db: Db) {}

  async append(event: DomainEvent): Promise<void> {
    await this.db
      .insert(domainEvent)
      .values({
        eventId: event.eventId,
        type: event.type,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        schemaVersion: event.schemaVersion,
        occurredAt: event.occurredAt,
        correlationId: event.correlationId,
        causationId: event.causationId ?? null,
        payload: event.payload,
      })
      .onConflictDoNothing({ target: domainEvent.eventId });
  }

  async all(): Promise<DomainEvent[]> {
    return (await this.db.select().from(domainEvent).orderBy(asc(domainEvent.occurredAt))).map(toEvent);
  }

  async byType(type: string): Promise<DomainEvent[]> {
    return (await this.all()).filter((e) => e.type === type);
  }
}
