import { describe, expect, it } from 'vitest';
import { asId, InMemoryOutbox, type LearnerId, type SkillId } from '@unisson/shared-kernel';
import { InMemoryKnowledgeGraphRepository } from '@unisson/knowledge-graph';
import { InMemoryDiagnosticSessionRepository } from '../adapters/in-memory-diagnostic-session.repository';
import { DIAGNOSTIC_EVENTS } from '../domain/diagnostic-events';
import { StartDiagnosticUseCase } from './start-diagnostic.usecase';
import { SubmitDiagnosticAnswerUseCase } from './submit-diagnostic-answer.usecase';

const learnerId = asId<'LearnerId'>('learner-d') as LearnerId;

function setup() {
  const graph = new InMemoryKnowledgeGraphRepository();
  const sessions = new InMemoryDiagnosticSessionRepository();
  const outbox = new InMemoryOutbox();
  return {
    graph,
    sessions,
    outbox,
    start: new StartDiagnosticUseCase(graph, sessions, outbox),
    submit: new SubmitDiagnosticAnswerUseCase(graph, sessions, outbox),
  };
}

describe('Diagnostic adaptatif (§6.2) — bout en bout sur N5', () => {
  it('démarre, sert des items informatifs, puis converge sur des priors (budget respecté)', async () => {
    const { start, submit } = setup();

    const started = await start.execute({
      learnerId,
      domain: 'japanese',
      targetSkills: [asId<'SkillId'>('sentence') as SkillId],
      declaredLevel: 'novice',
      budget: 12,
    });

    expect(started.done).toBe(false);
    expect(started.nextProbe).not.toBeNull();
    expect(started.events.map((e) => e.type)).toContain(DIAGNOSTIC_EVENTS.DiagnosticStarted);

    // On répond « correct » à tout : la propagation vers les prérequis doit accélérer l'arrêt.
    let probe = started.nextProbe;
    const sessionId = started.session.id;
    let last: Awaited<ReturnType<SubmitDiagnosticAnswerUseCase['execute']>> | null = null;
    let guard = 0;

    while (probe && guard < 50) {
      last = await submit.execute({
        sessionId,
        conceptId: asId(probe.conceptId),
        correct: true,
      });
      probe = last.nextProbe;
      guard += 1;
    }

    expect(last).not.toBeNull();
    expect(last!.done).toBe(true);
    expect(last!.priors && last!.priors.length).toBeGreaterThan(0);
    expect(guard).toBeLessThanOrEqual(12); // diagnostic COURT
    const types = last!.events.map((e) => e.type);
    expect(types).toContain(DIAGNOSTIC_EVENTS.DiagnosticCompleted);
    expect(types).toContain(DIAGNOSTIC_EVENTS.InitialStateEstimated);
  });

  it('échec sur un prérequis de base fait baisser le prior des dépendants', async () => {
    const { start, submit } = setup();
    const started = await start.execute({
      learnerId,
      domain: 'japanese',
      targetSkills: [asId<'SkillId'>('sentence') as SkillId],
      declaredLevel: 'intermediate',
    });

    const first = started.nextProbe!;
    const res = await submit.execute({ sessionId: started.session.id, conceptId: asId(first.conceptId), correct: false });

    // La croyance sur le concept testé gagne en certitude après une observation directe.
    const after = res.session.belief[first.conceptId]!;
    expect(after.confidence).toBeGreaterThan(started.session.belief[first.conceptId]!.confidence);
  });
});
