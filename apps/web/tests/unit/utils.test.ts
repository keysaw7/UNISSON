import { describe, expect, it } from 'vitest';
import { cn, humanizeId } from '@/lib/utils';

describe('humanizeId', () => {
  it('transforme un identifiant technique en libellé lisible', () => {
    expect(humanizeId('hiragana-a')).toBe('Hiragana A');
    expect(humanizeId('sentence_svo')).toBe('Sentence Svo');
    expect(humanizeId('particles')).toBe('Particles');
  });
});

describe('cn', () => {
  it('fusionne les classes Tailwind en résolvant les conflits (dernier gagne)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-sm', undefined, false, 'font-bold')).toBe('text-sm font-bold');
  });
});
