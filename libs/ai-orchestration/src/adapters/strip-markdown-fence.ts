/** Filet de sécurité : certains modèles enveloppent le JSON dans ```json ... ``` malgré la consigne. */
export function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
  return match ? match[1]! : trimmed;
}
