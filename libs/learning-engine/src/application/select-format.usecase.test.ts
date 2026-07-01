import { describe, expect, it } from 'vitest';
import { asId, InMemoryOutbox, type ConceptId, type LearnerId, type SkillId } from '@unisson/shared-kernel';
import type { ContentGeneratorPort, ContentRequest, LearningObject } from '@unisson/content';
import { RuleBasedFormatSelector, type FormatDecisionContext } from '../domain/format-selector';
import { FORMAT_EVENTS } from '../domain/format-events';
import { InMemoryFormatEfficacyRepository } from '../adapters/in-memory-format-efficacy.repository';
import { SelectFormatUseCase } from './select-format.usecase';
import { RecordFormatEfficacyUseCase } from './record-format-efficacy.usecase';

class FakeContentGenerator implements ContentGeneratorPort {
  async generate(request: ContentRequest): Promise<LearningObject> {
    return {
      id: 'lo-1',
      targetRef: request.targetRef,
      format: request.format,
      difficulty: request.difficulty,
      contentRef: `fake-content-for-${request.targetRef}`,
    };
  }
}

const learnerId = asId<'LearnerId'>('learner-f') as LearnerId;
const context: FormatDecisionContext = {
  conceptId: asId<'ConceptId'>('particle-wa') as ConceptId,
  skillId: asId<'SkillId'>('sentence') as SkillId,
  conceptType: 'grammar',
  intent: 'practice',
  masteryStage: 'developing',
  cycleStage: 'freePractice',
  hasMisconception: false,
};

describe('SelectFormatUseCase (§6.5)', () => {
  it('choisit un format puis génère le contenu concret, et émet FormatSelected', async () => {
    const outbox = new InMemoryOutbox();
    const usecase = new SelectFormatUseCase(new RuleBasedFormatSelector(), new FakeContentGenerator(), outbox);

    const { spec, learningObject, events } = await usecase.execute({ learnerId, context });

    expect(spec.format).toBeTruthy();
    expect(learningObject.format).toBe(spec.format);
    expect(learningObject.targetRef).toBe(context.conceptId);
    expect(events.map((e) => e.type)).toEqual([FORMAT_EVENTS.FormatSelected]);
    expect(await outbox.pullUnpublished()).toHaveLength(1);
  });
});

describe('RecordFormatEfficacyUseCase (§6.5)', () => {
  it('agrège les observations en moyenne incrémentale et émet FormatEfficacyRecorded', async () => {
    const outbox = new InMemoryOutbox();
    const repo = new InMemoryFormatEfficacyRepository();
    const usecase = new RecordFormatEfficacyUseCase(repo, outbox);

    const first = await usecase.execute({ formatType: 'cloze', conceptType: 'grammar', stabilityGainPerMinute: 0.2 });
    expect(first.stat.observations).toBe(1);
    expect(first.stat.stabilityGainPerMinute).toBeCloseTo(0.2, 5);

    const second = await usecase.execute({ formatType: 'cloze', conceptType: 'grammar', stabilityGainPerMinute: 0.6 });
    expect(second.stat.observations).toBe(2);
    expect(second.stat.stabilityGainPerMinute).toBeCloseTo(0.4, 5); // moyenne de 0.2 et 0.6

    expect(second.events.map((e) => e.type)).toEqual([FORMAT_EVENTS.FormatEfficacyRecorded]);
  });
});
