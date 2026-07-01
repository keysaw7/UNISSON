import { Global, Module, type Provider } from '@nestjs/common';
import {
  InMemoryEventBus,
  InMemoryEventJournal,
  InMemoryOutbox,
  OutboxRelay,
  type DomainEventJournalPort,
  type EventBus,
  type OutboxPort,
} from '@unisson/shared-kernel';
import {
  KNOWLEDGE_GRAPH_REPOSITORY_PORT,
  InMemoryKnowledgeGraphRepository,
  type KnowledgeGraphRepositoryPort,
} from '@unisson/knowledge-graph';
import {
  EVIDENCE_REPOSITORY_PORT,
  FsrsBayesianMasteryModel,
  InMemoryEvidenceRepository,
  InMemoryLearnerStateRepository,
  LEARNER_STATE_REPOSITORY_PORT,
  RecordEvidenceUseCase,
  type EvidenceRepositoryPort,
  type LearnerStateRepositoryPort,
  type MasteryModel,
} from '@unisson/learner-modeling';
import {
  createDb,
  createPool,
  PgEventJournal,
  PgEvidenceRepository,
  PgKnowledgeGraphRepository,
  PgLearnerStateRepository,
  PgOutbox,
  type Db,
} from '@unisson/persistence';

/**
 * Composition root de l'infrastructure (§17.2). SEUL endroit qui connaît les implémentations.
 * Sans `DATABASE_URL` → adapters mémoire (dev/CI). Avec `DATABASE_URL` → adapters Postgres,
 * derrière EXACTEMENT les mêmes ports. Changer de persistance = ne rien changer au domaine.
 */
export const INFRA = {
  Db: Symbol('Db'),
  EventBus: Symbol('EventBus'),
  Outbox: Symbol('OutboxPort'),
  EventJournal: Symbol('DomainEventJournalPort'),
  OutboxRelay: Symbol('OutboxRelay'),
  MasteryModel: Symbol('MasteryModel'),
} as const;

const providers: Provider[] = [
  {
    provide: INFRA.Db,
    useFactory: (): Db | null => (process.env.DATABASE_URL ? createDb(createPool()) : null),
  },
  { provide: INFRA.EventBus, useFactory: (): EventBus => new InMemoryEventBus() },
  { provide: INFRA.MasteryModel, useFactory: (): MasteryModel => new FsrsBayesianMasteryModel() },
  {
    provide: INFRA.Outbox,
    useFactory: (db: Db | null): OutboxPort => (db ? new PgOutbox(db) : new InMemoryOutbox()),
    inject: [INFRA.Db],
  },
  {
    provide: INFRA.EventJournal,
    useFactory: (db: Db | null): DomainEventJournalPort =>
      db ? new PgEventJournal(db) : new InMemoryEventJournal(),
    inject: [INFRA.Db],
  },
  {
    provide: INFRA.OutboxRelay,
    useFactory: (outbox: OutboxPort, bus: EventBus, journal: DomainEventJournalPort): OutboxRelay =>
      new OutboxRelay(outbox, bus, journal),
    inject: [INFRA.Outbox, INFRA.EventBus, INFRA.EventJournal],
  },
  {
    provide: KNOWLEDGE_GRAPH_REPOSITORY_PORT,
    useFactory: (db: Db | null): KnowledgeGraphRepositoryPort =>
      db ? new PgKnowledgeGraphRepository(db) : new InMemoryKnowledgeGraphRepository(),
    inject: [INFRA.Db],
  },
  {
    provide: LEARNER_STATE_REPOSITORY_PORT,
    useFactory: (db: Db | null): LearnerStateRepositoryPort =>
      db ? new PgLearnerStateRepository(db) : new InMemoryLearnerStateRepository(),
    inject: [INFRA.Db],
  },
  {
    provide: EVIDENCE_REPOSITORY_PORT,
    useFactory: (db: Db | null): EvidenceRepositoryPort =>
      db ? new PgEvidenceRepository(db) : new InMemoryEvidenceRepository(),
    inject: [INFRA.Db],
  },
  {
    provide: RecordEvidenceUseCase,
    useFactory: (
      evidence: EvidenceRepositoryPort,
      state: LearnerStateRepositoryPort,
      model: MasteryModel,
      outbox: OutboxPort,
    ): RecordEvidenceUseCase => new RecordEvidenceUseCase(evidence, state, model, outbox),
    inject: [EVIDENCE_REPOSITORY_PORT, LEARNER_STATE_REPOSITORY_PORT, INFRA.MasteryModel, INFRA.Outbox],
  },
];

@Global()
@Module({
  providers,
  exports: [
    INFRA.EventBus,
    INFRA.Outbox,
    INFRA.EventJournal,
    INFRA.OutboxRelay,
    INFRA.MasteryModel,
    KNOWLEDGE_GRAPH_REPOSITORY_PORT,
    LEARNER_STATE_REPOSITORY_PORT,
    EVIDENCE_REPOSITORY_PORT,
    RecordEvidenceUseCase,
  ],
})
export class InfraModule {}
