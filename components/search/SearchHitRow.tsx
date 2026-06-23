import Link from "next/link";
import type { SearchHit } from "@/lib/search/types";
import { cn } from "@/lib/utils";

const KIND_LABELS: Record<SearchHit["kind"], string> = {
  activity: "Activity",
  resort: "Resort",
  guide: "Guide",
  category: "Category",
  page: "Page",
  movie: "Movie",
  offering: "Official offering",
};

const KIND_ICONS: Record<SearchHit["kind"], string> = {
  activity: "✨",
  resort: "🏨",
  guide: "📖",
  category: "🏷️",
  page: "↗",
  movie: "🎬",
  offering: "✓",
};

interface SearchHitRowProps {
  hit: SearchHit;
  compact?: boolean;
  onNavigate?: () => void;
}

export function SearchHitRow({ hit, compact = false, onNavigate }: SearchHitRowProps) {
  return (
    <Link
      href={hit.href}
      onClick={onNavigate}
      className={cn("search-hit", compact && "search-hit--compact")}
    >
      <span className="search-hit__icon" aria-hidden>
        {hit.badges?.[0]?.length === 1 || hit.kind === "category"
          ? hit.badges?.[0]
          : KIND_ICONS[hit.kind]}
      </span>
      <span className="search-hit__body">
        <span className="search-hit__topline">
          <span className="search-hit__kind">{KIND_LABELS[hit.kind]}</span>
          {hit.badges?.slice(hit.kind === "category" ? 1 : 0).map((badge) => (
            <span key={badge} className="search-hit__badge">
              {badge}
            </span>
          ))}
        </span>
        <span className="search-hit__title">{hit.title}</span>
        {!compact && hit.subtitle && (
          <span className="search-hit__subtitle">{hit.subtitle}</span>
        )}
        {!compact && hit.description && (
          <span className="search-hit__description">{hit.description}</span>
        )}
      </span>
    </Link>
  );
}
