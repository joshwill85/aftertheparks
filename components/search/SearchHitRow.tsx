import Link from "next/link";
import { IconGlyph } from "@/components/icons/IconGlyph";
import { SEARCH_KIND_ICON_KEYS } from "@/components/icons/iconRegistry";
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
        <IconGlyph
          iconKey={hit.iconKey ?? SEARCH_KIND_ICON_KEYS[hit.kind]}
          className="text-[1.1rem]"
        />
      </span>
      <span className="search-hit__body">
        <span className="search-hit__topline">
          <span className="search-hit__kind">{KIND_LABELS[hit.kind]}</span>
          {hit.badges?.map((badge) => (
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
