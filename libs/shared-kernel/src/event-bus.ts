import { DomainEvent } from './domain-event';

export type EventHandler<E extends DomainEvent = DomainEvent> = (event: E) => Promise<void> | void;

/**
 * Abstraction de bus d'événements. Phase 0 : implémentation in-process.
 * Plus tard : outbox → Kafka/Redpanda (§12.3), sans changer cette interface.
 */
export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(type: string, handler: EventHandler): void;
}

export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, EventHandler[]>();

  subscribe(type: string, handler: EventHandler): void {
    const existing = this.handlers.get(type) ?? [];
    existing.push(handler);
    this.handlers.set(type, existing);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];
    for (const handler of handlers) {
      await handler(event);
    }
  }
}
