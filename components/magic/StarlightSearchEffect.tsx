"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const EASTER_EGGS = process.env.NEXT_PUBLIC_EASTER_EGGS === "true";

export function StarlightSearchEffect() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(EASTER_EGGS && q.includes("starlight"));
  }, [q]);

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 20 }).map((_, i) => (
        <span
          key={i}
          className="absolute h-0.5 w-0.5 rounded-full bg-[var(--color-porch-light)]"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: 0.3 + Math.random() * 0.5,
          }}
        />
      ))}
    </div>
  );
}
