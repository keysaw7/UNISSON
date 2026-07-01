/**
 * Le contrat `generate_content` actuel ne produit qu'un `body: string` brut (voir
 * `libs/ai-orchestration/src/adapters/content-generator.adapter.ts`) — pas encore les items
 * structurés (`choices`, `correctAnswer`) visés à terme (§10.3, `GenerateExerciseOutput`). On
 * tente quand même un parse JSON défensif : si le contenu concret s'enrichit un jour sans changer
 * `contentRef: string`, le rendu structuré s'active automatiquement, sinon on dégrade en texte brut.
 */
export interface StructuredMcqContent {
  prompt: string;
  choices: string[];
  correctAnswer: string;
}

export function tryParseStructuredMcq(contentRef: string): StructuredMcqContent | null {
  try {
    const json: unknown = JSON.parse(contentRef);
    if (
      json &&
      typeof json === 'object' &&
      'prompt' in json &&
      'choices' in json &&
      'correctAnswer' in json &&
      typeof (json as { prompt: unknown }).prompt === 'string' &&
      Array.isArray((json as { choices: unknown }).choices) &&
      typeof (json as { correctAnswer: unknown }).correctAnswer === 'string'
    ) {
      return json as StructuredMcqContent;
    }
  } catch {
    // Texte brut, non-JSON : fallback attendu tant que le contrat n'est pas enrichi.
  }
  return null;
}
