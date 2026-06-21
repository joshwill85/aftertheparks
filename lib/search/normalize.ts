import { SEARCH_SYNONYMS } from "@/lib/search/synonyms";

export function normalizeSearchQuery(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export function tokenizeQuery(query: string): string[] {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return [];
  return normalized
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

export function expandTokens(tokens: string[]): string[] {
  const expanded = new Set(tokens);

  for (const token of tokens) {
    expanded.add(token);
    const synonyms = SEARCH_SYNONYMS[token];
    if (synonyms) {
      for (const synonym of synonyms) {
        expanded.add(synonym.replace(/\s+/g, " "));
        for (const part of synonym.split(/\s+/)) {
          if (part.length > 1) expanded.add(part);
        }
      }
    }
  }

  return [...expanded];
}

export function haystackIncludes(haystack: string, needle: string): boolean {
  return haystack.includes(needle);
}

export function matchesAllTokens(haystack: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  return tokens.every((token) => haystackIncludes(haystack, token));
}

export function countTokenHits(haystack: string, tokens: string[]): number {
  return tokens.reduce(
    (count, token) => count + (haystackIncludes(haystack, token) ? 1 : 0),
    0
  );
}
