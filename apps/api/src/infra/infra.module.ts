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
  SeedInitialStateUseCase,
  type EvidenceRepositoryPort,
  type LearnerStateRepositoryPort,
  type MasteryModel,
} from '@unisson/learner-modeling';
import {
  ConstrainedBanditFormatSelector,
  CreatePlanUseCase,
  DIAGNOSTIC_SESSION_REPOSITORY_PORT,
  FORMAT_EFFICACY_REPOSITORY_PORT,
  FORMAT_SELECTION_STRATEGY_PORT,
  InMemoryDiagnosticSessionRepository,
  InMemoryFormatEfficacyRepository,
  InMemoryPlanRepository,
  NextActivityUseCase,
  PLAN_REPOSITORY_PORT,
  PLANNER_STRATEGY_PORT,
  RecordFormatEfficacyUseCase,
  RuleBasedFormatSelector,
  SelectFormatUseCase,
  StartDiagnosticUseCase,
  SubmitDiagnosticAnswerUseCase,
  WeightedGreedyPlanner,
  type DiagnosticSessionRepositoryPort,
  type FormatEfficacyRepositoryPort,
  type FormatSelectionStrategyPort,
  type PlannerStrategyPort,
  type PlanRepositoryPort,
} from '@unisson/learning-engine';
import {
  EvaluateAnswerUseCase,
  GRADING_STRATEGY_PORT,
  InMemoryMisconceptionCatalog,
  MISCONCEPTION_CATALOG_PORT,
  RuleBasedGradingStrategy,
  type GradingStrategyPort,
  type MisconceptionCatalogPort,
} from '@unisson/assessment';
import { CONTENT_GENERATOR_PORT, type ContentGeneratorPort } from '@unisson/content';
import { AiContentGeneratorAdapter, LLM_PORT, StubLlmAdapter, type LLMPort } from '@unisson/ai-orchestration';
import {
  createDb,
  createPool,
  PgEventJournal,
  PgEvidenceRepository,
  PgFormatEfficacyRepository,
  PgKnowledgeGraphRepository,
  PgDiagnosticSessionRepository,
  PgLearnerStateRepository,
  PgOutbox,
  PgPlanRepository,
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
  { provide: PLANNER_STRATEGY_PORT, useFactory: (): PlannerStrategyPort => new WeightedGreedyPlanner() },
  {
    provide: PLAN_REPOSITORY_PORT,
    useFactory: (db: Db | null): PlanRepositoryPort =>
      db ? new PgPlanRepository(db) : new InMemoryPlanRepository(),
    inject: [INFRA.Db],
  },
  {
    provide: CreatePlanUseCase,
    useFactory: (
      graph: KnowledgeGraphRepositoryPort,
      state: LearnerStateRepositoryPort,
      strategy: PlannerStrategyPort,
      plans: PlanRepositoryPort,
      outbox: OutboxPort,
    ): CreatePlanUseCase => new CreatePlanUseCase(graph, state, strategy, plans, outbox),
    inject: [
      KNOWLEDGE_GRAPH_REPOSITORY_PORT,
      LEARNER_STATE_REPOSITORY_PORT,
      PLANNER_STRATEGY_PORT,
      PLAN_REPOSITORY_PORT,
      INFRA.Outbox,
    ],
  },
  {
    provide: NextActivityUseCase,
    useFactory: (
      graph: KnowledgeGraphRepositoryPort,
      state: LearnerStateRepositoryPort,
      model: MasteryModel,
      plans: PlanRepositoryPort,
    ): NextActivityUseCase => new NextActivityUseCase(graph, state, model, plans),
    inject: [KNOWLEDGE_GRAPH_REPOSITORY_PORT, LEARNER_STATE_REPOSITORY_PORT, INFRA.MasteryModel, PLAN_REPOSITORY_PORT],
  },
  { provide: GRADING_STRATEGY_PORT, useFactory: (): GradingStrategyPort => new RuleBasedGradingStrategy() },
  {
    provide: MISCONCEPTION_CATALOG_PORT,
    useFactory: (): MisconceptionCatalogPort => new InMemoryMisconceptionCatalog(),
  },
  {
    provide: EvaluateAnswerUseCase,
    useFactory: (
      grading: GradingStrategyPort,
      catalog: MisconceptionCatalogPort,
      outbox: OutboxPort,
    ): EvaluateAnswerUseCase => new EvaluateAnswerUseCase(grading, catalog, outbox),
    inject: [GRADING_STRATEGY_PORT, MISCONCEPTION_CATALOG_PORT, INFRA.Outbox],
  },
  {
    provide: DIAGNOSTIC_SESSION_REPOSITORY_PORT,
    useFactory: (db: Db | null): DiagnosticSessionRepositoryPort =>
      db ? new PgDiagnosticSessionRepository(db) : new InMemoryDiagnosticSessionRepository(),
    inject: [INFRA.Db],
  },
  {
    provide: StartDiagnosticUseCase,
    useFactory: (
      graph: KnowledgeGraphRepositoryPort,
      sessions: DiagnosticSessionRepositoryPort,
      outbox: OutboxPort,
    ): StartDiagnosticUseCase => new StartDiagnosticUseCase(graph, sessions, outbox),
    inject: [KNOWLEDGE_GRAPH_REPOSITORY_PORT, DIAGNOSTIC_SESSION_REPOSITORY_PORT, INFRA.Outbox],
  },
  {
    provide: SubmitDiagnosticAnswerUseCase,
    useFactory: (
      graph: KnowledgeGraphRepositoryPort,
      sessions: DiagnosticSessionRepositoryPort,
      outbox: OutboxPort,
    ): SubmitDiagnosticAnswerUseCase => new SubmitDiagnosticAnswerUseCase(graph, sessions, outbox),
    inject: [KNOWLEDGE_GRAPH_REPOSITORY_PORT, DIAGNOSTIC_SESSION_REPOSITORY_PORT, INFRA.Outbox],
  },
  {
    provide: SeedInitialStateUseCase,
    useFactory: (state: LearnerStateRepositoryPort, model: MasteryModel): SeedInitialStateUseCase =>
      new SeedInitialStateUseCase(state, model),
    inject: [LEARNER_STATE_REPOSITORY_PORT, INFRA.MasteryModel],
  },
  { provide: LLM_PORT, useClass: StubLlmAdapter },
  {
    provide: CONTENT_GENERATOR_PORT,
    useFactory: (llm: LLMPort): ContentGeneratorPort => new AiContentGeneratorAdapter(llm),
    inject: [LLM_PORT],
  },
  {
    provide: FORMAT_EFFICACY_REPOSITORY_PORT,
    useFactory: (db: Db | null): FormatEfficacyRepositoryPort =>
      db ? new PgFormatEfficacyRepository(db) : new InMemoryFormatEfficacyRepository(),
    inject: [INFRA.Db],
  },
  {
    provide: FORMAT_SELECTION_STRATEGY_PORT,
    useFactory: (efficacy: FormatEfficacyRepositoryPort): FormatSelectionStrategyPort =>
      new ConstrainedBanditFormatSelector(new RuleBasedFormatSelector(), efficacy),
    inject: [FORMAT_EFFICACY_REPOSITORY_PORT],
  },
  {
    provide: SelectFormatUseCase,
    useFactory: (
      strategy: FormatSelectionStrategyPort,
      contentGenerator: ContentGeneratorPort,
      outbox: OutboxPort,
    ): SelectFormatUseCase => new SelectFormatUseCase(strategy, contentGenerator, outbox),
    inject: [FORMAT_SELECTION_STRATEGY_PORT, CONTENT_GENERATOR_PORT, INFRA.Outbox],
  },
  {
    provide: RecordFormatEfficacyUseCase,
    useFactory: (efficacy: FormatEfficacyRepositoryPort, outbox: OutboxPort): RecordFormatEfficacyUseCase =>
      new RecordFormatEfficacyUseCase(efficacy, outbox),
    inject: [FORMAT_EFFICACY_REPOSITORY_PORT, INFRA.Outbox],
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
    PLAN_REPOSITORY_PORT,
    PLANNER_STRATEGY_PORT,
    CreatePlanUseCase,
    NextActivityUseCase,
    GRADING_STRATEGY_PORT,
    MISCONCEPTION_CATALOG_PORT,
    EvaluateAnswerUseCase,
    DIAGNOSTIC_SESSION_REPOSITORY_PORT,
    StartDiagnosticUseCase,
    SubmitDiagnosticAnswerUseCase,
    SeedInitialStateUseCase,
    LLM_PORT,
    CONTENT_GENERATOR_PORT,
    FORMAT_EFFICACY_REPOSITORY_PORT,
    FORMAT_SELECTION_STRATEGY_PORT,
    SelectFormatUseCase,
    RecordFormatEfficacyUseCase,
  ],
})
export class InfraModule {}
