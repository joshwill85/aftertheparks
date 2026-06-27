"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const SPARKLE_TERMS = ["campfire", "movie", "magic", "starlight"];

export function StarlightSearchEffect() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(SPARKLE_TERMS.some((term) => q.includes(term)));
  }, [q]);

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 overflow-hidden" aria-hidden>
      <span
        className="hidden-resort-magic hrm-search-echo"
        data-hidden-detail="search_suggestion_echo"
        aria-hidden
      />
    </div>
  );
}
