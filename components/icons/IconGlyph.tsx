import type { ReactNode } from "react";
import { ICON_REGISTRY, type IconKey } from "@/components/icons/iconRegistry";
import { cn } from "@/lib/utils";

interface IconGlyphProps {
  iconKey: IconKey;
  className?: string;
  title?: string;
  decorative?: boolean;
}

const toneClass: Record<string, string> = {
  sunshine: "text-[var(--sun-gold)]",
  lagoon: "text-[var(--lagoon)]",
  starlight: "text-[var(--night-soft)]",
  palm: "text-[var(--palm)]",
  coral: "text-[var(--sun-coral)]",
  neutral: "text-[var(--brand-ink)]",
};

function BaseSvg({
  iconKey,
  className,
  title,
  decorative = true,
  children,
}: IconGlyphProps & { children: ReactNode }) {
  const meta = ICON_REGISTRY[iconKey];
  const label = title ?? meta.label;

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        "resort-glyph h-[1.15em] w-[1.15em] shrink-0 overflow-visible",
        toneClass[meta.tone],
        className
      )}
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      focusable="false"
    >
      {!decorative && <title>{label}</title>}
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.85"
      >
        {children}
      </g>
    </svg>
  );
}

export function IconGlyph(props: IconGlyphProps) {
  const { iconKey } = props;

  switch (iconKey) {
    case "poolside":
      return (
        <BaseSvg {...props}>
          <path d="M3.5 15.5c2 1.4 3.9 1.4 5.9 0s3.9-1.4 5.9 0 3.5 1.4 5.2.2" />
          <path d="M4.5 19c1.8 1 3.5 1 5.3 0s3.6-1 5.4 0 3.3 1 4.8.1" />
          <circle cx="16.5" cy="7.5" r="3.2" />
          <path d="M14.2 5.3 18.7 9.8M18.8 5.4 14.3 9.7" />
        </BaseSvg>
      );
    case "campfire":
      return (
        <BaseSvg {...props}>
          <path d="M12 14.5c-2.1-1.8-1.1-4.1.7-6.4.4 2 2.5 2.7 2.5 5a3.2 3.2 0 0 1-6.4.1c0-1.2.6-2.4 1.4-3.3.1 1.8.8 3.2 1.8 4.6Z" />
          <path d="m5 19 14-4M5 15l14 4" />
          <path d="M16.8 8.1c.9-.9 1.7-1.2 2.7-1" />
          <circle cx="20.2" cy="6.9" r="1.1" />
        </BaseSvg>
      );
    case "movies_under_stars":
    case "search_movie":
      return (
        <BaseSvg {...props}>
          <rect x="4" y="8" width="16" height="9.5" rx="1.5" />
          <path d="M8 20h8M12 17.5V20" />
          <path d="m7 5 .5 1 .9.2-.7.7.2 1-1-.5-.9.5.2-1-.7-.7.9-.2L7 5ZM17.5 3.5l.4.8.8.1-.6.6.2.8-.8-.4-.8.4.2-.8-.6-.6.8-.1.4-.8Z" />
        </BaseSvg>
      );
    case "fitness_wellness":
      return (
        <BaseSvg {...props}>
          <path d="M4 17c5.5.7 9.7-1.7 12.7-7.1" />
          <path d="M13 9.5c2.1-3.4 4.7-4.2 7-3.7-.3 3.1-2.1 5.4-5.9 5.7" />
          <path d="M6.5 13.2c.4-3.3 2.7-5.6 5.7-6" />
        </BaseSvg>
      );
    case "arts_crafts":
      return (
        <BaseSvg {...props}>
          <path d="M5.3 15.5c2.9-4.7 6.5-7.8 11.1-9.4 1.2-.4 2.3.7 1.8 1.9-1.8 4.5-5 8.1-9.8 10.7" />
          <path d="M5.3 15.5c-1 1.3-.9 2.7.1 3.4 1.3.9 3.1.1 3-1.8" />
          <circle cx="16.6" cy="6.9" r=".6" fill="currentColor" stroke="none" />
          <path d="M14 16.5c1.3-.4 2.7.1 3.5 1.2M16 14.3c1.2-.2 2.4.2 3.1 1" />
        </BaseSvg>
      );
    case "signature":
    case "worth_travel":
    case "search_activity":
      return (
        <BaseSvg {...props}>
          <path d="M12 3.5 14.4 9l5.6 2.2-5.6 2.4L12 20l-2.4-6.4L4 11.2 9.6 9 12 3.5Z" />
          <path d="M19.5 4.5v2M18.5 5.5h2M5 18v1.5M4.25 18.75h1.5" />
        </BaseSvg>
      );
    case "resort_activity":
    case "search_resort":
    case "nearby_resort":
      return (
        <BaseSvg {...props}>
          <path d="M7 10.5 12 6l5 4.5v7.2a1.3 1.3 0 0 1-1.3 1.3H8.3A1.3 1.3 0 0 1 7 17.7v-7.2Z" />
          <path d="M10.2 19v-4.6h3.6V19M5 11.8 12 5l7 6.8" />
          <path d="M17.5 5.5c1.2-.9 2.3-.9 3.4 0-1.2 1.1-2.4 1.2-3.4 0Z" />
        </BaseSvg>
      );
    case "arcade":
      return (
        <BaseSvg {...props}>
          <rect x="4" y="9" width="16" height="9" rx="3" />
          <path d="M8 13h3M9.5 11.5v3M15.5 13.2h.1M18 14.8h.1" />
          <path d="M12 9c0-2.2 1.2-3.3 3.4-3.3" />
          <circle cx="16.4" cy="5.7" r="1.1" />
        </BaseSvg>
      );
    case "rental":
      return (
        <BaseSvg {...props}>
          <circle cx="7" cy="16" r="3" />
          <circle cx="17" cy="16" r="3" />
          <path d="M7 16h4l2-5h-3M13 11l4 5M10 8h3M9 11l-2 5" />
        </BaseSvg>
      );
    case "sports_games":
      return (
        <BaseSvg {...props}>
          <path d="M4 17c4.6-7 10.1-9.4 16-7" />
          <path d="M7 15.2c2.2 1.8 5.2 2.5 8.7 2.1" />
          <circle cx="9" cy="10" r="3.2" />
          <path d="M6.2 8.8c1.9.6 3.8.6 5.7 0M7.3 12.3c1.2-1.8 2-3.6 2.3-5.3" />
        </BaseSvg>
      );
    case "nighttime_entertainment":
    case "tonight_nav":
      return (
        <BaseSvg {...props}>
          <path d="M15.5 4.4a7.2 7.2 0 1 0 4.1 11.8A8.5 8.5 0 0 1 15.5 4.4Z" />
          <path d="M6.5 18.5c1.7 1 3.4 1 5.1 0 1.7-1 3.4-1 5.1 0" />
        </BaseSvg>
      );
    case "scavenger_hunt":
    case "explore_nav":
      return (
        <BaseSvg {...props}>
          <path d="M5 5.5 10 4l4 1.5 5-1.5v14.5L14 20l-4-1.5L5 20V5.5Z" />
          <path d="M10 4v14.5M14 5.5V20" />
          <path d="M7.5 8.5c2.1 0 2.5 2.4 4.5 2.4s2.6-2.4 4.5-2.4" />
          <path d="m16 14 2 2M18 14l-2 2" />
        </BaseSvg>
      );
    case "nature":
      return (
        <BaseSvg {...props}>
          <path d="M5 18c5.9-.7 10.2-4.3 13-10.8-4.9-.8-9.4 1.9-11 6.1" />
          <path d="M8.5 14.5c2.4-.7 4.2-1.9 5.5-3.7" />
          <circle cx="18.8" cy="16.2" r=".8" fill="currentColor" stroke="none" />
        </BaseSvg>
      );
    case "music":
      return (
        <BaseSvg {...props}>
          <path d="M9 17.5a2.3 2.3 0 1 1-1.8-2.2V7l9-2v9.8" />
          <path d="M16.2 14.8a2.3 2.3 0 1 1-1.8-2.2" />
          <path d="M9 9.5 16.4 8" />
        </BaseSvg>
      );
    case "today_nav":
      return (
        <BaseSvg {...props}>
          <circle cx="12" cy="12" r="3.7" />
          <path d="M12 3.2v2M12 18.8v2M4.2 12h2M17.8 12h2M6.5 6.5l1.4 1.4M16.1 16.1l1.4 1.4M17.5 6.5l-1.4 1.4M7.9 16.1l-1.4 1.4" />
        </BaseSvg>
      );
    case "plan_nav":
      return (
        <BaseSvg {...props}>
          <path d="M7 4.5h9.5A1.5 1.5 0 0 1 18 6v13.5l-3-1.4-3 1.4-3-1.4-3 1.4V6A1.5 1.5 0 0 1 7.5 4.5Z" />
          <path d="M9 8.5h5.5M9 12h6M9 15.5h3.5" />
        </BaseSvg>
      );
    case "search_guide":
      return (
        <BaseSvg {...props}>
          <path d="M6 5.5h8.5L18 9v9.5H6V5.5Z" />
          <path d="M14.5 5.5V9H18M8.5 12h6M8.5 15h4" />
        </BaseSvg>
      );
    case "search_category":
      return (
        <BaseSvg {...props}>
          <path d="M5 7.5V16l7 4 7-4V7.5l-7-4-7 4Z" />
          <path d="M8.5 9.2h7M8.5 12h7M8.5 14.8h4.5" />
        </BaseSvg>
      );
    case "search_page":
      return (
        <BaseSvg {...props}>
          <path d="M8 6h10v10" />
          <path d="M18 6 6 18" />
        </BaseSvg>
      );
    case "search_offering":
      return (
        <BaseSvg {...props}>
          <path d="M12 3.8 18.5 7v5.2c0 4.1-2.6 6.7-6.5 8-3.9-1.3-6.5-3.9-6.5-8V7L12 3.8Z" />
          <path d="m8.8 12.2 2.1 2.1 4.3-4.8" />
        </BaseSvg>
      );
    case "nearby_area":
      return (
        <BaseSvg {...props}>
          <path d="M5 17c3.5-5.2 8.2-7.9 14-8" />
          <path d="M6 13.5c2.1.8 4.2.7 6.3-.2M12.3 13.3c1.8 1 3.6 1.1 5.4.3" />
          <circle cx="6" cy="17" r="1.5" />
          <circle cx="19" cy="9" r="1.5" />
        </BaseSvg>
      );
    case "arrow_right":
      return (
        <BaseSvg {...props}>
          <path d="M5 12h13" />
          <path d="m13 6 6 6-6 6" />
        </BaseSvg>
      );
    case "arrow_left":
      return (
        <BaseSvg {...props}>
          <path d="M19 12H6" />
          <path d="m11 6-6 6 6 6" />
        </BaseSvg>
      );
    case "chevron_down":
      return (
        <BaseSvg {...props}>
          <path d="m6 9 6 6 6-6" />
        </BaseSvg>
      );
    case "check_mark":
      return (
        <BaseSvg {...props}>
          <path d="m5.5 12.5 4.1 4L18.5 7" />
          <path d="M19.5 4.8v1.7M18.65 5.65h1.7" />
        </BaseSvg>
      );
    case "close":
      return (
        <BaseSvg {...props}>
          <path d="m7 7 10 10M17 7 7 17" />
        </BaseSvg>
      );
    case "other":
    default:
      return (
        <BaseSvg {...props}>
          <path d="M6 5.5h12v13H6z" />
          <path d="M8.5 9h7M8.5 12h5M8.5 15h6.5" />
          <path d="M15.5 5.5c0 1.4 1.1 2.5 2.5 2.5" />
        </BaseSvg>
      );
  }
}
