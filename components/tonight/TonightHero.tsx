import Link from "next/link";

export const TONIGHT_START_CHIPS = [
  { id: "movies", label: "Movies", href: "#movies" },
  { id: "campfires", label: "Campfires", href: "#campfires" },
  { id: "low-energy", label: "Low-key evening", href: "#low-energy" },
] as const;

export function TonightHero() {
  return (
    <header className="pb-10 pt-4 md:pt-8">
      <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(253,185,78,0.45)] bg-[rgba(255,249,239,0.92)] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-[#7a4a00]">
        Evening magic
      </p>
      <h2 className="max-w-3xl font-display text-[var(--brand-ink)]">
        Tonight feels different.
      </h2>
      <p className="mt-5 max-w-2xl text-lg text-[var(--muted)] md:text-xl">
        Find movies, campfires, cozy activities, and low-stress resort ideas
        after the park day winds down.
      </p>

      <div className="mt-8">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
          Start here
        </p>
        <div className="mood-chips-scroll">
          <div className="start-here mood-chips">
            {TONIGHT_START_CHIPS.map((chip) => (
              <Link key={chip.id} href={chip.href} className="mood-chip">
                {chip.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
