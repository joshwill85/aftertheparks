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
          <rect x="4.5" y="8" width="14" height="8.2" rx="1.3" />
          <path d="M8 19.3h7M11.5 16.2v3.1" />
          <path d="M5.3 19.4c2.4-.8 4.7-.8 7.1 0s4.5.8 6.3.1" />
          <path d="M17.2 16.2l2.4 1.4M19.6 14.8v2.8" />
          <path d="M7.1 4.8l.5 1 .9.2-.7.7.2 1-1-.5-1 .5.2-1-.7-.7.9-.2.5-1ZM17 3.8l.4.8.8.1-.6.6.2.8-.8-.4-.8.4.2-.8-.6-.6.8-.1.4-.8Z" />
        </BaseSvg>
      );
    case "fitness_wellness":
      return (
        <BaseSvg {...props}>
          <path d="M5 17.2h14" />
          <path d="M7.2 14.6c2.8-.9 6.8-.9 9.6 0" />
          <path d="M8.4 12.8c.7-2.4 2.1-3.9 3.6-4.9 1.5 1 2.9 2.5 3.6 4.9" />
          <path d="M12 7.9c-.5 2.4-1.8 4.1-4 5.1M12 7.9c.5 2.4 1.8 4.1 4 5.1" />
          <path d="M8.7 6.1c.9-1 2-1.5 3.3-1.5s2.4.5 3.3 1.5" />
          <path d="M18 5.4l.4.8.8.1-.6.6.2.8-.8-.4-.8.4.2-.8-.6-.6.8-.1.4-.8Z" />
        </BaseSvg>
      );
    case "arts_crafts":
      return (
        <BaseSvg {...props}>
          <path d="M6 7.1h8.6l3.3 3.3v7.4H6z" />
          <path d="M14.6 7.1v3.3h3.3" />
          <path d="M10.6 10.4l.7 1.4 1.5.2-1.1 1 .3 1.5-1.4-.7-1.4.7.3-1.5-1.1-1 1.5-.2.7-1.4Z" />
          <path d="M7.5 17.4c3.1-4 6.5-6.9 10.1-8.5" />
          <path d="M7.5 17.4c-.7 1-.6 2 .2 2.5 1 .6 2.1 0 2.1-1.3" />
          <path d="M18.6 5.3l.35.75.75.1-.55.55.15.75-.7-.35-.7.35.15-.75-.55-.55.75-.1.35-.75Z" />
        </BaseSvg>
      );
    case "signature":
    case "worth_travel":
    case "search_activity":
      return (
        <BaseSvg {...props}>
          <path d="M12 4.5c2.4 0 4.3 1.8 4.3 4.1 0 3.2-4.3 7.2-4.3 7.2s-4.3-4-4.3-7.2c0-2.3 1.9-4.1 4.3-4.1Z" />
          <path d="M12 7.2l.8 1.7 1.8.3-1.3 1.2.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.2 1.8-.3.8-1.7Z" />
          <path d="M5 18.4c2.5-1 4.8-1 7 0s4.5 1 7 0" />
          <path d="M18.5 4.4v1.8M17.6 5.3h1.8M5.7 12.8l.4.8.8.1-.6.6.2.8-.8-.4-.8.4.2-.8-.6-.6.8-.1.4-.8Z" />
        </BaseSvg>
      );
    case "resort_activity":
    case "search_resort":
    case "nearby_resort":
      return (
        <BaseSvg {...props}>
          <path d="M6.2 11.2 12 6.4l5.8 4.8v6.9H6.2z" />
          <path d="M9 18.1v-4.2h6v4.2" />
          <path d="M4.8 12.4 12 6l7.2 6.4" />
          <path d="M8.4 8.8c1.2-2 3.2-3 5.8-2.9" />
          <path d="M15.8 5.6v5" />
          <path d="M15.8 6.1h3l-.9 1.1.9 1.1h-3" />
          <path d="M10.2 14.2h3.6M10.2 16h2.2" />
          <path d="M19.1 13.7l.4.8.8.1-.6.6.2.8-.8-.4-.8.4.2-.8-.6-.6.8-.1.4-.8Z" />
        </BaseSvg>
      );
    case "arcade":
      return (
        <BaseSvg {...props}>
          <path d="M7 4.8h10l1.1 4.1v10.4H5.9V8.9L7 4.8Z" />
          <path d="M8.5 8.4h7v4.3h-7z" />
          <path d="M10.7 15.8v-1.4" />
          <circle cx="10.7" cy="14" r=".55" fill="currentColor" stroke="none" />
          <path d="M14.5 15.2h.1M16.2 16.4h.1" />
          <path d="M9.1 6.5h5.8" />
          <path d="M17.9 7.2l.4.8.8.1-.6.6.2.8-.8-.4-.8.4.2-.8-.6-.6.8-.1.4-.8Z" />
          <path d="M6.8 19.3c2.8-.8 7.8-.8 10.6 0" />
        </BaseSvg>
      );
    case "character":
      return (
        <BaseSvg {...props}>
          <path d="M5.2 15.8c2.4-1.1 4.8-1.1 7.2 0 2.1-1 4.2-1.1 6.4-.3" />
          <path d="M6.2 10.4v6.1c1.9-.7 3.8-.6 5.8.2v-6.1c-2-.8-3.9-.9-5.8-.2Z" />
          <path d="M12 10.6v6.1c1.9-.8 3.8-.9 5.8-.2v-4.2" />
          <path d="M16.7 8.4c.8-.9 1.6-.8 2.2-.1.7.7.7 1.8 0 2.5l-1.9 1.9-1.9-1.9c-.7-.7-.7-1.8 0-2.5.6-.7 1.5-.8 1.6.1Z" />
          <path d="M19.3 4.7v1.7M18.45 5.55h1.7M7.2 5.2l.5 1 .9.2-.7.7.2 1-1-.5-1 .5.2-1-.7-.7.9-.2.5-1Z" />
        </BaseSvg>
      );
    case "rental":
      return (
        <BaseSvg {...props}>
          <path d="M6 7.2h7.7L18 11.5v6.8H6z" />
          <path d="M13.7 7.2v4.3H18" />
          <circle cx="9" cy="10.2" r=".8" />
          <path d="M8.2 15.7c1.2-.8 2.4-.8 3.6 0s2.4.8 3.6 0" />
          <path d="M5 19.2c1.7.8 3.4.8 5.1 0s3.4-.8 5.1 0 3.1.8 4.4.1" />
          <path d="M17.2 5.1l.4.8.8.1-.6.6.2.8-.8-.4-.8.4.2-.8-.6-.6.8-.1.4-.8Z" />
          <path d="M9 10.2c2-2.3 4-3.8 6-4.5" />
        </BaseSvg>
      );
    case "sports_games":
      return (
        <BaseSvg {...props}>
          <path d="M5 17.4c4.6-2 9.3-2 14 0" />
          <path d="M7 14.5h10" />
          <path d="M15 6v8.5" />
          <path d="M15 6h3.4l-1 1.3 1 1.3H15" />
          <circle cx="8.5" cy="11" r="2.1" />
          <path d="M6.7 9.9c1.2.5 2.4.5 3.6 0M7.4 12.8c.8-1.1 1.3-2.3 1.5-3.7" />
          <path d="M10.8 7.8c1-.7 2.1-1.1 3.2-1.2" />
          <path d="M18.3 11.2l.4.8.8.1-.6.6.2.8-.8-.4-.8.4.2-.8-.6-.6.8-.1.4-.8Z" />
        </BaseSvg>
      );
    case "nighttime_entertainment":
    case "tonight_nav":
      return (
        <BaseSvg {...props}>
          <path d="M11.8 4.6a5.1 5.1 0 1 0 3 8.4 6.1 6.1 0 0 1-3-8.4Z" />
          <path d="M5.2 17.2c1.7 1 3.4 1 5.1 0s3.4-1 5.1 0 3.1 1 4.4.1" />
          <path d="M7 20c1.3.5 2.7.5 4 0s2.7-.5 4 0" />
          <path d="M17.4 5.1v2.1M16.35 6.15h2.1M15.9 4.6l3 3M18.9 4.6l-3 3" />
          <path d="M18.8 10.4l.35.75.75.1-.55.55.15.75-.7-.35-.7.35.15-.75-.55-.55.75-.1.35-.75Z" />
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
          <path d="M5 17.5c2.2-1.6 4.8-2.1 7.8-1.3 2.4.6 4.5.4 6.2-.7" />
          <path d="M6.2 13.9c3.9-.4 6.8-2.8 8.8-7.1-3.7-.5-6.8 1.2-8.4 4.2" />
          <path d="M8.9 12.2c1.7-.5 3-1.4 4-2.8" />
          <path d="M15.6 10.2c.7-1.2 1.6-1.5 2.5-.8-.1 1.1-.8 1.8-2.1 2" />
          <path d="M15.6 10.2c-.9-1-1.8-1.1-2.6-.2.2 1.1 1 1.7 2.3 1.7" />
          <circle cx="18.4" cy="6.4" r=".65" fill="currentColor" stroke="none" />
          <path d="M4.7 19.5c1.3.6 2.5.6 3.8 0" />
        </BaseSvg>
      );
    case "music":
      return (
        <BaseSvg {...props}>
          <path d="M8.8 16.8a2.2 2.2 0 1 1-1.8-2.1V7.3l8.8-2v8.8" />
          <path d="M16 14.1a2.2 2.2 0 1 1-1.8-2.1" />
          <path d="M7 9.8l8.8-2" />
          <path d="M5.2 19c2.3-.9 4.5-.9 6.8 0s4.5.9 6.8 0" />
          <path d="M18.2 5.3l.4.8.8.1-.6.6.2.8-.8-.4-.8.4.2-.8-.6-.6.8-.1.4-.8Z" />
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
          <path d="M6 5.5h9.6L18 7.9v10.6H6z" />
          <path d="M15.6 5.5v2.4H18" />
          <path d="M8.4 15.4c1.4-2 2.9-2.8 4.4-2.4 1.6.4 2.8-.2 3.6-1.8" />
          <path d="M8.5 9.2h3.7M8.5 18.5h7" />
          <circle cx="9" cy="15" r=".55" fill="currentColor" stroke="none" />
          <path d="M17.4 10.7l.5 1 .9.2-.7.7.2 1-1-.5-1 .5.2-1-.7-.7.9-.2.5-1Z" />
          <path d="M5.2 18.8c1.2.7 2.4.8 3.6.2" />
        </BaseSvg>
      );
  }
}
