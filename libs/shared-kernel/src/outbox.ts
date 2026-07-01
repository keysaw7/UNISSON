import type { DomainEvent } from './domain-event';

/**
 * Outbox transactionnel (§12.3, ADR-026). L'écriture d'état métier et l'`enqueue` des événements
 * se font dans LA MÊME transaction → plus de « dual write ». Un relais publie ensuite
 * *at-least-once* ; les consommateurs sont idempotents (via `eventId`).
 */
export interface OutboxPort {
  /** Range des événements à publier (dans la transaction de l'écriture d'état). */
  enqueue(events: readonly DomainEvent[]): Promise<void>;
  /** Récupère les événements non encore publiés (ordre d'occurrence). */
  pullUnpublished(limit?: number): Promise<DomainEvent[]>;
  /** Marque des événements comme publiés (après diffusion réussie). */
  markPublished(eventIds: readonly string[]): Promise<void>;
}

export class InMemoryOutbox implements OutboxPort {
  private readonly rows = new Map<string, { event: DomainEvent; published: boolean; seq: number }>();
  private seq = 0;

  async enqueue(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) {
      if (!this.rows.has(event.eventId)) {
        this.rows.set(event.eventId, { event, published: false, seq: this.seq++ });
      }
    }
  }

  async pullUnpublished(limit = 100): Promise<DomainEvent[]> {
    return [...this.rows.values()]
      .filter((r) => !r.published)
      .sort((a, b) => a.seq - b.seq)
      .slice(0, limit)
      .map((r) => r.event);
  }

  async markPublished(eventIds: readonly string[]): Promise<void> {
    for (const id of eventIds) {
      const row = this.rows.get(id);
      if (row) row.published = true;
    }
  }
}
