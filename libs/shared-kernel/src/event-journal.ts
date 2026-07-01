import type { DomainEvent } from './domain-event';

/**
 * Journal `domain_event` append-only (§12.7). C'est l'actif de premier ordre : audit, analytics,
 * minage de misconceptions et surtout **replay** pour recalculer les modèles (BKT → DKT).
 * On n'y modifie ni ne supprime jamais une ligne.
 */
export interface DomainEventJournalPort {
  append(event: DomainEvent): Promise<void>;
  /** Journal complet, ordonné par occurrence (usage analytics/replay/tests). */
  all(): Promise<DomainEvent[]>;
  /** Filtre par type d'événement (ex. rejouer tous les `EvidenceRecorded`). */
  byType(type: string): Promise<DomainEvent[]>;
}

export class InMemoryEventJournal implements DomainEventJournalPort {
  private readonly events: DomainEvent[] = [];

  async append(event: DomainEvent): Promise<void> {
    this.events.push(event);
  }

  async all(): Promise<DomainEvent[]> {
    return [...this.events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  }

  async byType(type: string): Promise<DomainEvent[]> {
    return (await this.all()).filter((e) => e.type === type);
  }
}
