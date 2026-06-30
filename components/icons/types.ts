export type IconKey =
  | "poolside"
  | "campfire"
  | "movies_under_stars"
  | "fitness_wellness"
  | "arts_crafts"
  | "signature"
  | "resort_activity"
  | "arcade"
  | "character"
  | "rental"
  | "sports_games"
  | "nighttime_entertainment"
  | "scavenger_hunt"
  | "nature"
  | "music"
  | "other"
  | "today_nav"
  | "tonight_nav"
  | "explore_nav"
  | "plan_nav"
  | "search_activity"
  | "search_resort"
  | "search_guide"
  | "search_category"
  | "search_page"
  | "search_movie"
  | "search_offering"
  | "nearby_resort"
  | "nearby_area"
  | "worth_travel"
  | "arrow_right"
  | "arrow_left"
  | "chevron_down"
  | "check_mark"
  | "close";

export type IconTone =
  | "sunshine"
  | "lagoon"
  | "starlight"
  | "palm"
  | "coral"
  | "neutral";

export interface IconRegistryEntry {
  label: string;
  tone: IconTone;
}
