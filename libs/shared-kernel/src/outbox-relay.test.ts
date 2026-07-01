import { describe, expect, it } from 'vitest';
import { createEvent } from './domain-event';
import { InMemoryEventBus } from './event-bus';
import { InMemoryEventJournal } from './event-journal';
import { InMemoryOutbox } from './outbox';
import { OutboxRelay } from './outbox-relay';

const makeEvent = (id: string) =>
  createEvent({ type: 'MasteryUpdated', aggregateType: 'LearnerMastery', aggregateId: id, payload: { id } });

describe('Outbox + relay (§12.3)', () => {
  it('draine, diffuse sur le bus, journalise et marque publié', async () => {
    const outbox = new InMemoryOutbox();
    const bus = new InMemoryEventBus();
    const journal = new InMemoryEventJournal();
    const relay = new OutboxRelay(outbox, bus, journal);

    const received: string[] = [];
    bus.subscribe('MasteryUpdated', (e) => {
      received.push(e.aggregateId);
    });

    await outbox.enqueue([makeEvent('a'), makeEvent('b')]);
    const n = await relay.drain();

    expect(n).toBe(2);
    expect(received).toEqual(['a', 'b']);
    expect(await journal.all()).toHaveLength(2);
    expect(await outbox.pullUnpublished()).toHaveLength(0);
  });

  it('un second drain ne republie rien (rien de nouveau)', async () => {
    const outbox = new InMemoryOutbox();
    const bus = new InMemoryEventBus();
    const relay = new OutboxRelay(outbox, bus);

    await outbox.enqueue([makeEvent('a')]);
    expect(await relay.drain()).toBe(1);
    expect(await relay.drain()).toBe(0);
  });

  it('est idempotent : un même eventId n’est jamais diffusé deux fois', async () => {
    const outbox = new InMemoryOutbox();
    const bus = new InMemoryEventBus();
    const relay = new OutboxRelay(outbox, bus);

    let count = 0;
    bus.subscribe('MasteryUpdated', () => {
      count++;
    });

    const dup = makeEvent('a');
    await outbox.enqueue([dup]);
    await outbox.enqueue([dup]); // ré-enqueue accidentel du même événement
    await relay.drain();
    expect(count).toBe(1);
  });
});
