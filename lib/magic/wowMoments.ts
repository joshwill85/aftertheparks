export type WowMomentId =
  | "living_resort_diorama_hero"
  | "starlight_firefly_route_map"
  | "filter_alchemy_board"
  | "folded_map_daybook_transition"
  | "calendar_time_weather_aurora";

export interface WowMoment {
  id: WowMomentId;
  publicName: string;
  route: string;
  componentPath: string;
  cssClass: string;
  figmaHandoff: string;
  reducedMotion: string;
  acceptance: string[];
  noLayoutShift: true;
  primaryActionSafe: true;
}

export const WOW_MOMENTS: WowMoment[] = [
  {
    id: "living_resort_diorama_hero",
    publicName: "Living Resort Diorama Hero",
    route: "/",
    componentPath: "components/home/HomeHero.tsx",
    cssClass: "wow-living-resort-diorama-hero",
    figmaHandoff:
      "Prototype sunshine, golden-hour, and starlight modes in Figma Motion with separate shimmer, lantern, and paper-grain layers before shader upgrades.",
    reducedMotion:
      "Hero keeps static layered atmosphere, sharper contrast, and no looping shimmer.",
    acceptance: [
      "Hero image remains first-viewport dominant on mobile, tablet, and desktop.",
      "Layer motion uses opacity or transform only and never shifts layout.",
      "Daypart atmosphere is visible without obscuring headline or Quick Finder.",
    ],
    noLayoutShift: true,
    primaryActionSafe: true,
  },
  {
    id: "starlight_firefly_route_map",
    publicName: "Starlight Firefly Route Map",
    route: "/tonight",
    componentPath: "components/tonight/NightfallTimeline.tsx",
    cssClass: "wow-starlight-firefly-route-map",
    figmaHandoff:
      "Use Figma Motion to tune the glowing route stroke, selected stop, conflict, and low-confidence states against real timeline data.",
    reducedMotion:
      "Route path renders as a static luminous guide with stationary stop glints.",
    acceptance: [
      "SVG path sits behind timeline stops and does not intercept clicks.",
      "Mobile falls back to a vertical route guide.",
      "Timeline aria-label remains the source of truth for screen readers.",
    ],
    noLayoutShift: true,
    primaryActionSafe: true,
  },
  {
    id: "filter_alchemy_board",
    publicName: "Filter Alchemy Board",
    route: "/activities",
    componentPath: "components/explore/BrowseFilterShell.tsx",
    cssClass: "wow-filter-alchemy-board",
    figmaHandoff:
      "Prototype orbiting token states, no-results blockers, and swap suggestions in Figma variables before generating reusable token art.",
    reducedMotion:
      "Tokens become a still radial board that preserves cause-and-effect labels.",
    acceptance: [
      "Board mirrors URL-driven active filters and result count.",
      "No-results state identifies the blocking combination without blaming the guest.",
      "Board wraps cleanly without clipping long filter labels.",
    ],
    noLayoutShift: true,
    primaryActionSafe: true,
  },
  {
    id: "folded_map_daybook_transition",
    publicName: "Folded Map To Daybook Transition",
    route: "global save action",
    componentPath: "components/activity/SaveButton.tsx",
    cssClass: "wow-folded-map-daybook-transition",
    figmaHandoff:
      "Use Figma Motion 3D transforms to tune the fold, stamp landing, and daybook tuck timing before production perspective values are adjusted.",
    reducedMotion:
      "Save action shows a crisp static stamp and maintains the normal saved state.",
    acceptance: [
      "Triggered only by direct save actions.",
      "Does not delay the item entering My Plan.",
      "Uses CSS perspective only inside the save button wrapper.",
    ],
    noLayoutShift: true,
    primaryActionSafe: true,
  },
  {
    id: "calendar_time_weather_aurora",
    publicName: "Calendar Time-Weather Aurora",
    route: "/calendar",
    componentPath: "components/atlas/CalendarClient.tsx",
    cssClass: "wow-calendar-time-weather-aurora",
    figmaHandoff:
      "Prototype daypart density modes as Figma shader fills and variables, then keep production readable through CSS gradients first.",
    reducedMotion:
      "Aurora bands stay static while preserving density, contrast, and labels.",
    acceptance: [
      "Each day cell has a useful aria-label summary.",
      "Selected day expands into a readable story panel below the grid.",
      "Bands stay legible at the smallest supported mobile width.",
    ],
    noLayoutShift: true,
    primaryActionSafe: true,
  },
];

export function getWowMoment(id: WowMomentId) {
  return WOW_MOMENTS.find((moment) => moment.id === id);
}
