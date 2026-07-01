import { JAPANESE_N5_SEED, type KnowledgeGraphSeed } from './japanese-n5';
import { SPANISH_A1_SEED } from './spanish-a1';

/** Fusionne plusieurs seeds de domaines pour les adapters mémoire et Postgres. */
export function mergeKnowledgeGraphSeeds(...seeds: KnowledgeGraphSeed[]): KnowledgeGraphSeed {
  return {
    skills: seeds.flatMap((s) => s.skills),
    prerequisites: seeds.flatMap((s) => s.prerequisites),
    concepts: seeds.flatMap((s) => s.concepts),
    skillConcepts: seeds.flatMap((s) => s.skillConcepts),
  };
}

/** Graphe multi-domaines chargé par défaut (Japonais N5 + Espagnol A1). */
export const DEFAULT_KNOWLEDGE_GRAPH_SEED = mergeKnowledgeGraphSeeds(JAPANESE_N5_SEED, SPANISH_A1_SEED);

/** Seeds disponibles par domaine (Domain Packs, §14). */
export const DOMAIN_SEEDS: Record<string, KnowledgeGraphSeed> = {
  japanese: JAPANESE_N5_SEED,
  spanish: SPANISH_A1_SEED,
};
