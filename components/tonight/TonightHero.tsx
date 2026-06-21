import Link from "next/link";

export const TONIGHT_START_CHIPS = [
  { id: "movies", label: "Movies", href: "#movies" },
  { id: "campfires", label: "Campfires", href: "#campfires" },
  { id: "low-energy", label: "Low-key evening", href: "#low-energy" },
  { id: "free", label: "Free tonight", href: "/activities?free=true&daypart=evening" },
] as const;

export function TonightHero() {
  return (
    <header className="pb-10 pt-4 md:pt-8">
      <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--lantern)]">
        Starlight
      </p>
      <h1 className="max-w-3xl text-white">Tonight feels different.</h1>
      <p className="mt-5 max-w-2xl text-lg text-white/78 md:text-xl">
        Find outdoor movies, campfires, cozy activities, and low-stress resort moments
        after the park day winds down.
      </p>

      <div className="mt-8">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-white/55">
          Start here
        </p>
        <div className="start-here mood-chips flex flex-wrap gap-2.5">
          {TONIGHT_START_CHIPS.map((chip) => (
            <Link
              key={chip.id}
              href={chip.href}
              className="mood-chip rounded-full border border-white/18 bg-white/10 px-4 py-2.5 text-sm font-extrabold text-white backdrop-blur-sm transition-colors hover:border-[var(--lantern)]/50 hover:bg-white/16"
            >
              {chip.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
