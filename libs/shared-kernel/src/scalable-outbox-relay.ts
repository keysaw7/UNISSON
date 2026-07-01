import type { EventBus } from './event-bus';
import type { DomainEventJournalPort } from './event-journal';
import type { OutboxPort } from './outbox';
import { OutboxRelay } from './outbox-relay';

/**
 * Relais outbox extensible (Phase 6, §12.3).
 * Aujourd'hui identique au relais in-process ; le hook `onPublished` permet de brancher
 * Kafka/Redpanda sans changer les use-cases ni les consommateurs idempotents.
 */
export class ScalableOutboxRelay extends OutboxRelay {
  constructor(
    outbox: OutboxPort,
    bus: EventBus,
    journal: DomainEventJournalPort | undefined,
    private readonly onPublished?: (count: number) => void,
  ) {
    super(outbox, bus, journal);
  }

  override async drain(limit = 100): Promise<number> {
    const count = await super.drain(limit);
    if (count > 0) this.onPublished?.(count);
    return count;
  }
}
