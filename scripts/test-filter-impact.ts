import {
  buildActiveFilterChips,
  buildFilterImpact,
  buildNoResultsRecovery,
  type FilterableItem,
} from "@/lib/explore/filterImpact";
import { parseBrowseParams, preserveBrowseParams } from "@/lib/explore/browseParams";
import type { ActivityFilters } from "@/lib/types/occurrence";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const resorts = [
  { slug: "poly", name: "Polynesian Village" },
  { slug: "akl", name: "Animal Kingdom Lodge" },
  { slug: "saratoga", name: "Saratoga Springs" },
  { slug: "pop", name: "Pop Century" },
];

const items: FilterableItem[] = [
  {
    id: "campfire-poly",
    resortSlug: "poly",
    resortArea: "magic_kingdom",
    category: "campfire",
    daypart: "evening",
    durationMinutes: 30,
    free: true,
    reservation: false,
    title: "Campfire",
    weatherFit: "outdoor_weather_dependent",
  },
  {
    id: "movie-poly",
    resortSlug: "poly",
    resortArea: "magic_kingdom",
    category: "movies_under_stars",
    daypart: "late",
    durationMinutes: 90,
    free: true,
    reservation: false,
    title: "Movie",
    weatherFit: "outdoor_weather_dependent",
  },
  {
    id: "craft-akl",
    resortSlug: "akl",
    resortArea: "animal_kingdom",
    category: "arts_crafts",
    daypart: "afternoon",
    durationMinutes: 25,
    free: false,
    reservation: true,
    title: "Craft",
    weatherFit: "covered",
  },
  {
    id: "arcade-poly",
    resortSlug: "poly",
    resortArea: "magic_kingdom",
    category: "arcades",
    daypart: "afternoon",
    durationMinutes: 20,
    free: false,
    reservation: false,
    title: "Arcade",
    weatherFit: "indoor",
  },
  {
    id: "park-fireworks",
    resortSlug: "poly",
    resortArea: "magic_kingdom",
    category: "fireworks",
    daypart: "late",
    durationMinutes: 90,
    free: false,
    reservation: false,
    title: "Park Fireworks Dessert Party",
    weatherFit: "outdoor_weather_dependent",
    parkTicketRequired: true,
  } as FilterableItem & { parkTicketRequired: boolean },
  {
    id: "saratoga-lobby",
    resortSlug: "saratoga",
    resortArea: "disney_springs",
    category: "resort_exploration",
    daypart: "afternoon",
    durationMinutes: 20,
    free: true,
    reservation: false,
    title: "Saratoga Springs Lobby Walk",
    weatherFit: "indoor",
  },
  {
    id: "pop-arcade",
    resortSlug: "pop",
    resortArea: "skyliner",
    category: "arcades",
    daypart: "afternoon",
    durationMinutes: 20,
    free: false,
    reservation: false,
    title: "Pop Century Arcade",
    weatherFit: "indoor",
  },
];

const parsedWeather = parseBrowseParams(
  new URLSearchParams("weather=indoor&resort=poly")
);
assert(parsedWeather.weather === "indoor", "Weather browse param should parse");
const preservedWeather = preserveBrowseParams(
  new URLSearchParams("weather=covered&resort=poly&ignored=yes")
);
assert(
  preservedWeather.toString() === "resort=poly&weather=covered",
  `Weather browse param should be preserved, got ${preservedWeather.toString()}`
);
const parsedTicket = parseBrowseParams(
  new URLSearchParams("ticket_required=false&resort=poly")
) as ActivityFilters & { ticketRequired?: boolean };
assert(parsedTicket.ticketRequired === false, "No-ticket browse param should parse");
const preservedTicket = preserveBrowseParams(
  new URLSearchParams("ticket_required=false&resort=poly&ignored=yes")
);
assert(
  preservedTicket.toString() === "resort=poly&ticket_required=false",
  `No-ticket browse param should be preserved, got ${preservedTicket.toString()}`
);
const parsedRoute = parseBrowseParams(
  new URLSearchParams("transport=monorail&area=disney-springs")
) as ActivityFilters & { transport?: string; area?: string };
assert(parsedRoute.transport === "monorail", "Transport browse param should parse");
assert(parsedRoute.area === "disney-springs", "Area browse param should parse");
const preservedRoute = preserveBrowseParams(
  new URLSearchParams("transport=skyliner&area=disney-springs&ignored=yes")
);
assert(
  preservedRoute.toString() === "transport=skyliner&area=disney-springs",
  `Transport and area browse params should be preserved, got ${preservedRoute.toString()}`
);
const parsedFirstNight = parseBrowseParams(
  new URLSearchParams("duration=short&time=evening")
) as ActivityFilters & { duration?: string };
assert(parsedFirstNight.daypart === "evening", "Time browse alias should parse as daypart");
assert(parsedFirstNight.duration === "short", "Short-duration browse param should parse");
const preservedFirstNight = preserveBrowseParams(
  new URLSearchParams("duration=short&time=evening&ignored=yes")
);
assert(
  preservedFirstNight.toString() === "time=evening&duration=short",
  `First-night browse params should be preserved, got ${preservedFirstNight.toString()}`
);
const parsedNearMyResort = parseBrowseParams(
  new URLSearchParams("near=my-resort")
) as ActivityFilters & { near?: string };
assert(
  parsedNearMyResort.near === undefined,
  "Near-my-resort should not parse without a resort anchor"
);
const parsedNearMyResortWithResort = parseBrowseParams(
  new URLSearchParams("near=my-resort&resort=poly")
) as ActivityFilters & { near?: string };
assert(
  parsedNearMyResortWithResort.near === "my-resort",
  "Near-my-resort browse param should parse when a resort anchor exists"
);
const preservedNearMyResort = preserveBrowseParams(
  new URLSearchParams("near=my-resort&ignored=yes")
);
assert(
  preservedNearMyResort.toString() === "",
  `Near-my-resort browse param should be preserved, got ${preservedNearMyResort.toString()}`
);
const preservedNearMyResortWithResort = preserveBrowseParams(
  new URLSearchParams("near=my-resort&resort=poly&ignored=yes")
);
assert(
  preservedNearMyResortWithResort.toString() === "resort=poly&near=my-resort",
  `Near-my-resort with resort should be preserved, got ${preservedNearMyResortWithResort.toString()}`
);

const filters: ActivityFilters = {
  resort: "poly",
  category: "campfire",
  free: true,
  q: "smores",
};

const chips = buildActiveFilterChips(filters, resorts, "/activities");
assert(chips.length === 4, `Expected 4 chips, got ${chips.length}`);
assert(chips.some((chip) => chip.label === "Polynesian Village"), "Missing resort chip");
assert(chips.some((chip) => chip.label === "Campfire"), "Missing category chip");
assert(chips.some((chip) => chip.label === "Free only"), "Missing free chip");
assert(chips.some((chip) => chip.label === "Search: smores"), "Missing query chip");
assert(
  chips.find((chip) => chip.id === "category")?.removeHref ===
    "/activities?resort=poly&free=true&q=smores",
  "Category chip should remove only category"
);

const impact = buildFilterImpact(items, { resort: "poly" }, resorts);
assert(impact.total === 4, `Expected current total 4, got ${impact.total}`);
assert(
  impact.categories.find((option) => option.value === "campfire")?.count === 1,
  "Campfire count should be predictive under current resort"
);
assert(
  impact.dayparts.find((option) => option.value === "late")?.count === 2,
  "Late count should include matching movie and ticketed event"
);
assert(
  impact.practical.free === 2,
  `Expected two free results under current resort, got ${impact.practical.free}`
);

const filteredImpact = buildFilterImpact(
  items,
  { resort: "poly", category: "campfire" },
  resorts
);
assert(
  filteredImpact.categories.every((option) => option.count > 0 || option.active),
  "Category filter values should hide zero-count inactive options"
);
assert(
  filteredImpact.categories.some((option) => option.value === "campfire"),
  "Active category should stay visible"
);
assert(
  filteredImpact.categories.every((option) => option.value !== "arts_crafts"),
  "Inactive zero-count category should not be selectable"
);
assert(
  filteredImpact.resorts.every((option) => option.count > 0 || option.active),
  "Resort filter values should hide zero-count inactive options"
);
assert(
  filteredImpact.resorts.every((option) => option.value !== "akl"),
  "Inactive zero-count resort should not be selectable"
);

const weatherFilters: ActivityFilters = {
  resort: "poly",
  weather: "indoor",
};
const weatherChips = buildActiveFilterChips(weatherFilters, resorts, "/activities");
assert(
  weatherChips.some((chip) => chip.label === "Indoor"),
  "Weather filter should create an active chip"
);
assert(
  weatherChips.find((chip) => chip.id === "weather")?.removeHref ===
    "/activities?resort=poly",
  "Weather chip should remove only weather"
);
const weatherImpact = buildFilterImpact(items, weatherFilters, resorts);
assert(weatherImpact.total === 1, `Expected one indoor result, got ${weatherImpact.total}`);
assert(
  weatherImpact.weather.some((option) => option.value === "indoor" && option.active),
  "Indoor weather option should stay active"
);
assert(
  weatherImpact.weather.every((option) => option.value !== "covered"),
  "Inactive zero-count covered weather option should not be selectable"
);
const weatherRecovery = buildNoResultsRecovery(
  { resort: "poly", weather: "covered" },
  resorts,
  "/activities"
);
assert(
  weatherRecovery.some((action) => action.label === "Remove Covered"),
  "No-results recovery should offer to remove weather"
);

const noTicketFilters = {
  resort: "poly",
  ticketRequired: false,
} as ActivityFilters & { ticketRequired: boolean };
const noTicketChips = buildActiveFilterChips(noTicketFilters, resorts, "/activities");
assert(
  noTicketChips.some((chip) => chip.label === "No park ticket"),
  "No-ticket filter should create an active chip"
);
assert(
  noTicketChips.find((chip) => chip.id === "ticket_required")?.removeHref ===
    "/activities?resort=poly",
  "No-ticket chip should remove only ticket requirement"
);
const noTicketImpact = buildFilterImpact(items, noTicketFilters, resorts);
assert(
  noTicketImpact.total === 3,
  `Expected three no-ticket results under current resort, got ${noTicketImpact.total}`
);
assert(
  noTicketImpact.practical.noParkTicket === 3,
  `Expected three no-ticket practical results, got ${noTicketImpact.practical.noParkTicket}`
);
const noTicketRecovery = buildNoResultsRecovery(
  { resort: "poly", category: "fireworks", ticketRequired: false } as ActivityFilters & {
    ticketRequired: boolean;
  },
  resorts,
  "/activities"
);
assert(
  noTicketRecovery.some((action) => action.label === "Show ticketed options"),
  "No-results recovery should offer to remove no-ticket filter"
);

const routeFilters = {
  transport: "monorail",
  area: "disney-springs",
} as ActivityFilters & { transport: string; area: string };
const routeChips = buildActiveFilterChips(routeFilters, resorts, "/activities");
assert(
  routeChips.some((chip) => chip.label === "Monorail"),
  "Transport filter should create an active chip"
);
assert(
  routeChips.some((chip) => chip.label === "Disney Springs area"),
  "Area filter should create an active chip"
);
assert(
  routeChips.find((chip) => chip.id === "transport")?.removeHref ===
    "/activities?area=disney-springs",
  "Transport chip should remove only transport"
);
assert(
  routeChips.find((chip) => chip.id === "area")?.removeHref ===
    "/activities?transport=monorail",
  "Area chip should remove only area"
);
const monorailImpact = buildFilterImpact(
  items,
  { transport: "monorail" } as ActivityFilters & { transport: string },
  resorts
);
assert(
  monorailImpact.total === 4,
  `Expected four monorail-area results, got ${monorailImpact.total}`
);
assert(
  monorailImpact.transport.some((option) => option.value === "monorail" && option.active),
  "Monorail transport option should stay active"
);
const disneySpringsImpact = buildFilterImpact(
  items,
  { area: "disney-springs" } as ActivityFilters & { area: string },
  resorts
);
assert(
  disneySpringsImpact.total === 1,
  `Expected one Disney Springs-area result, got ${disneySpringsImpact.total}`
);
assert(
  disneySpringsImpact.areas.some(
    (option) => option.value === "disney-springs" && option.active
  ),
  "Disney Springs area option should stay active"
);

const firstNightFilters = {
  daypart: "evening",
  duration: "short",
} as ActivityFilters & { duration: string };
const firstNightChips = buildActiveFilterChips(firstNightFilters, resorts, "/activities");
assert(
  firstNightChips.some((chip) => chip.label === "Evening"),
  "Time alias should still create an evening chip"
);
assert(
  firstNightChips.some((chip) => chip.label === "Short activity"),
  "Short-duration filter should create an active chip"
);
assert(
  firstNightChips.find((chip) => chip.id === "duration")?.removeHref ===
    "/activities?daypart=evening",
  "Duration chip should remove only duration"
);
const firstNightImpact = buildFilterImpact(items, firstNightFilters, resorts);
assert(
  firstNightImpact.total === 1,
  `Expected one short evening result, got ${firstNightImpact.total}`
);
assert(
  firstNightImpact.duration.some((option) => option.value === "short" && option.active),
  "Short duration option should stay active"
);

const nearMyResortFilters = {
  near: "my-resort",
} as ActivityFilters & { near: string };
const nearMyResortChips = buildActiveFilterChips(
  nearMyResortFilters,
  resorts,
  "/tonight"
);
assert(
  !nearMyResortChips.some((chip) => chip.label === "Near my resort"),
  "Near-my-resort should not create an active chip without a resort anchor"
);
assert(
  nearMyResortChips.find((chip) => chip.id === "near") === undefined,
  "Near-my-resort chip should be absent without a resort anchor"
);
const nearWithoutResortImpact = buildFilterImpact(items, nearMyResortFilters, resorts);
assert(
  nearWithoutResortImpact.total === items.length,
  "Near-my-resort without a selected resort should not filter results"
);
const nearMyResortWithResortChips = buildActiveFilterChips(
  { resort: "poly", near: "my-resort" } as ActivityFilters & { near: string },
  resorts,
  "/tonight"
);
assert(
  nearMyResortWithResortChips.some((chip) => chip.label === "Near my resort"),
  "Near-my-resort filter should create an active chip when a resort anchor exists"
);
const nearPolyImpact = buildFilterImpact(
  items,
  { resort: "poly", near: "my-resort" } as ActivityFilters & { near: string },
  resorts
);
assert(
  nearPolyImpact.total === 4,
  `Expected four same-area results near Polynesian, got ${nearPolyImpact.total}`
);

const activeZeroImpact = buildFilterImpact(
  items,
  { resort: "akl", category: "campfire" },
  resorts
);
assert(
  activeZeroImpact.resorts.some((option) => option.value === "akl" && option.active),
  "Active zero-count resort should stay visible so it can be cleared"
);
assert(
  activeZeroImpact.categories.some(
    (option) => option.value === "campfire" && option.active
  ),
  "Active zero-count category should stay visible so it can be cleared"
);

const recovery = buildNoResultsRecovery(filters, resorts, "/activities");
assert(recovery.length >= 3, "No-results recovery should provide at least 3 actions");
assert(recovery[0].href.includes("category") === false, "First recovery should remove category");
assert(recovery.some((action) => action.label === "Clear all filters"), "Missing clear action");

console.log("Filter impact coverage passed.");
