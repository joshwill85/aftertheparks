import type { ActivityOccurrence } from "@/lib/types/occurrence";
import { DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT } from "@/lib/seo/transportation";

export interface SeoComparisonPageDefinition {
  slug: string;
  title: string;
  description: string;
  userPromise: string;
  primaryAction: {
    label: string;
    href: string;
  };
  deepLinks: string[];
  decisionFilter: string;
  exclusionRules: string[];
  skipIf: string[];
  transportationNotes: string[];
  freshnessRule: string;
  keywords: string[];
  match: {
    dayparts?: ActivityOccurrence["daypart"][];
    freeOnly?: boolean;
    categories?: string[];
    activitySlugs?: string[];
    resortAreas?: string[];
    resortSlugs?: string[];
    titleIncludes?: string[];
  };
}

export interface RankedComparisonResort {
  resortSlug: string;
  resortName: string;
  area: string;
  tier: string;
  score: number;
  activityCount: number;
  freeCount: number;
  eveningCount: number;
  sampleActivities: string[];
  reason: string;
}

export const SEO_COMPARISON_PAGES: SeoComparisonPageDefinition[] = [
  {
    slug: "best-disney-resorts-for-activities-today",
    title: "Best Disney Resorts for Activities Today",
    description:
      "Compare Walt Disney World resorts by current activity depth, today/tonight options, free activities, and source-backed planning usefulness.",
    userPromise:
      "The best Disney resort for activities today is the one with enough current, nearby, source-backed options to justify staying put or making a simple move.",
    primaryAction: { label: "See today's activities", href: "/today" },
    deepLinks: ["/today", "/tonight", "/resorts", "/activities"],
    decisionFilter:
      "Rank resorts by current activity count, variety, free options, evening options, and how easy the plan is to use today.",
    exclusionRules: [
      "Exclude resorts with no current source-backed activity rows from top-pick status.",
      "Do not promote access-sensitive resort hopping when the guest has no resort stay or confirmed reservation.",
    ],
    skipIf: [
      "You only want activities inside a theme park.",
      "You cannot confirm resort access or transportation for a cross-resort plan.",
    ],
    transportationNotes: [
      "Start with your own resort before crossing property.",
      "Prefer direct or near-direct routes over multi-transfer resort hopping.",
    ],
    freshnessRule: "Rebuild daily because today activity depth changes with schedules and source updates.",
    keywords: ["best resorts for activities today", "Disney resort activities today", "resort activity rankings"],
    match: {},
  },
  {
    slug: "best-disney-resorts-for-a-no-park-day",
    title: "Best Disney Resorts for a No-Park Day",
    description:
      "Rank Walt Disney World resorts for no-park-day planning with current recreation, free options, evening activities, access caveats, and realistic transportation.",
    userPromise:
      "A strong no-park-day resort has enough current recreation, easy downtime, food nearby, and simple evening options that you do not need a park ticket to feel like the day worked.",
    primaryAction: { label: "Browse resort activities", href: "/activities" },
    deepLinks: ["/today", "/tonight", "/activities", "/guides/things-to-do-without-park-ticket"],
    decisionFilter:
      "Rank resorts by current activity depth, free activity mix, evening payoff, and low-friction no-park-day usefulness.",
    exclusionRules: [
      "Exclude in-park attractions, restaurants, tours, and ticketed events unless clearly marked as requiring admission.",
      "Do not use Disney Springs as a free resort-transfer workaround.",
    ],
    skipIf: [
      "Your plan depends on entering Magic Kingdom, EPCOT, Hollywood Studios, or Animal Kingdom.",
      "Your only transportation idea is Disney Springs resort buses or boats without a resort stay or confirmed dining/experience reservation.",
    ],
    transportationNotes: [
      DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT.summary,
      "Favor your own resort, direct resort-area transportation, rideshare, or reservation-backed plans.",
    ],
    freshnessRule:
      "Recheck weekly and whenever Disney access, parking, transportation, or resort recreation policy changes.",
    keywords: ["best Disney resorts no park day", "no park day", "without park ticket"],
    match: {},
  },
  {
    slug: "best-disney-resorts-for-evening-activities",
    title: "Best Disney Resorts for Evening Activities",
    description:
      "Compare Disney resorts for evening activities like movies, campfires, entertainment, crafts, and low-pressure after-park plans.",
    userPromise:
      "The best evening resort plan has current activities after dinner, weather-aware backups, and a simple route back to where you are staying.",
    primaryAction: { label: "See tonight's activities", href: "/tonight" },
    deepLinks: ["/tonight", "/activities?daypart=evening", "/activities/movies-under-the-stars", "/activities/campfire"],
    decisionFilter:
      "Rank resorts by evening activity count, free evening options, movie/campfire relevance, and route simplicity.",
    exclusionRules: [
      "Do not rank outdoor-only plans highly during poor weather without backups.",
      "Do not recommend late multi-transfer routes as easy evening plans.",
    ],
    skipIf: [
      "You need a guaranteed indoor plan.",
      "You cannot verify return transportation after the activity.",
    ],
    transportationNotes: [
      "Evening plans should stay at your resort or on a direct route when possible.",
      "Confirm outdoor movies and campfires because weather and operations can change.",
    ],
    freshnessRule: "Rebuild daily because evening schedules, movies, campfires, and weather-sensitive plans change quickly.",
    keywords: ["best Disney resorts evening activities", "Disney resort activities tonight", "after park resort activities"],
    match: { dayparts: ["evening", "late"] },
  },
  {
    slug: "best-disney-resorts-for-free-activities",
    title: "Best Disney Resorts for Free Activities",
    description:
      "Compare Disney resorts by current free activity depth, evening options, no-ticket usefulness, and access-sensitive caveats.",
    userPromise:
      "The best resort for free activities has source-backed free options that are current, easy to confirm, and realistic for the guest's access situation.",
    primaryAction: { label: "Filter free activities", href: "/activities?free=true" },
    deepLinks: ["/activities?free=true", "/today", "/tonight", "/guides/free-disney-resort-activities"],
    decisionFilter:
      "Rank resorts by current free activity count, evening free options, variety, and access clarity.",
    exclusionRules: [
      "Exclude paid crafts, rentals, and dining experiences from free rankings.",
      "Do not imply free means open to every visitor when resort access, parking, pool gates, or reservations may limit access.",
    ],
    skipIf: [
      "You need a guaranteed no-cost plan open to every non-resort guest.",
      "The resort visit depends on unverified parking or transportation access.",
    ],
    transportationNotes: [
      "Free activity does not guarantee free or unrestricted resort access.",
      "Confirm resort access, parking, and reservation needs before crossing property.",
    ],
    freshnessRule: "Recheck weekly and after calendar, activity-price, resort-access, or transportation changes.",
    keywords: ["best Disney resorts free activities", "free Disney resort activities", "low cost Disney resort day"],
    match: { freeOnly: true },
  },
  {
    slug: "best-disney-resorts-for-toddlers",
    title: "Best Disney Resorts for Toddlers",
    description:
      "Compare Disney resorts for toddler-friendly recreation using short-duration activities, stroller-friendly planning, shade, indoor backups, and simple routes.",
    userPromise:
      "The best toddler resort plan is short, close, flexible, shaded or indoor when possible, and easy to abandon before nap time.",
    primaryAction: { label: "See today's toddler-friendly options", href: "/today" },
    deepLinks: ["/today", "/activities", "/resorts", "/guides/rainy-day-disney-resort-activities"],
    decisionFilter:
      "Rank resorts by current activity depth, short flexible options, calmer settings, weather backups, and low transportation effort.",
    exclusionRules: [
      "Downgrade long outdoor scavenger hunts, late-night plans, and high-walking resort hops.",
      "Do not imply pool or playground access is available to non-resort guests without confirmation.",
    ],
    skipIf: [
      "You need a guaranteed indoor plan with no walking.",
      "Your child cannot comfortably handle schedule changes, heat, or loud recreation settings today.",
    ],
    transportationNotes: [
      "Start at your own resort or a direct-route nearby resort before trying cross-property plans.",
      "Build a nap-safe backup and avoid multi-transfer routes with strollers.",
    ],
    freshnessRule: "Recheck weekly and whenever activity times, age rules, heat, weather, or resort-access rules change.",
    keywords: ["best Disney resorts toddlers", "toddler resort activities", "Disney toddler no park day"],
    match: {},
  },
  {
    slug: "best-disney-resorts-for-teens",
    title: "Best Walt Disney World Resorts for Teens",
    description:
      "Compare Disney resorts for teens using current recreation, arcades, games, food proximity, evening options, and safe independence.",
    userPromise:
      "The best teen resort plan gives older kids enough autonomy, snacks, games, photos, and evening energy without forcing a theme-park ticket.",
    primaryAction: { label: "Browse current activities", href: "/activities" },
    deepLinks: ["/activities", "/tonight", "/activities/arcades", "/resorts"],
    decisionFilter:
      "Rank resorts by current activity variety, evening options, arcade/game relevance, food proximity, and simple resort geography.",
    exclusionRules: [
      "Do not rank toddler-heavy or passive downtime as a teen-first recommendation unless there are stronger backups.",
      "Do not recommend teen independence where resort access, transportation, or return-route clarity is weak.",
    ],
    skipIf: [
      "Your teen only wants in-park thrill rides.",
      "You cannot confirm return transportation or clear meeting points.",
    ],
    transportationNotes: [
      "Favor same-resort, BoardWalk-area, monorail-area, or Skyliner-area plans with clear return paths.",
      "Late plans need a confirmed way back before they become recommendations.",
    ],
    freshnessRule: "Recheck weekly and when arcade, recreation, evening, or transportation details change.",
    keywords: ["best Disney resorts teens", "teen resort activities", "arcades"],
    match: { activitySlugs: ["arcades", "community-halls"], titleIncludes: ["game", "arcade", "teen", "trivia"] },
  },
  {
    slug: "best-disney-resorts-for-adults",
    title: "Best Disney Resorts for Adults",
    description:
      "Compare Disney resorts for adult-friendly recreation, scenic evenings, wellness, low-key activities, lounges nearby, and simple transportation.",
    userPromise:
      "The best adult resort plan usually combines atmosphere, easy dining or lounge access, scenic movement, and one current low-pressure activity.",
    primaryAction: { label: "See tonight's adult-friendly options", href: "/tonight" },
    deepLinks: ["/tonight", "/activities?category=fitness", "/activities/electrical-water-pageant", "/resorts"],
    decisionFilter:
      "Rank resorts by evening atmosphere, current low-pressure activities, wellness options, scenic setting, and simple route quality.",
    exclusionRules: [
      "Separate family-heavy pool programming from quieter adult-friendly options.",
      "Do not over-rank plans that require complex transfers after dinner.",
    ],
    skipIf: [
      "You want nightlife inside a theme park.",
      "You need a reservation-backed dining plan rather than flexible resort recreation.",
    ],
    transportationNotes: [
      "Evening adult plans should stay at your resort or use a direct resort-area route.",
      "Confirm lounges, dining, and return transportation before crossing property.",
    ],
    freshnessRule: "Recheck weekly and before seasonal dining, entertainment, or transportation changes.",
    keywords: ["best Disney resorts adults", "Disney resort date night", "adult resort activities"],
    match: { dayparts: ["evening", "late"], activitySlugs: ["fitness", "electrical-water-pageant"] },
  },
  {
    slug: "best-disney-resorts-for-rainy-days",
    title: "Best Disney Resorts for Rainy Days",
    description:
      "Compare Disney resorts for rainy days using indoor or covered activity depth, weather backups, and low-risk transportation.",
    userPromise:
      "The best rainy-day resort is the one with enough indoor or covered options that you do not have to chase outdoor movies, campfires, pools, or storm-sensitive routes.",
    primaryAction: { label: "Find indoor activities", href: "/activities?weather=indoor" },
    deepLinks: ["/activities?weather=indoor", "/today?weather=indoor", "/tonight?weather=indoor", "/guides/rainy-day-disney-resort-activities"],
    decisionFilter:
      "Rank resorts by indoor and covered options first, then conditional backups, while excluding weather-dependent outdoor plans by default.",
    exclusionRules: [
      "Exclude campfires, outdoor movies, poolside activities, outdoor playgrounds, and outdoor trails from default rainy-day rankings.",
      "Caveat Skyliner-heavy and boat-heavy plans when lightning or severe weather is possible.",
    ],
    skipIf: [
      "You need guaranteed dry transportation between every point.",
      "The only available activities are outdoor or weather-dependent.",
    ],
    transportationNotes: [
      "Prefer same-building, indoor, covered, rideshare, or very short direct routes during storms.",
      "Skyliner and outdoor boat/walk plans need weather caveats before they are recommended.",
    ],
    freshnessRule: "Rebuild daily during rainy seasons and whenever weather-fit or activity schedule data changes.",
    keywords: ["best Disney resorts rainy days", "rainy day Disney resorts", "indoor resort activities"],
    match: { activitySlugs: ["arcades", "crafts", "community-halls"], categories: ["arcade", "arts_crafts", "community_hall"] },
  },
  {
    slug: "best-resorts-for-movies-under-the-stars",
    title: "Best Disney Resorts for Movies Under the Stars",
    description:
      "Compare Disney resorts for outdoor movie nights using current schedules, weather caveats, location clarity, and evening planning value.",
    userPromise:
      "The best resort movie night is current, easy to reach, clearly located, and backed by an indoor or low-effort alternative if weather changes.",
    primaryAction: { label: "See tonight's movies", href: "/activities/movies-under-the-stars" },
    deepLinks: ["/activities/movies-under-the-stars", "/tonight", "/today", "/guides/best-disney-resorts-for-evening-activities"],
    decisionFilter:
      "Rank resorts by current movie-night availability, evening timing, source confidence, weather backup quality, and route simplicity.",
    exclusionRules: [
      "Do not recommend outdoor movies as rainy-day-safe activities.",
      "Do not rank a movie plan without a current time, location, or source caveat.",
    ],
    skipIf: [
      "Rain, lightning, or outdoor conditions make an outside movie unrealistic.",
      "You cannot confirm the current movie time and location.",
    ],
    transportationNotes: [
      "Choose your own resort first; movie nights are not usually worth complex transfers.",
      "Confirm return transportation before leaving a different resort for a late movie.",
    ],
    freshnessRule: "Rebuild daily because movie schedules are date-specific and weather-sensitive.",
    keywords: ["best Disney resort movies", "Movies Under the Stars", "Disney resort movies tonight"],
    match: { activitySlugs: ["movies-under-the-stars"], categories: ["movies_under_stars"], titleIncludes: ["movie"] },
  },
  {
    slug: "best-resorts-for-campfires",
    title: "Best Disney Resorts for Campfires",
    description:
      "Compare Disney resort campfire activities with current schedules, weather caveats, free/paid notes, and same-resort planning advice.",
    userPromise:
      "The best campfire plan is current, close to where you are staying, weather-appropriate, and easy to replace if operations change.",
    primaryAction: { label: "See tonight's campfires", href: "/activities/campfire" },
    deepLinks: ["/activities/campfire", "/tonight", "/guides/best-disney-resorts-for-evening-activities", "/guides/rainy-day-disney-resort-activities"],
    decisionFilter:
      "Rank resorts by current campfire availability, evening timing, free/paid clarity, weather caveats, and same-resort usefulness.",
    exclusionRules: [
      "Do not recommend campfires as rainy-day-safe activities.",
      "Do not imply marshmallows, supplies, or access rules are identical at every resort.",
    ],
    skipIf: [
      "Rain, lightning, or heat makes outdoor recreation a poor fit.",
      "You need an indoor, guaranteed, or reservation-backed evening plan.",
    ],
    transportationNotes: [
      "Campfires are best as same-resort plans rather than cross-property destinations.",
      "Use direct routes only when a campfire is paired with a stronger dining or resort-area plan.",
    ],
    freshnessRule: "Rebuild daily because campfire timing, weather, and availability can shift quickly.",
    keywords: ["best Disney resort campfires", "campfire activities", "marshmallow roasting"],
    match: { activitySlugs: ["campfire"], categories: ["campfire"], titleIncludes: ["campfire", "marshmallow"] },
  },
  {
    slug: "best-resorts-for-check-in-day",
    title: "Best Disney Resorts for Check-In Day",
    description:
      "Compare Disney resorts for check-in day using arrival-window flexibility, short activities, pool/rest options, weather backups, and simple evening plans.",
    userPromise:
      "The best check-in-day resort plan is flexible enough for room timing, tired travelers, weather, and one easy tonight option.",
    primaryAction: { label: "See tonight's activities", href: "/tonight" },
    deepLinks: ["/tonight", "/today", "/guides/first-night-at-disney-resort", "/activities?time=evening"],
    decisionFilter:
      "Rank resorts by flexible same-resort activity depth, short evening options, free backups, and low route complexity.",
    exclusionRules: [
      "Exclude plans that collapse if a flight is delayed or a room is not ready early.",
      "Do not recommend hard-to-reach reservations unless the guide clearly says they must be pre-booked.",
    ],
    skipIf: [
      "You need a guaranteed plan before your resort room is available.",
      "Your arrival time makes all current activities too tight or too late.",
    ],
    transportationNotes: [
      "Stay at your own resort or use one direct nearby route on arrival night.",
      "Avoid Disney Springs or multi-transfer hops unless dining or experience reservations make the trip worth it.",
    ],
    freshnessRule: "Rebuild daily because check-in-day planning depends on today's and tonight's schedule windows.",
    keywords: ["best Disney resorts check-in day", "arrival day Disney resort", "first night resort activities"],
    match: { dayparts: ["afternoon", "evening", "late"] },
  },
  {
    slug: "best-resorts-if-you-do-not-have-a-park-ticket",
    title: "Best Disney Resorts If You Do Not Have a Park Ticket",
    description:
      "Compare Disney resorts for no-ticket planning with current recreation, access-sensitive caveats, parking limits, and transportation-safe next steps.",
    userPromise:
      "The best no-ticket resort plan separates straightforward resort-stay options from access-sensitive visits, parking rules, and transportation limits.",
    primaryAction: { label: "Browse resort activities", href: "/activities" },
    deepLinks: ["/activities", "/activities?free=true", "/today", "/guides/things-to-do-without-park-ticket"],
    decisionFilter:
      "Rank resorts by no-admission activity depth, access clarity, free/low-cost options, and transportation plans that do not depend on restricted workarounds.",
    exclusionRules: [
      "Exclude in-park restaurants, attractions, tours, and events unless clearly marked as requiring admission.",
      "Do not use Disney Springs as a free way to reach resort hotels.",
    ],
    skipIf: [
      "Your plan depends on entering a theme park.",
      "Your route relies on Disney Springs buses or boats without a resort stay or confirmed dining/experience reservation.",
    ],
    transportationNotes: [
      DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT.summary,
      "Use resort-stay plans, confirmed reservations, rideshare, or direct transportation that is currently allowed.",
    ],
    freshnessRule: "Recheck weekly and immediately after Disney parking, access, transportation, or resort recreation policy changes.",
    keywords: ["best Disney resorts without park ticket", "no park ticket", "no admission resort activities"],
    match: {},
  },
  {
    slug: "best-monorail-resort-activities",
    title: "Best Disney Monorail Resort Activities",
    description:
      "Compare Magic Kingdom-area monorail resort activities using current schedules, direct-route logic, evening value, and no-ticket caveats.",
    userPromise:
      "The best monorail resort plan stays on the Magic Kingdom-area resort loop and avoids treating every Disney destination as directly connected.",
    primaryAction: { label: "Browse Magic Kingdom-area resorts", href: "/resorts" },
    deepLinks: ["/resorts", "/today", "/tonight", "/guides/monorail-resort-activities"],
    decisionFilter:
      "Rank Magic Kingdom-area resort activities by current schedule depth, direct monorail usefulness, evening payoff, and access clarity.",
    exclusionRules: [
      "Do not include non-monorail resorts unless connecting transportation is explicit.",
      "Do not imply resort parking or access is guaranteed without a stay, reservation, or current Disney permission.",
    ],
    skipIf: [
      "You want a resort outside the Magic Kingdom-area route family.",
      "You cannot confirm resort access, parking, or the return route.",
    ],
    transportationNotes: [
      "Keep the main plan on the Contemporary, Polynesian, Grand Floridian, TTC, and Magic Kingdom-area loop.",
      "Some monorail destinations require connecting transportation and should be labeled separately.",
    ],
    freshnessRule: "Recheck weekly and after monorail service, resort access, or activity schedule changes.",
    keywords: ["best monorail resort activities", "monorail resort hopping", "Magic Kingdom area resorts"],
    match: { resortAreas: ["magic_kingdom"] },
  },
  {
    slug: "best-skyliner-resort-activities",
    title: "Best Disney Skyliner Resort Activities",
    description:
      "Compare Skyliner-area resort activities using current schedules, weather caveats, EPCOT-area boundaries, and simple route quality.",
    userPromise:
      "The best Skyliner resort plan uses connected resorts and nearby walkable areas while keeping weather and park-admission boundaries clear.",
    primaryAction: { label: "Browse Skyliner-area activities", href: "/activities" },
    deepLinks: ["/activities", "/today", "/tonight", "/guides/skyliner-resort-activities"],
    decisionFilter:
      "Rank EPCOT/Skyliner-area activities by current schedule depth, simple route quality, weather risk, and nearby BoardWalk-area backup value.",
    exclusionRules: [
      "Do not recommend Skyliner-dependent plans as storm-safe.",
      "Do not treat EPCOT International Gateway movement as park access unless admission rules are explicit.",
    ],
    skipIf: [
      "Lightning, high wind, or service interruptions make Skyliner travel unreliable.",
      "You need a plan with no outdoor transfer exposure.",
    ],
    transportationNotes: [
      "Skyliner service can pause for weather, especially lightning.",
      "Prefer connected resorts and nearby BoardWalk-area walks over complex transfers.",
    ],
    freshnessRule: "Recheck whenever weather disruptions, Skyliner service updates, or resort recreation schedules change.",
    keywords: ["best Skyliner resort activities", "Skyliner resort hopping", "EPCOT area resort activities"],
    match: { resortAreas: ["epcot"], resortSlugs: ["pop-century-resort", "art-of-animation-resort", "caribbean-beach-resort", "riviera-resort"] },
  },
  {
    slug: "best-boardwalk-area-resort-activities",
    title: "Best Disney BoardWalk-Area Resort Activities",
    description:
      "Compare BoardWalk-area resort activities using walkable EPCOT-area geography, evening atmosphere, current recreation, and weather-aware caveats.",
    userPromise:
      "The best BoardWalk-area resort plan works because the resorts are close together, but it still needs current schedules, weather awareness, and admission boundaries.",
    primaryAction: { label: "See tonight's BoardWalk-area options", href: "/tonight" },
    deepLinks: ["/tonight", "/today", "/activities", "/resorts"],
    decisionFilter:
      "Rank EPCOT/BoardWalk-area activities by current evening value, walkable route quality, weather exposure, and no-ticket clarity.",
    exclusionRules: [
      "Do not imply EPCOT admission is included or unnecessary for anything inside the park gates.",
      "Do not recommend long outdoor walks as weather-safe options.",
    ],
    skipIf: [
      "Rain, heat, or mobility needs make outdoor walking a poor fit.",
      "Your plan depends on entering EPCOT without admission.",
    ],
    transportationNotes: [
      "BoardWalk, Beach Club, Yacht Club, Swan/Dolphin, and EPCOT International Gateway are close, but weather and admission boundaries still matter.",
      "Use walkable direct paths before adding boat, bus, or rideshare transfers.",
    ],
    freshnessRule: "Recheck weekly and after activity, walking-route, weather, or access changes.",
    keywords: ["best BoardWalk resort activities", "BoardWalk area activities", "EPCOT resort activities"],
    match: { resortAreas: ["epcot"], resortSlugs: ["boardwalk-inn", "boardwalk-villas", "beach-club-resort", "beach-club-villas", "yacht-club-resort"] },
  },
  {
    slug: "best-fort-wilderness-activities-without-a-park-ticket",
    title: "Best Disney Fort Wilderness Activities Without a Park Ticket",
    description:
      "Compare Fort Wilderness no-ticket activities with current recreation, access caveats, evening plans, and realistic transportation.",
    userPromise:
      "Fort Wilderness can be a strong no-ticket resort plan when the activity is current, access is allowed, and the route is realistic for your group.",
    primaryAction: { label: "Browse resort activities", href: "/activities" },
    deepLinks: ["/activities", "/today", "/tonight", "/guides/things-to-do-without-park-ticket"],
    decisionFilter:
      "Rank Fort Wilderness activities by no-admission value, current schedule proof, evening payoff, access clarity, and transportation simplicity.",
    exclusionRules: [
      "Do not imply campground or resort facilities are open to every visitor without confirmation.",
      "Do not include Magic Kingdom plans unless they are clearly marked as requiring park admission.",
    ],
    skipIf: [
      "You cannot confirm access, parking, reservation status, or a practical return route.",
      "Your group cannot handle the internal transportation or walking involved.",
    ],
    transportationNotes: [
      DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT.summary,
      "Fort Wilderness plans need route and internal-transportation validation before they are treated as easy.",
      "Favor reservation-backed, resort-stay, rideshare, or direct-route plans over uncertain resort hopping.",
    ],
    freshnessRule: "Recheck weekly and after Fort Wilderness recreation, access, transportation, or parking changes.",
    keywords: ["Fort Wilderness without park ticket", "Fort Wilderness activities", "no ticket Fort Wilderness"],
    match: { resortSlugs: ["fort-wilderness-resort", "campsites-at-fort-wilderness-resort", "cabins-at-fort-wilderness-resort"] },
  },
];

function matchesPage(
  page: SeoComparisonPageDefinition,
  activity: ActivityOccurrence
): boolean {
  if (page.match.freeOnly && activity.price.state !== "free") return false;
  if (page.match.dayparts && !page.match.dayparts.includes(activity.daypart)) {
    return false;
  }
  if (page.match.categories && !page.match.categories.includes(activity.category)) {
    return false;
  }
  if (page.match.activitySlugs && !page.match.activitySlugs.includes(activity.activitySlug)) {
    return false;
  }
  if (page.match.resortAreas && !page.match.resortAreas.includes(activity.resort.area)) {
    return false;
  }
  if (page.match.resortSlugs && !page.match.resortSlugs.includes(activity.resort.slug)) {
    return false;
  }
  if (
    page.match.titleIncludes &&
    !page.match.titleIncludes.some((needle) =>
      activity.title.toLowerCase().includes(needle.toLowerCase())
    )
  ) {
    return false;
  }
  return true;
}

export function getActivitiesForComparisonPage(
  page: SeoComparisonPageDefinition,
  activities: ActivityOccurrence[]
): ActivityOccurrence[] {
  return activities.filter((item) => matchesPage(page, item));
}

export function rankResortsForComparisonPage(
  page: SeoComparisonPageDefinition,
  activities: ActivityOccurrence[]
): RankedComparisonResort[] {
  const byResort = new Map<string, ActivityOccurrence[]>();

  for (const activity of getActivitiesForComparisonPage(page, activities)) {
    const items = byResort.get(activity.resort.slug) ?? [];
    items.push(activity);
    byResort.set(activity.resort.slug, items);
  }

  return Array.from(byResort, ([resortSlug, items]) => {
    const first = items[0];
    const freeCount = items.filter((item) => item.price.state === "free").length;
    const eveningCount = items.filter((item) =>
      ["evening", "late"].includes(item.daypart)
    ).length;
    const categoryCount = new Set(items.map((item) => item.category)).size;
    const score = items.length * 10 + freeCount * 3 + eveningCount * 2 + categoryCount;

    return {
      resortSlug,
      resortName: first.resort.name,
      area: first.resort.area,
      tier: first.resort.tier,
      score,
      activityCount: items.length,
      freeCount,
      eveningCount,
      sampleActivities: items.slice(0, 4).map((item) => item.title),
      reason: `${first.resort.name} has ${items.length} current matching activities, including ${freeCount} free and ${eveningCount} evening options.`,
    };
  }).sort((a, b) => b.score - a.score || a.resortName.localeCompare(b.resortName));
}

export function getSeoComparisonPageBySlug(
  slug: string
): SeoComparisonPageDefinition | undefined {
  return SEO_COMPARISON_PAGES.find((page) => page.slug === slug);
}

export function validateSeoComparisonPages(
  pages: SeoComparisonPageDefinition[]
): string[] {
  const issues: string[] = [];

  for (const page of pages) {
    for (const field of ["title", "description", "userPromise", "decisionFilter", "freshnessRule"] as const) {
      if (!page[field] || page[field].trim().length < 30) {
        issues.push(`${page.slug}: ${field} is missing or too thin`);
      }
    }
    if (!page.primaryAction.href.startsWith("/")) {
      issues.push(`${page.slug}: primary action must be internal`);
    }
    if (page.deepLinks.length < 3) {
      issues.push(`${page.slug}: needs at least three deep links`);
    }
    if (page.exclusionRules.length < 2) {
      issues.push(`${page.slug}: needs at least two exclusion rules`);
    }
    if (page.skipIf.length < 2) {
      issues.push(`${page.slug}: needs at least two skip-if rules`);
    }
    if (page.transportationNotes.length < 2) {
      issues.push(`${page.slug}: needs at least two transportation notes`);
    }
    if (
      /(no-park|no-ticket|park-ticket)/.test(page.slug) &&
      !page.transportationNotes.join(" ").match(/resort stay|dining\/experience reservation|confirmed/i)
    ) {
      issues.push(`${page.slug}: no-ticket comparison must include Disney Springs reservation caveat`);
    }
  }

  return issues;
}
