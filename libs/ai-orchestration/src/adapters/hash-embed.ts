/** Embedding déterministe (dev/CI) — remplaçable par un vrai modèle d'embeddings en production. */
export function hashEmbed(text: string, dimensions = 64): number[] {
  const vec = new Array<number>(dimensions).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[i % dimensions]! += text.charCodeAt(i) / 255;
  }
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return dot;
}
