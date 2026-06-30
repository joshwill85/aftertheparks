import Link from "next/link";
import { IconGlyph } from "@/components/icons/IconGlyph";
import { SEARCH_KIND_ICON_KEYS } from "@/components/icons/iconRegistry";
import type { SearchHit } from "@/lib/search/types";
import { cn } from "@/lib/utils";

const KIND_LABELS: Record<SearchHit["kind"], string> = {
  activity: "Activity",
  resort: "Resort",
  category: "Category",
  page: "Page",
  movie: "Movie",
  offering: "Official offering",
};

interface SearchHitRowProps {
  hit: SearchHit;
  compact?: boolean;
  onNavigate?: () => void;
  id?: string;
  role?: string;
  tabIndex?: number;
  ariaSelected?: boolean;
  onMouseDown?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function SearchHitRow({
  hit,
  compact = false,
  onNavigate,
  id,
  role,
  tabIndex,
  ariaSelected,
  onMouseDown,
}: SearchHitRowProps) {
  const firstHighlight = hit.highlights
    ? Object.values(hit.highlights)
        .flat()
        .find(Boolean)
        ?.replace(/<\/?mark>/g, "")
    : undefined;

  return (
    <Link
      id={id}
      href={hit.href}
      onClick={onNavigate}
      onMouseDown={onMouseDown}
      role={role}
      tabIndex={tabIndex}
      aria-selected={ariaSelected}
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
        {!compact && firstHighlight && (
          <span className="search-hit__description">{firstHighlight}</span>
        )}
      </span>
    </Link>
  );
}
