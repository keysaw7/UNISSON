import { describe, expect, it } from 'vitest';
import { tryParseStructuredMcq } from '@/components/content-renderers/parse-structured';

describe('tryParseStructuredMcq', () => {
  it('parse un contentRef JSON structuré valide', () => {
    const result = tryParseStructuredMcq(JSON.stringify({ prompt: 'Comment dit-on « chat » ?', choices: ['ねこ', 'いぬ'], correctAnswer: 'ねこ' }));
    expect(result).toEqual({ prompt: 'Comment dit-on « chat » ?', choices: ['ねこ', 'いぬ'], correctAnswer: 'ねこ' });
  });

  it("dégrade en null pour le texte brut actuel de generate_content (contrat non enrichi)", () => {
    expect(tryParseStructuredMcq('[stub] contenu « mcq » pour « hiragana-a » (difficulté 0.35).')).toBeNull();
  });

  it('dégrade en null pour un JSON valide mais incomplet', () => {
    expect(tryParseStructuredMcq(JSON.stringify({ prompt: 'x' }))).toBeNull();
  });
});
