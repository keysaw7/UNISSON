import { asId, type ConceptId, type SkillId } from '@unisson/shared-kernel';
import type { Concept, PrerequisiteEdge, Skill } from './concept';
import type { KnowledgeGraphSeed } from './japanese-n5';

/**
 * Second domaine pilote : Espagnol A1 (§14). Volontairement différent du Japonais N5
 * (pas de kana/kanji) pour valider l'agnosticisme du moteur.
 *
 *   Salutations ─▶ Nombres ─▶ Vocabulaire de base ─▶ Présent simple ─▶ Conversation basique
 */

const sk = (id: string): SkillId => asId<'SkillId'>(id) as SkillId;
const ck = (id: string): ConceptId => asId<'ConceptId'>(id) as ConceptId;

export const SPANISH_A1_DOMAIN = 'spanish';

export const SPANISH_A1_SKILLS: Skill[] = [
  { id: sk('greetings'), title: 'Salutations', domain: SPANISH_A1_DOMAIN },
  { id: sk('numbers'), title: 'Nombres 1–10', domain: SPANISH_A1_DOMAIN },
  { id: sk('basic-vocab'), title: 'Vocabulaire de base', domain: SPANISH_A1_DOMAIN },
  { id: sk('present-tense'), title: 'Présent de l’indicatif', domain: SPANISH_A1_DOMAIN },
  { id: sk('basic-conversation'), title: 'Conversation basique', domain: SPANISH_A1_DOMAIN },
];

export const SPANISH_A1_PREREQUISITES: PrerequisiteEdge[] = [
  { skillId: sk('numbers'), requiresSkillId: sk('greetings'), strength: 1 },
  { skillId: sk('basic-vocab'), requiresSkillId: sk('numbers'), strength: 1 },
  { skillId: sk('present-tense'), requiresSkillId: sk('basic-vocab'), strength: 1 },
  { skillId: sk('basic-conversation'), requiresSkillId: sk('present-tense'), strength: 1 },
];

export const SPANISH_A1_CONCEPTS: Concept[] = [
  { id: ck('es-hola'), type: 'vocab', payload: { word: 'hola', meaning: 'bonjour' }, difficulty: 0.1 },
  { id: ck('es-adios'), type: 'vocab', payload: { word: 'adiós', meaning: 'au revoir' }, difficulty: 0.15 },
  { id: ck('es-uno'), type: 'vocab', payload: { word: 'uno', meaning: 'un' }, difficulty: 0.2 },
  { id: ck('es-diez'), type: 'vocab', payload: { word: 'diez', meaning: 'dix' }, difficulty: 0.25 },
  { id: ck('es-casa'), type: 'vocab', payload: { word: 'casa', meaning: 'maison' }, difficulty: 0.35 },
  { id: ck('es-agua'), type: 'vocab', payload: { word: 'agua', meaning: 'eau' }, difficulty: 0.35 },
  { id: ck('es-ser-present'), type: 'grammar', payload: { verb: 'ser', form: 'soy', meaning: 'je suis' }, difficulty: 0.5 },
  { id: ck('es-tener-present'), type: 'grammar', payload: { verb: 'tener', form: 'tengo', meaning: 'j’ai' }, difficulty: 0.55 },
  { id: ck('es-intro-phrase'), type: 'grammar', payload: { pattern: 'Me llamo …' }, difficulty: 0.65 },
];

export const SPANISH_A1_SKILL_CONCEPTS: Array<{ skillId: SkillId; conceptId: ConceptId }> = [
  { skillId: sk('greetings'), conceptId: ck('es-hola') },
  { skillId: sk('greetings'), conceptId: ck('es-adios') },
  { skillId: sk('numbers'), conceptId: ck('es-uno') },
  { skillId: sk('numbers'), conceptId: ck('es-diez') },
  { skillId: sk('basic-vocab'), conceptId: ck('es-casa') },
  { skillId: sk('basic-vocab'), conceptId: ck('es-agua') },
  { skillId: sk('present-tense'), conceptId: ck('es-ser-present') },
  { skillId: sk('present-tense'), conceptId: ck('es-tener-present') },
  { skillId: sk('basic-conversation'), conceptId: ck('es-intro-phrase') },
];

export const SPANISH_A1_SEED: KnowledgeGraphSeed = {
  skills: SPANISH_A1_SKILLS,
  prerequisites: SPANISH_A1_PREREQUISITES,
  concepts: SPANISH_A1_CONCEPTS,
  skillConcepts: SPANISH_A1_SKILL_CONCEPTS,
};
