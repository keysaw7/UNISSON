import { describe, expect, it } from 'vitest';
import { gradeExact, gradeFuzzy } from './scoring';
import { levenshtein, similarity } from './text-matching';

describe('Correction déterministe (exact)', () => {
  it('accepte après normalisation (casse/espaces) et gère les variantes', () => {
    expect(gradeExact('Neko', ' neko ')).toEqual({ correct: true, score: 1 });
    expect(gradeExact(['chat', 'neko'], 'NEKO')).toEqual({ correct: true, score: 1 });
    expect(gradeExact('neko', 'inu')).toEqual({ correct: false, score: 0 });
  });
});

describe('Correction fuzzy (short_answer)', () => {
  it('tolère une faute de frappe, partiel au milieu, faux en dessous du seuil', () => {
    expect(gradeFuzzy('arigatou', 'arigato').correct).toBe(true); // typo mineure (1 char)
    const partial = gradeFuzzy('konnichiwa', 'konichi');
    expect(partial.correct).toBe(false);
    expect(partial.score).toBeGreaterThan(0);
    expect(gradeFuzzy('konnichiwa', 'xyz').score).toBe(0);
  });
});

describe('text-matching', () => {
  it('levenshtein et similarité sont cohérents', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(similarity('abc', 'abc')).toBe(1);
    expect(similarity('abc', 'abd')).toBeCloseTo(1 - 1 / 3, 5);
  });
});
