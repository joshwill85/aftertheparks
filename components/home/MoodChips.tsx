import Link from "next/link";

export const HOME_MOOD_CHIPS = [
  { id: "tonight", label: "Tonight", href: "/tonight" },
  { id: "free", label: "Free", href: "/activities?free=true" },
  { id: "little_kids", label: "Little kids", href: "/activities?category=arts_crafts" },
  { id: "rainy", label: "Rain-friendly", href: "/activities?category=arcade" },
  { id: "pool_break", label: "Pool break", href: "/activities?category=poolside" },
  { id: "movies", label: "Movies", href: "/activities?category=movies_under_stars" },
  { id: "campfires", label: "Campfires", href: "/activities?category=campfire" },
  {
    id: "before_checkin",
    label: "Before check-in",
    href: "/guides/first-night-at-the-resort",
  },
] as const;

export function MoodChips() {
  return (
    <div className="mood-chips flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {HOME_MOOD_CHIPS.map((chip) => (
        <Link key={chip.id} href={chip.href} className="mood-chip">
          {chip.label}
        </Link>
      ))}
    </div>
  );
}
