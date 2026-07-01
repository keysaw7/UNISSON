import { describe, it, expect } from 'vitest';
import { ok, err, isOk } from './result';
import { createEvent } from './domain-event';
import { InMemoryEventBus } from './event-bus';

describe('Result', () => {
  it('représente un succès', () => {
    const r = ok(42);
    expect(isOk(r)).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });

  it('représente un échec', () => {
    const r = err(new Error('boom'));
    expect(isOk(r)).toBe(false);
  });
});

describe('InMemoryEventBus', () => {
  it('livre un événement à ses abonnés', async () => {
    const bus = new InMemoryEventBus();
    const received: string[] = [];
    bus.subscribe('Ping', (e) => {
      received.push(e.type);
    });

    await bus.publish(
      createEvent({ type: 'Ping', aggregateType: 'Test', aggregateId: 'a1', payload: {} }),
    );

    expect(received).toEqual(['Ping']);
  });
});
