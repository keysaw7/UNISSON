import { describe, expect, it } from 'vitest';
import type { EvidenceSignals } from './assessment-evidence';
import { classifyError, computeEvidenceWeight } from './error-analysis';

const signals = (over: Partial<EvidenceSignals> = {}): EvidenceSignals => ({
  latencyMs: 5000,
  usedHint: false,
  attempts: 1,
  ...over,
});

describe('classifyError (taxonomie §6.4)', () => {
  it('bonne réponse → correct ; correcte rapide+difficile+peu sûr → guess', () => {
    expect(classifyError({ correct: true, score: 1, difficulty: 0.5, signals: signals() })).toBe('correct');
    expect(
      classifyError({ correct: true, score: 1, difficulty: 0.8, signals: signals({ latencyMs: 800, selfConfidence: 0.2 }) }),
    ).toBe('guess');
  });

  it('erreur : partielle → partial ; très rapide → slip ; lente délibérée → misconception', () => {
    expect(classifyError({ correct: false, score: 0.6, difficulty: 0.5, signals: signals() })).toBe('partial');
    expect(classifyError({ correct: false, score: 0, difficulty: 0.5, signals: signals({ latencyMs: 800 }) })).toBe('slip');
    expect(classifyError({ correct: false, score: 0, difficulty: 0.5, signals: signals({ latencyMs: 9000 }) })).toBe('misconception');
  });

  it('un pattern de misconception matché force misconception', () => {
    expect(
      classifyError({ correct: false, score: 0, difficulty: 0.5, signals: signals({ latencyMs: 500 }), misconceptionMatched: true }),
    ).toBe('misconception');
  });
});

describe('computeEvidenceWeight', () => {
  it('guess/slip ont un poids faible ; l’indice et les tentatives multiples réduisent le poids', () => {
    expect(computeEvidenceWeight('guess', signals())).toBeLessThan(computeEvidenceWeight('correct', signals()));
    expect(computeEvidenceWeight('slip', signals())).toBeLessThan(computeEvidenceWeight('partial', signals()));
    expect(computeEvidenceWeight('correct', signals({ usedHint: true }))).toBeLessThan(
      computeEvidenceWeight('correct', signals()),
    );
    expect(computeEvidenceWeight('correct', signals({ attempts: 3 }))).toBeLessThan(
      computeEvidenceWeight('correct', signals()),
    );
  });
});
