import { Suspense } from "react";
import { SearchClient } from "@/components/atlas/SearchClient";
import { Hero } from "@/components/atlas/Hero";
import { StarlightSearchEffect } from "@/components/magic/StarlightSearchEffect";

export default function SearchPage() {
  return (
    <div className="relative">
      <Suspense fallback={null}>
        <StarlightSearchEffect />
      </Suspense>
      <Hero
        title="Search"
        subtitle="Find activities by name, resort, or category."
      />
      <Suspense fallback={<p className="text-[var(--color-muted)]">Loading…</p>}>
        <SearchClient />
      </Suspense>
    </div>
  );
}
