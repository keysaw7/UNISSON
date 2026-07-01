import { Global, Module, type Provider } from '@nestjs/common';
import {
  InMemoryEventBus,
  InMemoryEventJournal,
  InMemoryOutbox,
  OutboxRelay,
  ScalableOutboxRelay,
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
  AdvanceConceptCycleUseCase,
  CONCEPT_CYCLE_REPOSITORY_PORT,
  DIAGNOSTIC_SESSION_REPOSITORY_PORT,
  FORMAT_EFFICACY_REPOSITORY_PORT,
  FORMAT_SELECTION_STRATEGY_PORT,
  GOAL_REPOSITORY_PORT,
  InMemoryConceptCycleRepository,
  InMemoryDiagnosticSessionRepository,
  InMemoryFormatEfficacyRepository,
  InMemoryGoalRepository,
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
  type ConceptCycleRepositoryPort,
  type DiagnosticSessionRepositoryPort,
  type FormatEfficacyRepositoryPort,
  type FormatSelectionStrategyPort,
  type GoalRepositoryPort,
  type PlannerStrategyPort,
  type PlanRepositoryPort,
} from '@unisson/learning-engine';
import {
  EvaluateAnswerUseCase,
  GRADING_STRATEGY_PORT,
  InMemoryMisconceptionCatalog,
  MISCONCEPTION_CATALOG_PORT,
  PrerequisiteChecker,
  RuleBasedGradingStrategy,
  type GradingStrategyPort,
  type MisconceptionCatalogPort,
} from '@unisson/assessment';
import {
  CONTENT_GENERATOR_PORT,
  InMemoryLearningObjectRepository,
  LEARNING_OBJECT_REPOSITORY_PORT,
  PersistingContentGeneratorAdapter,
  type ContentGeneratorPort,
  type LearningObjectRepositoryPort,
} from '@unisson/content';
import {
  AI_GATEWAY,
  AiContentGeneratorAdapter,
  AiGateway,
  CACHE_PORT,
  InMemoryCache,
  LayeredCache,
  LLM_PORT,
  selectLlmProviders,
  StructuredJsonTelemetryAdapter,
  TELEMETRY_PORT,
  type CachePort,
  type LLMPort,
  type SelectedLlmProviders,
  type TelemetryPort,
} from '@unisson/ai-orchestration';
import { EnvErrorReporter } from './env-error-reporter';
import {
  EnsureLearnerExistsUseCase,
  InMemoryLearnerRepository,
  LEARNER_REPOSITORY_PORT,
  type LearnerRepositoryPort,
} from '@unisson/identity';
import {
  createDb,
  createPool,
  PgEventJournal,
  PgEvidenceRepository,
  PgFormatEfficacyRepository,
  PgGoalRepository,
  PgKnowledgeGraphRepository,
  PgConceptCycleRepository,
  PgDiagnosticSessionRepository,
  PgLearnerRepository,
  PgLearnerStateRepository,
  PgLearningObjectRepository,
  PgOutbox,
  PgPlanRepository,
  PgSemanticCache,
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
  LlmProviders: Symbol('SelectedLlmProviders'),
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
      new ScalableOutboxRelay(outbox, bus, journal, (count) => {
        if (process.env.EVENT_BUS_EXTERNAL === '1') {
          console.info(JSON.stringify({ ts: new Date().toISOString(), event: 'outbox.external_hook', count }));
        }
      }),
    inject: [INFRA.Outbox, INFRA.EventBus, INFRA.EventJournal],
  },
  {
    provide: LEARNER_REPOSITORY_PORT,
    useFactory: (db: Db | null): LearnerRepositoryPort =>
      db ? new PgLearnerRepository(db) : new InMemoryLearnerRepository(),
    inject: [INFRA.Db],
  },
  {
    provide: EnsureLearnerExistsUseCase,
    useFactory: (learners: LearnerRepositoryPort): EnsureLearnerExistsUseCase =>
      new EnsureLearnerExistsUseCase(learners),
    inject: [LEARNER_REPOSITORY_PORT],
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
    provide: GOAL_REPOSITORY_PORT,
    useFactory: (db: Db | null): GoalRepositoryPort =>
      db ? new PgGoalRepository(db) : new InMemoryGoalRepository(),
    inject: [INFRA.Db],
  },
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
    provide: CONCEPT_CYCLE_REPOSITORY_PORT,
    useFactory: (db: Db | null): ConceptCycleRepositoryPort =>
      db ? new PgConceptCycleRepository(db) : new InMemoryConceptCycleRepository(),
    inject: [INFRA.Db],
  },
  {
    provide: AdvanceConceptCycleUseCase,
    useFactory: (
      cycles: ConceptCycleRepositoryPort,
      state: LearnerStateRepositoryPort,
      model: MasteryModel,
    ): AdvanceConceptCycleUseCase => new AdvanceConceptCycleUseCase(cycles, state, model),
    inject: [CONCEPT_CYCLE_REPOSITORY_PORT, LEARNER_STATE_REPOSITORY_PORT, INFRA.MasteryModel],
  },
  {
    provide: NextActivityUseCase,
    useFactory: (
      graph: KnowledgeGraphRepositoryPort,
      state: LearnerStateRepositoryPort,
      model: MasteryModel,
      plans: PlanRepositoryPort,
      cycles: ConceptCycleRepositoryPort,
      cycleResolver: AdvanceConceptCycleUseCase,
    ): NextActivityUseCase => new NextActivityUseCase(graph, state, model, plans, cycles, cycleResolver),
    inject: [
      KNOWLEDGE_GRAPH_REPOSITORY_PORT,
      LEARNER_STATE_REPOSITORY_PORT,
      INFRA.MasteryModel,
      PLAN_REPOSITORY_PORT,
      CONCEPT_CYCLE_REPOSITORY_PORT,
      AdvanceConceptCycleUseCase,
    ],
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
      graph: KnowledgeGraphRepositoryPort,
      state: LearnerStateRepositoryPort,
    ): EvaluateAnswerUseCase =>
      new EvaluateAnswerUseCase(grading, catalog, outbox, new PrerequisiteChecker(graph, state)),
    inject: [
      GRADING_STRATEGY_PORT,
      MISCONCEPTION_CATALOG_PORT,
      INFRA.Outbox,
      KNOWLEDGE_GRAPH_REPOSITORY_PORT,
      LEARNER_STATE_REPOSITORY_PORT,
    ],
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
  {
    // Sélection du/des fournisseur(s) LLM depuis l'environnement (Anthropic / OpenAI / stub —
    // §10.7, cf. `.env.example`). Calculée une seule fois et partagée par `LLM_PORT` et
    // `AI_GATEWAY` pour ne construire qu'une seule instance de chaque adapter par processus.
    provide: INFRA.LlmProviders,
    useFactory: (): SelectedLlmProviders => selectLlmProviders(process.env),
  },
  {
    provide: LLM_PORT,
    useFactory: (providers: SelectedLlmProviders): LLMPort => providers.primary,
    inject: [INFRA.LlmProviders],
  },
  {
    provide: CACHE_PORT,
    useFactory: (db: Db | null): CachePort => {
      const exact = new InMemoryCache();
      return db ? new LayeredCache(exact, new PgSemanticCache(db)) : exact;
    },
    inject: [INFRA.Db],
  },
  {
    provide: TELEMETRY_PORT,
    useFactory: (): TelemetryPort => new StructuredJsonTelemetryAdapter(new EnvErrorReporter()),
  },
  {
    // AI Gateway (§10.2) : cache + validation + boucle de réparation + fallback + télémétrie,
    // partagé par toutes les capacités (`parse_goal`, `generate_content`, …). Le fournisseur de
    // secours (autre provider réel, ou stub) évite de bloquer le domaine si le primaire échoue.
    provide: AI_GATEWAY,
    useFactory: (providers: SelectedLlmProviders, cache: CachePort, telemetry: TelemetryPort): AiGateway =>
      new AiGateway(providers.primary, cache, telemetry, providers.fallback),
    inject: [INFRA.LlmProviders, CACHE_PORT, TELEMETRY_PORT],
  },
  {
    provide: LEARNING_OBJECT_REPOSITORY_PORT,
    useFactory: (db: Db | null): LearningObjectRepositoryPort =>
      db ? new PgLearningObjectRepository(db) : new InMemoryLearningObjectRepository(),
    inject: [INFRA.Db],
  },
  {
    provide: CONTENT_GENERATOR_PORT,
    useFactory: (gateway: AiGateway, repository: LearningObjectRepositoryPort): ContentGeneratorPort => {
      const ai = new AiContentGeneratorAdapter(gateway);
      return new PersistingContentGeneratorAdapter(ai, repository);
    },
    inject: [AI_GATEWAY, LEARNING_OBJECT_REPOSITORY_PORT],
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
    LEARNER_REPOSITORY_PORT,
    EnsureLearnerExistsUseCase,
    KNOWLEDGE_GRAPH_REPOSITORY_PORT,
    LEARNER_STATE_REPOSITORY_PORT,
    EVIDENCE_REPOSITORY_PORT,
    RecordEvidenceUseCase,
    GOAL_REPOSITORY_PORT,
    PLAN_REPOSITORY_PORT,
    PLANNER_STRATEGY_PORT,
    CreatePlanUseCase,
    NextActivityUseCase,
    AdvanceConceptCycleUseCase,
    CONCEPT_CYCLE_REPOSITORY_PORT,
    GRADING_STRATEGY_PORT,
    MISCONCEPTION_CATALOG_PORT,
    EvaluateAnswerUseCase,
    DIAGNOSTIC_SESSION_REPOSITORY_PORT,
    StartDiagnosticUseCase,
    SubmitDiagnosticAnswerUseCase,
    SeedInitialStateUseCase,
    LLM_PORT,
    AI_GATEWAY,
    LEARNING_OBJECT_REPOSITORY_PORT,
    CONTENT_GENERATOR_PORT,
    FORMAT_EFFICACY_REPOSITORY_PORT,
    FORMAT_SELECTION_STRATEGY_PORT,
    SelectFormatUseCase,
    RecordFormatEfficacyUseCase,
  ],
})
export class InfraModule {}
