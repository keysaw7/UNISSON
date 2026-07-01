import type { EventBus } from './event-bus';
import type { DomainEventJournalPort } from './event-journal';
import type { OutboxPort } from './outbox';

/**
 * Relais de l'outbox (§12.3, §12.8). Draine les événements non publiés → les écrit dans le
 * journal append-only → les diffuse sur le bus → les marque publiés. Diffusion at-least-once :
 * un `Set` d'`eventId` déjà traités garantit l'idempotence même si un pull recouvre un précédent.
 *
 * In-process ici ; remplaçable par un relais poll/CDC vers Kafka sans changer les consommateurs.
 */
export class OutboxRelay {
  private readonly processed = new Set<string>();

  constructor(
    private readonly outbox: OutboxPort,
    private readonly bus: EventBus,
    private readonly journal?: DomainEventJournalPort,
  ) {}

  /** Draine un lot ; renvoie le nombre d'événements effectivement diffusés. */
  async drain(limit = 100): Promise<number> {
    const batch = await this.outbox.pullUnpublished(limit);
    let published = 0;

    for (const event of batch) {
      if (this.processed.has(event.eventId)) continue;
      await this.journal?.append(event);
      await this.bus.publish(event);
      this.processed.add(event.eventId);
      published++;
    }

    if (batch.length > 0) {
      await this.outbox.markPublished(batch.map((e) => e.eventId));
    }
    return published;
  }
}
