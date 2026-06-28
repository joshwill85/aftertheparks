import Typesense from "typesense";
import { SEARCH_COLLECTION_ALIAS } from "@/lib/search/typesense/schema";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required to use Typesense search`);
  }
  return value;
}

export function getTypesenseCollectionName(): string {
  return process.env.TYPESENSE_SEARCH_COLLECTION ?? SEARCH_COLLECTION_ALIAS;
}

export function createTypesenseClient() {
  const host = process.env.TYPESENSE_HOST ?? "localhost";
  const port = Number(process.env.TYPESENSE_PORT ?? 8108);
  const protocol = process.env.TYPESENSE_PROTOCOL ?? "http";
  const apiKey = requiredEnv("TYPESENSE_API_KEY");

  return new Typesense.Client({
    nodes: [{ host, port, protocol }],
    apiKey,
    connectionTimeoutSeconds: 3,
  });
}
