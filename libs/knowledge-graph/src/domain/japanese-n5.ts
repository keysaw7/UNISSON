import { asId, type ConceptId, type SkillId } from '@unisson/shared-kernel';
import type { Concept, PrerequisiteEdge, Skill } from './concept';

/**
 * Domaine pilote : Japonais N5 (§7, ADR-007). Extrait volontairement compact mais réaliste :
 * il stresse le modèle mémoire/oubli (cœur scientifique) et offre un DAG de prérequis limpide.
 *
 *   Hiragana ─┐
 *             ├─▶ Lire mots en kana ─▶ Vocabulaire N5 ─▶ Particules は/が/を ─▶ Construire une phrase
 *   Katakana ─┘                        ▲
 *                          Kanji N5 ───┘ (prérequis souple, strength < 1)
 */

const sk = (id: string): SkillId => asId<'SkillId'>(id) as SkillId;
const ck = (id: string): ConceptId => asId<'ConceptId'>(id) as ConceptId;

export const N5_DOMAIN = 'japanese';

export const N5_SKILLS: Skill[] = [
  { id: sk('hiragana'), title: 'Hiragana', domain: N5_DOMAIN },
  { id: sk('katakana'), title: 'Katakana', domain: N5_DOMAIN },
  { id: sk('kanji-n5'), title: 'Kanji N5', domain: N5_DOMAIN },
  { id: sk('kana-words'), title: 'Lire des mots en kana', domain: N5_DOMAIN },
  { id: sk('vocab-n5'), title: 'Vocabulaire N5', domain: N5_DOMAIN },
  { id: sk('particles'), title: 'Particules は/が/を', domain: N5_DOMAIN },
  { id: sk('sentence'), title: 'Construire une phrase', domain: N5_DOMAIN },
];

export const N5_PREREQUISITES: PrerequisiteEdge[] = [
  { skillId: sk('kana-words'), requiresSkillId: sk('hiragana'), strength: 1 },
  { skillId: sk('kana-words'), requiresSkillId: sk('katakana'), strength: 1 },
  { skillId: sk('vocab-n5'), requiresSkillId: sk('kana-words'), strength: 1 },
  { skillId: sk('vocab-n5'), requiresSkillId: sk('kanji-n5'), strength: 0.5 }, // souple
  { skillId: sk('particles'), requiresSkillId: sk('vocab-n5'), strength: 1 },
  { skillId: sk('sentence'), requiresSkillId: sk('particles'), strength: 1 },
];

export const N5_CONCEPTS: Concept[] = [
  { id: ck('hiragana-a'), type: 'kana', payload: { glyph: 'あ', romaji: 'a' }, difficulty: 0.15 },
  { id: ck('hiragana-ka'), type: 'kana', payload: { glyph: 'か', romaji: 'ka' }, difficulty: 0.2 },
  { id: ck('hiragana-sa'), type: 'kana', payload: { glyph: 'さ', romaji: 'sa' }, difficulty: 0.25 },
  { id: ck('katakana-a'), type: 'kana', payload: { glyph: 'ア', romaji: 'a' }, difficulty: 0.3 },
  { id: ck('katakana-ka'), type: 'kana', payload: { glyph: 'カ', romaji: 'ka' }, difficulty: 0.35 },
  { id: ck('kanji-ichi'), type: 'kanji', payload: { glyph: '一', reading: 'いち', meaning: 'un' }, difficulty: 0.3 },
  { id: ck('kanji-nichi'), type: 'kanji', payload: { glyph: '日', reading: 'にち', meaning: 'jour' }, difficulty: 0.5 },
  { id: ck('vocab-neko'), type: 'vocab', payload: { word: 'ねこ', meaning: 'chat' }, difficulty: 0.4 },
  { id: ck('vocab-inu'), type: 'vocab', payload: { word: 'いぬ', meaning: 'chien' }, difficulty: 0.4 },
  { id: ck('particle-wa'), type: 'grammar', payload: { particle: 'は', role: 'thème' }, difficulty: 0.55 },
  { id: ck('particle-wo'), type: 'grammar', payload: { particle: 'を', role: 'COD' }, difficulty: 0.6 },
  { id: ck('sentence-svo'), type: 'grammar', payload: { pattern: 'N は N を V' }, difficulty: 0.7 },
];

/** Rattachement Skill → Concepts (table `skill_concept`, §12.7). */
export const N5_SKILL_CONCEPTS: Array<{ skillId: SkillId; conceptId: ConceptId }> = [
  { skillId: sk('hiragana'), conceptId: ck('hiragana-a') },
  { skillId: sk('hiragana'), conceptId: ck('hiragana-ka') },
  { skillId: sk('hiragana'), conceptId: ck('hiragana-sa') },
  { skillId: sk('katakana'), conceptId: ck('katakana-a') },
  { skillId: sk('katakana'), conceptId: ck('katakana-ka') },
  { skillId: sk('kanji-n5'), conceptId: ck('kanji-ichi') },
  { skillId: sk('kanji-n5'), conceptId: ck('kanji-nichi') },
  { skillId: sk('vocab-n5'), conceptId: ck('vocab-neko') },
  { skillId: sk('vocab-n5'), conceptId: ck('vocab-inu') },
  { skillId: sk('particles'), conceptId: ck('particle-wa') },
  { skillId: sk('particles'), conceptId: ck('particle-wo') },
  { skillId: sk('sentence'), conceptId: ck('sentence-svo') },
];

export interface KnowledgeGraphSeed {
  skills: Skill[];
  prerequisites: PrerequisiteEdge[];
  concepts: Concept[];
  skillConcepts: Array<{ skillId: SkillId; conceptId: ConceptId }>;
}

export const JAPANESE_N5_SEED: KnowledgeGraphSeed = {
  skills: N5_SKILLS,
  prerequisites: N5_PREREQUISITES,
  concepts: N5_CONCEPTS,
  skillConcepts: N5_SKILL_CONCEPTS,
};
