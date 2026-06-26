import { unstable_cache } from "next/cache";

export const PUBLIC_DATA_REVALIDATE_SECONDS = 60;

type AsyncCallback<TArgs extends unknown[], TResult> = (
  ...args: TArgs
) => Promise<TResult>;

export function cachePublicData<TArgs extends unknown[], TResult>(
  callback: AsyncCallback<TArgs, TResult>,
  keyParts: string[]
): AsyncCallback<TArgs, TResult> {
  const cached = unstable_cache(callback, keyParts, {
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    tags: ["public-activity-data"],
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
