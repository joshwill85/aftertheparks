export type HiddenResortMagicId =
  | "hero_lantern_alignment"
  | "quick_finder_bubble_trail"
  | "filter_chip_constellation"
  | "calendar_triple_dot_upgrade"
  | "resort_card_tilework"
  | "category_stamp_imperfection"
  | "plan_passport_completion_reveal"
  | "starlight_firefly_pause"
  | "search_suggestion_echo"
  | "footer_paper_grain_secret";

export interface HiddenResortMagicDetail {
  id: HiddenResortMagicId;
  publicName: string;
  route: string;
  trigger: string;
  triggered: boolean;
  componentPath: string;
  cssClass: string;
  reducedMotion: string;
  brandSafetyNote: string;
  decorative: true;
  ariaHidden: true;
}

export const HIDDEN_RESORT_MAGIC_DETAILS: HiddenResortMagicDetail[] = [
  {
    id: "hero_lantern_alignment",
    publicName: "Hero lantern alignment",
    route: "/",
    trigger: "Starlight hero atmosphere or hover/focus near the hero image.",
    triggered: true,
    componentPath: "components/home/HomeHero.tsx",
    cssClass: "hrm-hero-lanterns",
    reducedMotion: "Static faint light cluster; no drift or shimmer.",
    brandSafetyNote: "Built from lantern bokeh dots inside the existing resort-photo treatment.",
    decorative: true,
    ariaHidden: true,
  },
  {
    id: "quick_finder_bubble_trail",
    publicName: "Quick Finder bubble trail",
    route: "/",
    trigger: "Quick Finder submit button hover/focus/press.",
    triggered: true,
    componentPath: "components/home/QuickFinder.tsx",
    cssClass: "hrm-quick-bubbles",
    reducedMotion: "Bubbles remain as a quiet static edge glint.",
    brandSafetyNote: "Uses lagoon bubbles attached to the existing button edge.",
    decorative: true,
    ariaHidden: true,
  },
  {
    id: "filter_chip_constellation",
    publicName: "Filter chip constellation",
    route: "/activities",
    trigger: "Exactly three active filters.",
    triggered: true,
    componentPath: "components/explore/BrowseFilterShell.tsx",
    cssClass: "hrm-filter-constellation",
    reducedMotion: "Dotted connector stays static and low contrast.",
    brandSafetyNote: "Uses active filter chip accents as decorative state texture.",
    decorative: true,
    ariaHidden: true,
  },
  {
    id: "calendar_triple_dot_upgrade",
    publicName: "Calendar triple-dot upgrade",
    route: "/calendar",
    trigger: "A day has exactly three starlight activities.",
    triggered: true,
    componentPath: "components/atlas/CalendarClient.tsx",
    cssClass: "hrm-calendar-triple",
    reducedMotion: "Always static; no animation required.",
    brandSafetyNote: "Reuses calendar density dots as schedule texture.",
    decorative: true,
    ariaHidden: true,
  },
  {
    id: "resort_card_tilework",
    publicName: "Resort card tilework",
    route: "/resorts",
    trigger: "Visible on resort card hover/focus and high-density cards.",
    triggered: true,
    componentPath: "components/resort/ResortCard.tsx",
    cssClass: "hrm-resort-tilework",
    reducedMotion: "Tilework remains still; hover only changes opacity.",
    brandSafetyNote: "Reads as architecture or textile texture inside the resort card banner.",
    decorative: true,
    ariaHidden: true,
  },
  {
    id: "category_stamp_imperfection",
    publicName: "Category stamp imperfection",
    route: "/activities/[slug]",
    trigger: "Hover/focus around activity category stamp surfaces.",
    triggered: true,
    componentPath: "components/activity/CategoryIcon.tsx",
    cssClass: "hrm-category-ink",
    reducedMotion: "Ink dots stay in place with no shimmer.",
    brandSafetyNote: "Tiny misregistration dots match the paper passport metaphor.",
    decorative: true,
    ariaHidden: true,
  },
  {
    id: "plan_passport_completion_reveal",
    publicName: "Plan passport completion reveal",
    route: "/plan",
    trigger: "Plan has three or more different category stamps.",
    triggered: true,
    componentPath: "components/plan/ResortPassport.tsx",
    cssClass: "hrm-passport-completion",
    reducedMotion: "Soft outline is visible statically without landing animation.",
    brandSafetyNote: "Uses the guest's earned stamps and paper grain.",
    decorative: true,
    ariaHidden: true,
  },
  {
    id: "starlight_firefly_pause",
    publicName: "Starlight firefly pause",
    route: "/tonight",
    trigger: "Nightfall Timeline is present.",
    triggered: true,
    componentPath: "components/tonight/NightfallTimeline.tsx",
    cssClass: "hrm-firefly-pause",
    reducedMotion: "Fireflies render as tiny stationary points on the timeline rail.",
    brandSafetyNote: "Atmospheric fireflies belong to the evening timeline context.",
    decorative: true,
    ariaHidden: true,
  },
  {
    id: "search_suggestion_echo",
    publicName: "Search suggestion echo",
    route: "/search",
    trigger: "Search query includes campfire, movie, magic, or starlight.",
    triggered: true,
    componentPath: "components/magic/StarlightSearchEffect.tsx",
    cssClass: "hrm-search-echo",
    reducedMotion: "Sparkles appear without twinkling.",
    brandSafetyNote: "Uses search underline sparkles connected to the user's own query.",
    decorative: true,
    ariaHidden: true,
  },
  {
    id: "footer_paper_grain_secret",
    publicName: "Footer paper grain secret",
    route: "global footer",
    trigger: "Long-scroll footer/disclaimer area.",
    triggered: false,
    componentPath: "components/layout/SiteFooter.tsx",
    cssClass: "hrm-footer-grain",
    reducedMotion: "Always static.",
    brandSafetyNote: "Microscopic paper-grain watermark near the independent-guide disclaimer.",
    decorative: true,
    ariaHidden: true,
  },
];

export function getHiddenResortMagicDetail(id: HiddenResortMagicId) {
  return HIDDEN_RESORT_MAGIC_DETAILS.find((detail) => detail.id === id);
}
