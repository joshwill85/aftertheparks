import type { IconKey } from "@/components/icons/iconRegistry";

export interface MagicCollection {
  id: string;
  title: string;
  description: string;
  href: string;
  iconKey: IconKey;
  mood: string;
}

/** Resort-calendar entry points — links to filtered Explore / Tonight. */
export const NO_TICKET_COLLECTIONS: MagicCollection[] = [
  {
    id: "tonight-movies",
    title: "Movies under the stars",
    description: "Evening movie listings from current resort calendars.",
    href: "/tonight",
    iconKey: "movies_under_stars",
    mood: "evening",
  },
  {
    id: "resort-calendar",
    title: "Resort calendar",
    description: "Browse activities from the current resort calendars.",
    href: "/activities",
    iconKey: "resort_activity",
    mood: "calendar",
  },
  {
    id: "campfires",
    title: "Campfires & s'mores",
    description: "Browse current campfire listings from resort calendars.",
    href: "/activities?category=campfire",
    iconKey: "campfire",
    mood: "tonight",
  },
  {
    id: "little-crafters",
    title: "Crafts for little travelers",
    description: "Hands-on resort activities for small hands.",
    href: "/activities?category=arts_crafts",
    iconKey: "arts_crafts",
    mood: "little_kids",
  },
  {
    id: "pool-break",
    title: "Pool break",
    description: "Browse current poolside recreation listings.",
    href: "/activities?category=poolside",
    iconKey: "poolside",
    mood: "pool_break",
  },
  {
    id: "games-and-crafts",
    title: "Games and crafts",
    description: "Arcade and craft listings from current resort calendars.",
    href: "/activities?category=arcade",
    iconKey: "arcade",
    mood: "easy_break",
  },
];
