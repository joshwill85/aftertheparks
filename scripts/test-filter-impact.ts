import {
  buildActiveFilterChips,
  buildFilterImpact,
  buildNoResultsRecovery,
  filterableItemMatchesFilters,
  type FilterableItem,
} from "@/lib/explore/filterImpact";
import {
  filterMovieNights,
  parseBrowseParams,
  preserveBrowseParams,
} from "@/lib/explore/browseParams";
import type { ActivityFilters } from "@/lib/types/occurrence";
import { readFileSync } from "node:fs";

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
    free: false,
    reservation: false,
    title: "Pop Century Arcade",
    weatherFit: "indoor",
  },
];

const collisionItems = [
  {
    id: "activity-arcade-poly",
    sourceType: "activity",
    activitySlug: "arcade",
    resortSlug: "poly",
    resortArea: "magic_kingdom",
    category: "arcades",
    daypart: "afternoon",
    free: false,
    reservation: false,
    title: "Arcade",
    weatherFit: "indoor",
  },
  {
    id: "offering-arcade-poly",
    sourceType: "officialOffering",
    activitySlug: "arcade",
    resortSlug: "poly",
    resortArea: "magic_kingdom",
    category: "arcades",
    free: false,
    reservation: true,
    title: "Arcade",
    weatherFit: "indoor",
  },
] satisfies FilterableItem[];

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
const parsedMultiResort = parseBrowseParams(
  new URLSearchParams("resort=poly,akl&weather=covered")
);
assert(
  parsedMultiResort.resort === "poly,akl",
  `Multi-resort browse param should parse, got ${parsedMultiResort.resort}`
);
const preservedMultiResort = preserveBrowseParams(
  new URLSearchParams("resort=poly,akl&weather=covered&ignored=yes")
);
assert(
  preservedMultiResort.toString() === "resort=poly%2Cakl&weather=covered",
  `Multi-resort browse param should be preserved, got ${preservedMultiResort.toString()}`
);
const parsedTicket = parseBrowseParams(
  new URLSearchParams("ticket_required=false&resort=poly")
) as ActivityFilters & { ticketRequired?: boolean };
assert(
  parsedTicket.ticketRequired === undefined,
  "Park-ticket browse params should be ignored because every site listing is outside the parks"
);
const preservedTicket = preserveBrowseParams(
  new URLSearchParams("ticket_required=false&resort=poly&ignored=yes")
);
assert(
  preservedTicket.toString() === "resort=poly",
  `Park-ticket browse params should not be preserved, got ${preservedTicket.toString()}`
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
assert(
  parsedFirstNight.duration === undefined,
  "Planning pace browse params should be ignored"
);
const preservedFirstNight = preserveBrowseParams(
  new URLSearchParams("duration=short&time=evening&ignored=yes")
);
assert(
  preservedFirstNight.toString() === "time=evening",
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
  resort: "poly,akl",
  category: "campfire",
  free: true,
  q: "smores",
};

const chips = buildActiveFilterChips(filters, resorts, "/activities");
assert(chips.length === 5, `Expected 5 chips, got ${chips.length}`);
assert(chips.some((chip) => chip.label === "Polynesian Village"), "Missing resort chip");
assert(chips.some((chip) => chip.label === "Animal Kingdom Lodge"), "Missing second resort chip");
assert(chips.some((chip) => chip.label === "Campfire"), "Missing category chip");
assert(chips.some((chip) => chip.label === "Free only"), "Missing free chip");
assert(chips.some((chip) => chip.label === "Search: smores"), "Missing query chip");
assert(
  chips.find((chip) => chip.label === "Polynesian Village")?.removeHref ===
    "/activities?resort=akl&category=campfire&free=true&q=smores",
  "One resort chip should remove only that resort"
);
assert(
  chips.find((chip) => chip.id === "category")?.removeHref ===
    "/activities?resort=poly%2Cakl&free=true&q=smores",
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

const collisionImpact = buildFilterImpact(collisionItems, {}, resorts);
assert(
  collisionImpact.total === 1,
  `Unfiltered official offerings should be hidden behind matching activities, got ${collisionImpact.total}`
);
assert(
  collisionImpact.practical.reservation === 1,
  `Reservation counts should include the official offering when the matching activity does not satisfy the filter, got ${collisionImpact.practical.reservation}`
);

const multiResortImpact = buildFilterImpact(
  items,
  { resort: "poly,akl", weather: "covered" },
  resorts
);
assert(
  multiResortImpact.total === 1,
  `Expected one covered result across selected resorts, got ${multiResortImpact.total}`
);
assert(
  multiResortImpact.resorts.some((option) => option.value === "poly" && option.active),
  "First selected resort should stay active"
);
assert(
  multiResortImpact.resorts.some((option) => option.value === "akl" && option.active),
  "Second selected resort should stay active"
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
assert(
  filterableItemMatchesFilters(
    {
      id: "offering-indoor",
      resortSlug: "poly",
      resortArea: "magic_kingdom",
      category: "resort_activity",
      free: true,
      reservation: false,
      weatherFit: "indoor",
      title: "Community Hall",
    },
    { weather: "indoor" }
  ),
  "Shared filter predicate should allow official offerings to match indoor weather"
);
assert(
  filterableItemMatchesFilters(
    {
      id: "offering-indoor",
      resortSlug: "poly",
      resortArea: "magic_kingdom",
      category: "resort_activity",
      free: true,
      reservation: false,
      weatherFit: "indoor",
      title: "Community Hall",
    },
    { preset: "rain_backup" }
  ),
  "Shared filter predicate should allow official offerings to match rain-backup presets"
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

const legacyTicketFilters = {
  resort: "poly",
  ticketRequired: false,
} as ActivityFilters & { ticketRequired: boolean };
const noTicketChips = buildActiveFilterChips(legacyTicketFilters, resorts, "/activities");
assert(
  noTicketChips.every((chip) => chip.id !== "ticket_required"),
  "Park-ticket filters should not create active chips"
);
const noTicketImpact = buildFilterImpact(items, legacyTicketFilters, resorts);
assert(
  noTicketImpact.total === 4,
  `Park-ticket filter state should not narrow outside-park listings, got ${noTicketImpact.total}`
);
assert(
  !("noParkTicket" in noTicketImpact.practical),
  "Practical filter counts should not include a no-park-ticket option"
);
const noTicketRecovery = buildNoResultsRecovery(
  { resort: "poly", category: "fireworks", ticketRequired: false } as ActivityFilters & {
    ticketRequired: boolean;
  },
  resorts,
  "/activities"
);
assert(
  noTicketRecovery.every((action) => !/ticket/i.test(action.label)),
  "No-results recovery should not mention ticket filters"
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
  firstNightChips.every((chip) => chip.id !== "duration" && chip.label !== "Short activity"),
  "Planning pace filters should not create active chips"
);
const firstNightImpact = buildFilterImpact(items, firstNightFilters, resorts);
assert(
  firstNightImpact.total === 1,
  `Expected one evening result, got ${firstNightImpact.total}`
);
assert(
  !("duration" in firstNightImpact),
  "Filter impact should not expose planning pace options"
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

const filteredMovies = filterMovieNights(
  [
    {
      id: "movie-poly",
      resortSlug: "poly",
      resortName: "Polynesian Village",
      movieTitle: "Moana",
      displayTitle: "Moana",
      showTime: "8:00 PM",
      location: "Lawn",
      dayOfWeek: "Sunday",
    },
    {
      id: "movie-akl",
      resortSlug: "akl",
      resortName: "Animal Kingdom Lodge",
      movieTitle: "The Lion King",
      displayTitle: "The Lion King",
      showTime: "8:00 PM",
      location: "Pool",
      dayOfWeek: "Sunday",
    },
    {
      id: "movie-pop",
      resortSlug: "pop",
      resortName: "Pop Century",
      movieTitle: "Cars",
      displayTitle: "Cars",
      showTime: "8:00 PM",
      location: "Pool",
      dayOfWeek: "Sunday",
    },
  ],
  { resort: "poly,akl" }
);
assert(
  filteredMovies.map((movie) => movie.id).join(",") === "movie-poly,movie-akl",
  "Movie filters should support multiple selected resorts"
);

const rainBackupMovies = filterMovieNights(
  [
    {
      id: "movie-poly",
      resortSlug: "poly",
      resortName: "Polynesian Village",
      movieTitle: "Moana",
      displayTitle: "Moana",
      showTime: "8:00 PM",
      location: "Lawn",
      dayOfWeek: "Sunday",
      startDateTime: "2026-06-29T00:00:00.000Z",
      isTonight: true,
    },
  ],
  { preset: "rain_backup" }
);
assert(
  rainBackupMovies.length === 0,
  "Rain-backup preset should not include outdoor movie nights"
);

const indoorMovies = filterMovieNights(
  [
    {
      id: "movie-poly",
      resortSlug: "poly",
      resortName: "Polynesian Village",
      movieTitle: "Moana",
      displayTitle: "Moana",
      showTime: "8:00 PM",
      location: "Lawn",
      dayOfWeek: "Sunday",
      startDateTime: "2026-06-29T00:00:00.000Z",
      isTonight: true,
    },
  ],
  { weather: "indoor" }
);
assert(
  indoorMovies.length === 0,
  "Indoor weather filter should not include outdoor movie nights"
);

const reservationMovies = filterMovieNights(
  [
    {
      id: "movie-poly",
      resortSlug: "poly",
      resortName: "Polynesian Village",
      movieTitle: "Moana",
      displayTitle: "Moana",
      showTime: "8:00 PM",
      location: "Lawn",
      dayOfWeek: "Sunday",
      startDateTime: "2026-06-29T00:00:00.000Z",
      isTonight: true,
    },
  ],
  { reservation: true }
);
assert(
  reservationMovies.length === 0,
  "Reservation filter should not include no-reservation movie nights"
);

const afternoonMovies = filterMovieNights(
  [
    {
      id: "movie-poly",
      resortSlug: "poly",
      resortName: "Polynesian Village",
      movieTitle: "Moana",
      displayTitle: "Moana",
      showTime: "8:00 PM",
      location: "Lawn",
      dayOfWeek: "Sunday",
      startDateTime: "2026-06-29T00:00:00.000Z",
      isTonight: true,
    },
  ],
  { daypart: "afternoon" }
);
assert(
  afternoonMovies.length === 0,
  "Daypart filter should only include movie nights in the matching movie daypart"
);

const afterSevenMovies = filterMovieNights(
  [
    {
      id: "movie-poly",
      resortSlug: "poly",
      resortName: "Polynesian Village",
      movieTitle: "Moana",
      displayTitle: "Moana",
      showTime: "8:00 PM",
      location: "Lawn",
      dayOfWeek: "Sunday",
      startDateTime: "2026-06-29T00:00:00.000Z",
      isTonight: true,
    },
  ],
  { preset: "after_7_pm" }
);
assert(
  afterSevenMovies.length === 1,
  "After-7 preset should include dated movies starting after 7 PM Orlando time"
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

const filterRailSource = readFileSync("components/explore/FilterRail.tsx", "utf8");
const browseFilterShellSource = readFileSync("components/explore/BrowseFilterShell.tsx", "utf8");
const filterSheetSource = readFileSync("components/explore/FilterSheet.tsx", "utf8");
const resortSectionIndex = filterRailSource.indexOf("Resort");
const firstNightSectionIndex = filterRailSource.indexOf("First night");
const timeSectionIndex = filterRailSource.indexOf("Time of day");
assert(resortSectionIndex > -1, "Filter pane should include a resort section");
assert(
  resortSectionIndex < firstNightSectionIndex && resortSectionIndex < timeSectionIndex,
  "Resort filter should be the first filter section in the shared filter pane"
);
assert(
  browseFilterShellSource.includes('const hideFreeOnly = variant === "tonight";'),
  "Tonight browse shell should hide free-only filters because tonight is not a free-only browse surface"
);
assert(
  browseFilterShellSource.includes("hideFreeOnly={hideFreeOnly}") &&
    filterSheetSource.includes("hideFreeOnly={hideFreeOnly}"),
  "Tonight free-filter hiding should apply to both desktop rail and mobile sheet"
);
assert(
  filterRailSource.includes("if (!hideFreeOnly)") &&
    filterRailSource.includes('key: "free"'),
  "Shared filter fields should suppress the Free only option when hideFreeOnly is enabled"
);

console.log("Filter impact coverage passed.");
