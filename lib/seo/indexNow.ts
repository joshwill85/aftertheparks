export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

export const AFTER_THE_PARKS_INDEXNOW_KEY = "8ff5c8f7321bc8fd1afbecbd5ebd9646";

export function getIndexNowKey(env?: { INDEXNOW_KEY?: string }): string {
  const source = env ?? process.env;
  return source.INDEXNOW_KEY?.trim() || AFTER_THE_PARKS_INDEXNOW_KEY;
}

export function indexNowEndpoint(): string {
  return "https://api.indexnow.org/indexnow";
}

export function normalizeChangedUrls(baseUrl: string, urls: string[]): string[] {
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of urls) {
    const trimmed = value.trim();
    if (!trimmed) continue;

    const url = new URL(trimmed, base);
    if (url.hostname !== base.hostname) continue;

    url.hash = "";
    const href = url.toString().replace(/\/$/, "");
    if (seen.has(href)) continue;
    seen.add(href);
    normalized.push(href);
  }

  return normalized;
}

export function buildIndexNowPayload(
  baseUrl: string,
  key: string,
  changedUrls: string[]
): IndexNowPayload {
  const base = new URL(baseUrl);
  const cleanKey = key.trim();
  if (!cleanKey) {
    throw new Error("IndexNow key is required");
  }

  return {
    host: base.hostname,
    key: cleanKey,
    keyLocation: new URL(`/${cleanKey}.txt`, base).toString(),
    urlList: normalizeChangedUrls(baseUrl, changedUrls),
  };
}
