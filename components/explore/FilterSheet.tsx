"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { FilterFields } from "@/components/explore/FilterRail";

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  resorts: { slug: string; name: string }[];
  basePath?: string;
}

export function FilterSheet({
  open,
  onClose,
  resorts,
  basePath = "/activities",
}: FilterSheetProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      const qs = params.toString();
      router.push(qs ? `${basePath}?${qs}` : basePath);
    },
    [router, searchParams, basePath]
  );

  const activeResort = searchParams.get("resort");
  const activeCategory = searchParams.get("category");
  const activeDaypart = searchParams.get("daypart");
  const freeOnly = searchParams.get("free") === "true";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 min-[900px]:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close filters"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-sheet-title"
        className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-5 pb-10 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="filter-sheet-title" className="font-display text-lg font-semibold">
            Filters
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full px-4 text-sm font-bold text-[var(--accent)]"
          >
            Done
          </button>
        </div>

        <FilterFields
          resorts={resorts}
          activeResort={activeResort}
          activeCategory={activeCategory}
          activeDaypart={activeDaypart}
          freeOnly={freeOnly}
          update={update}
        />
      </div>
    </div>
  );
}
