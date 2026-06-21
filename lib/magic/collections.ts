export interface MagicCollection {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  mood: string;
}

/** Curated no-ticket entry points — links to filtered Explore / Tonight. */
export const NO_TICKET_COLLECTIONS: MagicCollection[] = [
  {
    id: "tonight-movies",
    title: "Movies under the stars",
    description: "Blanket, popcorn, and a classic film on the lawn.",
    href: "/tonight",
    icon: "🎬",
    mood: "evening",
  },
  {
    id: "free-today",
    title: "Free today",
    description: "Resort fun included with your stay — no park ticket.",
    href: "/activities?free=true",
    icon: "🌴",
    mood: "free",
  },
  {
    id: "campfires",
    title: "Campfires & s'mores",
    description: "Evening fire pits with songs and stories.",
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
    description: "Slides, splash zones, and lazy-afternoon floats.",
    href: "/activities?category=poolside",
    icon: "🏊",
    mood: "pool_break",
  },
  {
    id: "rainy-day",
    title: "Rainy day rescue",
    description: "Arcade games and indoor crafts when skies open up.",
    href: "/activities?category=arcade",
    icon: "🕹️",
    mood: "rainy",
  },
];
