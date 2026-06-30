import { unstable_cache } from "next/cache";
import { CACHE_SECONDS, PUBLIC_CACHE_TAGS } from "@/lib/cache/tags";

export const PUBLIC_DATA_REVALIDATE_SECONDS = CACHE_SECONDS.evergreen;

type AsyncCallback<TArgs extends unknown[], TResult> = (
  ...args: TArgs
) => Promise<TResult>;

export function cachePublicData<TArgs extends unknown[], TResult>(
  callback: AsyncCallback<TArgs, TResult>,
  keyParts: string[]
): AsyncCallback<TArgs, TResult> {
  const cached = unstable_cache(callback, keyParts, {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.catalogue],
  });

  return async (...args: TArgs) => {
    try {
      return await cached(...args);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("incrementalCache missing")
      ) {
        return callback(...args);
      }
      throw error;
    }
  };
}
