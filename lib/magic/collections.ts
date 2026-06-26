export interface MagicCollection {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  mood: string;
}

/** Curated resort-calendar entry points — links to filtered Explore / Tonight. */
export const NO_TICKET_COLLECTIONS: MagicCollection[] = [
  {
    id: "tonight-movies",
    title: "Movies under the stars",
    description: "Source-backed evening movie listings from resort calendars.",
    href: "/tonight",
    icon: "🎬",
    mood: "evening",
  },
  {
    id: "resort-calendar",
    title: "Resort calendar",
    description: "Browse source-backed activities from the current resort calendars.",
    href: "/activities",
    icon: "🌴",
    mood: "calendar",
  },
  {
    id: "campfires",
    title: "Campfires & s'mores",
    description: "Browse current campfire listings from resort calendars.",
    href: "/activities?category=campfire",
    icon: "🔥",
    mood: "tonight",
  },
  {
    id: "little-crafters",
    title: "Crafts for little travelers",
    description: "Hands-on resort activities for small hands.",
    href: "/activities?category=arts_crafts",
    icon: "🎨",
    mood: "little_kids",
  },
  {
    id: "pool-break",
    title: "Pool break",
    description: "Browse current poolside recreation listings.",
    href: "/activities?category=poolside",
    icon: "🏊",
    mood: "pool_break",
  },
  {
    id: "games-and-crafts",
    title: "Games and crafts",
    description: "Arcade and craft listings from current source-backed data.",
    href: "/activities?category=arcade",
    icon: "🕹️",
    mood: "easy_break",
  },
];
