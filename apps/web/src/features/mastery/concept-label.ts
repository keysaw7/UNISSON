import type { ConceptDto } from '@/lib/api/types';
import { humanizeId } from '@/lib/utils';

/**
 * Le `payload` d'un concept (§7) varie par type (`kana`: glyph/romaji, `kanji`: glyph/reading/
 * meaning, `vocab`: word/meaning, `grammar`: particle/role ou pattern) — pas de schéma unique.
 */
export function conceptLabel(concept: ConceptDto): { title: string; subtitle?: string } {
  const p = concept.payload;
  const glyph = typeof p.glyph === 'string' ? p.glyph : undefined;
  const word = typeof p.word === 'string' ? p.word : undefined;
  const particle = typeof p.particle === 'string' ? p.particle : undefined;
  const pattern = typeof p.pattern === 'string' ? p.pattern : undefined;
  const meaning = typeof p.meaning === 'string' ? p.meaning : undefined;
  const romaji = typeof p.romaji === 'string' ? p.romaji : undefined;
  const reading = typeof p.reading === 'string' ? p.reading : undefined;
  const role = typeof p.role === 'string' ? p.role : undefined;

  const title = glyph ?? word ?? particle ?? pattern ?? humanizeId(concept.id);
  const subtitle = [romaji, reading, meaning, role].filter(Boolean).join(' · ') || undefined;
  return { title, subtitle };
}
