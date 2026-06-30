import { DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT } from "@/lib/seo/transportation";

export interface SeoGuideDefinition {
  slug: string;
  title: string;
  description: string;
  userPromise: string;
  userIntent: string;
  afterTheParksAdvantage: string;
  liveDataDependencies: string[];
  researchSources: string[];
  exclusionRules: string[];
  deepLinks: string[];
  decisionFilter: string;
  freshnessRule: string;
  killRule: string;
  primaryAction: {
    label: string;
    href: string;
  };
  sections: string[];
  caveats: string[];
  keywords: string[];
  tier: 1 | 2 | 3;
}

type SeoGuideDraft = Omit<
  SeoGuideDefinition,
  | "userIntent"
  | "afterTheParksAdvantage"
  | "liveDataDependencies"
  | "researchSources"
  | "exclusionRules"
  | "deepLinks"
  | "decisionFilter"
  | "freshnessRule"
  | "killRule"
>;

type SeoGuideQualification = Pick<
  SeoGuideDefinition,
  | "userIntent"
  | "afterTheParksAdvantage"
  | "liveDataDependencies"
  | "researchSources"
  | "exclusionRules"
  | "deepLinks"
  | "decisionFilter"
  | "freshnessRule"
  | "killRule"
>;

export interface SeoActivityDefinition {
  slug: string;
  title: string;
  description: string;
  bestFor: string;
  currentCheckHref: string;
  caveats: string[];
}

const GUIDE_RESEARCH_SOURCES = [
  "Official Walt Disney World resort recreation, transportation, parking, and dining pages",
  "After the Parks live activity, resort, source, and schedule data",
  "Current resort activity calendars and source freshness audits",
  "Competitor coverage gaps across Disney planning and resort guide sites",
  "Community sentiment used only for expectations and mistakes, not official policy",
];

const HIGH_VALUE_GUIDE_DRAFTS: SeoGuideDraft[] = [
  {
    slug: "disney-world-non-park-day",
    title: "What to Do at Disney World on a Non-Park Day",
    description:
      "Build a lower-pressure Disney World day with resort recreation, pool time, dining, transportation-safe hopping, and evening activities.",
    userPromise:
      "The best Disney World non-park day usually combines a slow morning, resort recreation, pool time, a meal or direct-route resort hop, and one easy evening activity.",
    primaryAction: { label: "See today's resort activities", href: "/today" },
    sections: [
      "Best overall no-park-day plan",
      "Free and low-cost options",
      "Best resorts for a rest day",
      "Evening activities and backups",
      "Transportation and access caveats",
    ],
    caveats: [
      "Do not plan around activities that require park admission.",
      "Confirm resort activity times before leaving your resort.",
    ],
    keywords: ["non park day", "rest day", "resort activities", "without park ticket"],
    tier: 1,
  },
  {
    slug: "free-disney-resort-activities",
    title: "Free Disney Resort Activities",
    description:
      "Find free and low-cost Walt Disney World resort activities, with current schedule links and official-source caveats.",
    userPromise:
      "Free Disney resort activities are strongest when they are current, nearby, and easy to confirm, such as select crafts, campfires, movies, scavenger hunts, and resort entertainment.",
    primaryAction: { label: "Filter free activities", href: "/activities?free=true" },
    sections: [
      "Free activities today",
      "Free evening activities",
      "Best resorts for free recreation",
      "No-ticket and access-sensitive caveats",
      "What to confirm before going",
    ],
    caveats: [
      "Free does not always mean open to every visitor.",
      "Some resort access and parking situations may require a stay, reservation, or confirmation.",
    ],
    keywords: ["free", "low cost", "without park ticket", "resort recreation"],
    tier: 1,
  },
  {
    slug: "disney-resort-hopping",
    title: "Disney Resort Hopping Guide",
    description:
      "Plan resort hopping around direct or simple transportation routes instead of clunky multi-transfer chains.",
    userPromise:
      "Good Disney resort hopping should use direct or near-direct routes, clear access rules, realistic travel time, and activities worth the transfer.",
    primaryAction: { label: "Browse resorts", href: "/resorts" },
    sections: [
      "Best direct-route resort hops",
      "Monorail resort loop",
      "Skyliner and BoardWalk area",
      "Disney Springs-area caveats",
      "Mistakes to avoid",
    ],
    caveats: [
      "Do not treat Disney Springs as a free resort-transfer hub.",
      "Avoid bus-to-park-to-bus routes unless the plan is explicitly advanced.",
    ],
    keywords: ["resort hopping", "monorail", "skyliner", "transportation"],
    tier: 1,
  },
  {
    slug: "rainy-day-disney-resort-activities",
    title: "Rainy Day Disney Resort Activities",
    description:
      "Prioritize indoor and covered resort activities, with outdoor and transportation-sensitive options clearly excluded or caveated.",
    userPromise:
      "A strong rainy-day resort plan starts with indoor or covered activities, then adds weather-safe backups near your resort.",
    primaryAction: { label: "Find indoor activities", href: "/activities?weather=indoor" },
    sections: [
      "Indoor and covered picks",
      "Conditional light-rain options",
      "Activities to avoid in rain",
      "Weather-safe transportation",
      "Live rainy-day backups",
    ],
    caveats: [
      "Campfires, outdoor movies, poolside activities, playgrounds, and Skyliner-heavy plans are not default rainy-day picks.",
      "Lightning can affect outdoor recreation and aerial transportation.",
    ],
    keywords: ["rainy day", "indoor", "covered", "weather"],
    tier: 1,
  },
  {
    slug: "first-night-at-disney-resort",
    title: "First Night at Your Disney Resort",
    description:
      "Plan an arrival night that survives travel delays, tired kids, late rooms, and simple transportation limits.",
    userPromise:
      "The best first night is close, flexible, low-stakes, and easy to abandon if travel takes longer than expected.",
    primaryAction: { label: "See tonight's activities", href: "/tonight" },
    sections: [
      "Arriving before check-in",
      "Arriving between 3 PM and 6 PM",
      "Arriving after 6 PM",
      "First night with toddlers",
      "First night for couples",
    ],
    caveats: [
      "Avoid hard-to-reach dinner plans on arrival night.",
      "Weather-dependent activities need indoor backups.",
    ],
    keywords: ["first night", "arrival", "check-in", "tonight"],
    tier: 1,
  },
  {
    slug: "things-to-do-without-park-ticket",
    title: "Things to Do at Disney World Without a Park Ticket",
    description:
      "Separate no-ticket activities from access-sensitive resort plans, parking limits, and transportation caveats.",
    userPromise:
      "No-ticket Disney World planning should clearly separate Disney Springs, resort dining, resort recreation, and anything that actually requires park admission.",
    primaryAction: {
      label: "Browse resort activities",
      href: "/activities",
    },
    sections: [
      "Usually straightforward no-ticket ideas",
      "Access-sensitive resort ideas",
      "What is not no-ticket",
      "Transportation caveats",
      "Live no-ticket-friendly activities",
    ],
    caveats: [
      "Theme park restaurants and attractions require park admission unless Disney states otherwise.",
      "Disney Springs resort transportation is not a free resort-transfer workaround.",
    ],
    keywords: ["without park ticket", "no ticket", "free outside parks", "Disney Springs"],
    tier: 1,
  },
  {
    slug: "best-disney-resorts-for-grandparents",
    title: "Best Disney Resorts for Grandparents",
    description:
      "Rank resort activity ideas by walking intensity, seating, shade, indoor options, and transportation simplicity.",
    userPromise:
      "Grandparent-friendly resort plans should minimize walking and transfers while prioritizing seating, shade or AC, flexible timing, and calmer environments.",
    primaryAction: { label: "Browse resorts", href: "/resorts" },
    sections: ["Best low-walking picks", "Seated and shaded options", "Avoid if", "Live easy activities"],
    caveats: ["Downgrade hot, loud, high-walking, and multi-transfer plans."],
    keywords: ["grandparents", "low walking", "seating", "mobility"],
    tier: 2,
  },
  {
    slug: "best-disney-resort-activities-for-couples",
    title: "Best Disney Resort Activities for Couples",
    description:
      "Favor atmosphere, scenic routes, lounges, dining proximity, and relaxed evening activities.",
    userPromise:
      "Couples usually get the best resort night from atmosphere, direct transportation, a meal or lounge nearby, and one scenic activity.",
    primaryAction: { label: "See tonight's resort activities", href: "/tonight" },
    sections: ["Atmospheric evening picks", "Scenic resort routes", "Avoid if", "Live date-night ideas"],
    caveats: ["Do not overstuff the night or underestimate transportation time."],
    keywords: ["couples", "date night", "evening", "lounges"],
    tier: 2,
  },
  {
    slug: "monorail-resort-activities",
    title: "Monorail Resort Activities",
    description:
      "Use the Magic Kingdom-area monorail loop for simple resort activity planning with direct-route caveats.",
    userPromise:
      "Monorail resort activity plans work best when they stay on the Contemporary, Polynesian, Grand Floridian, TTC, and Magic Kingdom-area loop.",
    primaryAction: { label: "Browse Magic Kingdom-area resorts", href: "/resorts" },
    sections: ["Direct monorail resort picks", "Evening ideas", "No-ticket caveats", "Mistakes to avoid"],
    caveats: ["Some monorail destinations are not direct and may require connecting transportation."],
    keywords: ["monorail", "Contemporary", "Polynesian", "Grand Floridian"],
    tier: 3,
  },
  {
    slug: "skyliner-resort-activities",
    title: "Skyliner Resort Activities",
    description:
      "Plan Skyliner-area resort activities around direct routes, weather caveats, and nearby BoardWalk-area options.",
    userPromise:
      "Skyliner resort activities are strongest when routes stay around Pop Century, Art of Animation, Caribbean Beach, Riviera, EPCOT International Gateway, and nearby BoardWalk-area walks.",
    primaryAction: { label: "Browse resort activities", href: "/activities" },
    sections: ["Direct Skyliner-area picks", "Weather caveats", "BoardWalk walk connections", "Live activities"],
    caveats: ["Skyliner service may be affected by weather, especially lightning."],
    keywords: ["Skyliner", "Riviera", "Caribbean Beach", "BoardWalk"],
    tier: 3,
  },
  {
    slug: "disney-springs-area-resort-activities",
    title: "Disney Springs-Area Resort Activities",
    description:
      "Plan Saratoga Springs, Old Key West, Port Orleans, and nearby Disney Springs-area resort activities with current access and transportation caveats.",
    userPromise:
      "Disney Springs-area resort plans work best when they are based on a resort stay, confirmed dining or experience reservation, rideshare, or another currently allowed direct route.",
    primaryAction: { label: "Browse resort activities", href: "/activities" },
    sections: [
      "Best Disney Springs-area resort ideas",
      "Access and reservation caveats",
      "Saratoga Springs and Old Key West options",
      "Port Orleans river-area options",
      "No-ticket mistakes to avoid",
    ],
    caveats: [
      DISNEY_SPRINGS_RESORT_TRANSFER_CAVEAT.summary,
      "Do not treat Disney Springs parking, buses, or boats as a free workaround for visiting resort hotels.",
    ],
    keywords: ["Disney Springs area", "Saratoga Springs", "Old Key West", "Port Orleans", "no ticket"],
    tier: 3,
  },
];

const GUIDE_QUALIFICATIONS: Record<string, SeoGuideQualification> = {
  "disney-world-non-park-day": {
    userIntent:
      "Plan a satisfying Walt Disney World day without entering a theme park or overcommitting the family.",
    afterTheParksAdvantage:
      "Combines current resort activity schedules with practical resort, weather, access, and transportation filters.",
    liveDataDependencies: [
      "activity schedule",
      "resort",
      "category",
      "cost",
      "source status",
      "today/tonight availability",
    ],
    researchSources: GUIDE_RESEARCH_SOURCES,
    exclusionRules: [
      "Exclude in-park restaurants, attractions, tours, and ticketed events unless clearly labeled as requiring admission.",
      "Exclude resort-hopping plans that depend on Disney Springs as a free transfer workaround.",
    ],
    deepLinks: ["/today", "/tonight", "/activities", "/resorts", "/source-and-accuracy-policy"],
    decisionFilter:
      "Low-friction, no-admission plans that are current, close enough to be worth the trip, and easy to abandon.",
    freshnessRule:
      "Recheck weekly, and immediately after Disney transportation, access, parking, or resort recreation policy changes.",
    killRule:
      "Merge or noindex if the page cannot route users into current live activities, resort pages, or no-ticket planning paths.",
  },
  "free-disney-resort-activities": {
    userIntent:
      "Find legitimate free or low-cost resort recreation without accidentally depending on restricted access.",
    afterTheParksAdvantage:
      "Separates free, low-cost, resort-guest-sensitive, and source-unconfirmed activities with live schedule links.",
    liveDataDependencies: [
      "cost",
      "activity schedule",
      "resort",
      "category",
      "reservation requirement",
      "source status",
    ],
    researchSources: GUIDE_RESEARCH_SOURCES,
    exclusionRules: [
      "Do not imply free activities are open to every visitor when resort, parking, capacity, or reservation rules may apply.",
      "Exclude paid crafts, rentals, and dining experiences from the free list unless clearly separated.",
    ],
    deepLinks: ["/activities?free=true", "/today", "/tonight", "/resorts", "/source-and-accuracy-policy"],
    decisionFilter:
      "Free first, then low-cost backups, filtered by current schedule, access sensitivity, and transportation effort.",
    freshnessRule:
      "Recheck weekly and whenever activity calendars, resort access rules, or Disney Springs transportation rules change.",
    killRule:
      "Noindex or merge if it becomes a generic free-things list without current activity proof and access caveats.",
  },
  "disney-resort-hopping": {
    userIntent:
      "Choose resort-hopping routes that are worth the time and do not create avoidable transportation pain.",
    afterTheParksAdvantage:
      "Ranks plans by route quality, directness, live resort activity value, weather risk, and access caveats.",
    liveDataDependencies: [
      "resort area",
      "activity schedule",
      "transportation mode",
      "today/tonight availability",
      "source status",
    ],
    researchSources: GUIDE_RESEARCH_SOURCES,
    exclusionRules: [
      "Exclude Disney Springs as a free resort-transfer hub.",
      "Exclude bus-to-park-to-bus chains unless clearly labeled as advanced or inconvenient.",
    ],
    deepLinks: ["/resorts", "/activities", "/today", "/tonight", "/resorts?no_ticket_friendly=true"],
    decisionFilter:
      "Direct or near-direct routes first, then only hops with enough current activity or dining value to justify the transfer.",
    freshnessRule:
      "Recheck after any transportation change and at least weekly during high-travel seasons.",
    killRule:
      "Noindex route variants that cannot stay accurate, direct, and linked to current resort/activity data.",
  },
  "rainy-day-disney-resort-activities": {
    userIntent:
      "Find resort activities that still make sense in rain, lightning, heat, or weather-disrupted transportation.",
    afterTheParksAdvantage:
      "Uses weather-fit logic to separate indoor, covered, conditional, and poor-rain-fit resort activities.",
    liveDataDependencies: [
      "weather fit",
      "category",
      "location",
      "activity schedule",
      "resort",
      "source status",
    ],
    researchSources: GUIDE_RESEARCH_SOURCES,
    exclusionRules: [
      "Do not recommend campfires, outdoor movies, poolside activities, playgrounds, or outdoor trails as default rainy-day picks.",
      "Caveat Skyliner-heavy and outdoor-transfer plans for lightning and weather closures.",
    ],
    deepLinks: [
      "/activities?weather=indoor",
      "/activities?weather=covered",
      "/today?weather=indoor",
      "/tonight?weather=indoor",
      "/activities/arcades",
      "/activities/community-halls",
      "/activities/crafts",
    ],
    decisionFilter:
      "Indoor and covered options first, conditional light-rain options second, weather-dependent outdoor activities excluded by default.",
    freshnessRule:
      "Recheck before storms, during seasonal schedule changes, and whenever activity weather-fit data changes.",
    killRule:
      "Noindex if the page cannot distinguish indoor/covered picks from outdoor activities with enough precision.",
  },
  "first-night-at-disney-resort": {
    userIntent:
      "Build an arrival-night plan that survives flight delays, tired travelers, room timing, and simple logistics.",
    afterTheParksAdvantage:
      "Matches tonight's live activity data with arrival windows, resort proximity, dining fragility, and backup plans.",
    liveDataDependencies: [
      "tonight availability",
      "activity time",
      "resort",
      "duration",
      "weather fit",
      "cost",
      "source status",
    ],
    researchSources: GUIDE_RESEARCH_SOURCES,
    exclusionRules: [
      "Exclude complex cross-property plans for late arrivals unless a direct route or confirmed reservation justifies them.",
      "Avoid weather-dependent activities without indoor backups.",
    ],
    deepLinks: ["/tonight", "/today", "/activities", "/resorts", "/activities"],
    decisionFilter:
      "Close, flexible, low-stakes activities ordered by arrival window and how easy they are to abandon.",
    freshnessRule:
      "Recheck daily because tonight's schedules, weather, and arrival logistics are time-sensitive.",
    killRule:
      "Merge if it stops using arrival-window logic and becomes a generic resort activities article.",
  },
  "things-to-do-without-park-ticket": {
    userIntent:
      "Understand what can actually be done without park admission, and what still needs access, parking, or reservation planning.",
    afterTheParksAdvantage:
      "Separates no-ticket, access-sensitive, and not-no-ticket ideas while routing users into current live activities.",
    liveDataDependencies: [
      "ticket requirement",
      "cost",
      "reservation requirement",
      "resort",
      "activity schedule",
      "source status",
    ],
    researchSources: GUIDE_RESEARCH_SOURCES,
    exclusionRules: [
      "Exclude anything inside Magic Kingdom, EPCOT, Hollywood Studios, or Animal Kingdom unless clearly marked as requiring admission.",
      "Do not frame Disney Springs as a free way to get to resort hotels; current reporting says resort stay or dining/experience reservation is required for Disney Springs resort buses and boats.",
    ],
    deepLinks: [
      "/activities",
      "/activities?free=true",
      "/today",
      "/tonight",
      "/resorts",
      "/source-and-accuracy-policy",
    ],
    decisionFilter:
      "No park admission required, with access-sensitive resort ideas separated from straightforward Disney Springs and resort-stay plans.",
    freshnessRule:
      "Recheck after every Disney access, parking, transportation, or dining policy change and at least weekly.",
    killRule:
      "Noindex if access rules cannot be verified or if the page blurs no-ticket plans with park-admission experiences.",
  },
  "best-disney-resorts-for-grandparents": {
    userIntent:
      "Choose resort activities that work for older adults, multi-generational groups, and lower-walking plans.",
    afterTheParksAdvantage:
      "Filters current resort activity choices by walking intensity, seating, shade or AC, noise, and transfer simplicity.",
    liveDataDependencies: [
      "resort",
      "activity schedule",
      "walking intensity",
      "shade or AC",
      "accessibility fit",
      "source status",
    ],
    researchSources: GUIDE_RESEARCH_SOURCES,
    exclusionRules: [
      "Downgrade loud, hot, high-walking, late-night, and multi-transfer plans.",
      "Do not recommend access-sensitive resort visits without reservation or stay caveats.",
    ],
    deepLinks: ["/resorts", "/today", "/tonight", "/activities", "/activities?transport=monorail"],
    decisionFilter:
      "Low walking, seating nearby, shade or AC, calm environment, flexible timing, and simple transportation.",
    freshnessRule:
      "Recheck monthly and when accessibility, transportation, or resort activity data changes.",
    killRule:
      "Merge if the page cannot score activities by mobility, seating, shade, and transport complexity.",
  },
  "best-disney-resort-activities-for-couples": {
    userIntent:
      "Find resort activities that feel like a date night or adult-friendly break without overcomplicating the evening.",
    afterTheParksAdvantage:
      "Combines live evening activities with resort area, atmosphere, dining proximity, and transportation simplicity.",
    liveDataDependencies: [
      "tonight availability",
      "resort area",
      "activity category",
      "time of day",
      "cost",
      "source status",
    ],
    researchSources: GUIDE_RESEARCH_SOURCES,
    exclusionRules: [
      "Exclude overstuffed itineraries and routes that require too many transfers for a relaxed evening.",
      "Separate family-heavy activities from genuinely couple-friendly atmosphere picks.",
    ],
    deepLinks: ["/tonight", "/activities", "/resorts", "/activities?transport=monorail", "/activities?transport=skyliner"],
    decisionFilter:
      "Atmosphere, evening timing, dining or lounge proximity, scenic setting, and simple route quality.",
    freshnessRule:
      "Recheck weekly and before seasonal entertainment or transportation changes.",
    killRule:
      "Noindex if it becomes a generic date-night article without live evening data or route-aware planning.",
  },
  "monorail-resort-activities": {
    userIntent:
      "Use the monorail area for a simple resort activity plan without guessing which resorts are actually connected.",
    afterTheParksAdvantage:
      "Limits recommendations to the route family and connects current activities to Magic Kingdom-area resort pages.",
    liveDataDependencies: [
      "resort area",
      "transportation mode",
      "activity schedule",
      "tonight availability",
      "source status",
    ],
    researchSources: GUIDE_RESEARCH_SOURCES,
    exclusionRules: [
      "Do not include non-monorail resorts unless the required connecting transportation is explicit.",
      "Do not imply resort parking or access is guaranteed without a stay, reservation, or Disney permission.",
    ],
    deepLinks: ["/resorts", "/activities", "/today", "/tonight", "/activities/electrical-water-pageant"],
    decisionFilter:
      "Magic Kingdom-area monorail loop first, with non-direct connections labeled instead of blended into the main route.",
    freshnessRule:
      "Recheck after monorail service changes, resort access policy changes, and weekly during peak seasons.",
    killRule:
      "Merge into resort hopping if the page cannot stay route-specific and source-backed.",
  },
  "skyliner-resort-activities": {
    userIntent:
      "Plan around Skyliner-area resorts while understanding weather limits and nearby walkable resort zones.",
    afterTheParksAdvantage:
      "Connects live activity listings to Skyliner resort geography, BoardWalk-adjacent options, and weather caveats.",
    liveDataDependencies: [
      "resort area",
      "transportation mode",
      "weather fit",
      "activity schedule",
      "source status",
    ],
    researchSources: GUIDE_RESEARCH_SOURCES,
    exclusionRules: [
      "Do not recommend Skyliner-dependent plans as weather-safe during lightning or high-wind conditions.",
      "Do not treat EPCOT International Gateway paths as park access unless admission requirements are clearly separated.",
    ],
    deepLinks: ["/activities", "/today", "/tonight", "/resorts", "/activities?weather=indoor"],
    decisionFilter:
      "Skyliner-connected resorts and nearby BoardWalk walks, filtered by weather risk and whether the route stays outside park admission.",
    freshnessRule:
      "Recheck whenever weather disruptions, Skyliner service updates, or resort recreation schedules change.",
    killRule:
      "Merge or noindex if it cannot distinguish direct Skyliner routes from weather-sensitive or admission-sensitive routes.",
  },
  "disney-springs-area-resort-activities": {
    userIntent:
      "Decide whether a Disney Springs-area resort activity plan is realistic without relying on restricted resort transportation.",
    afterTheParksAdvantage:
      "Connects current resort activity data to Saratoga Springs, Old Key West, Port Orleans, no-ticket filters, and dated Disney Springs access caveats.",
    liveDataDependencies: [
      "resort area",
      "activity schedule",
      "ticket requirement",
      "reservation requirement",
      "transportation caveat",
      "source status",
    ],
    researchSources: GUIDE_RESEARCH_SOURCES,
    exclusionRules: [
      "Do not use Disney Springs as a free resort-transfer hub. Resort transportation from Disney Springs may require a Disney Resort stay or a confirmed dining or experience reservation.",
      "Exclude resort visits that cannot be supported by a stay, reservation, rideshare, permitted direct route, or current official access guidance.",
    ],
    deepLinks: [
      "/activities?area=disney-springs",
      "/activities",
      "/resorts",
      "/resorts?no_ticket_friendly=true",
      "/source-and-accuracy-policy",
    ],
    decisionFilter:
      "Disney Springs-area resorts only when the guest has a resort stay, confirmed dining/experience reservation, rideshare, or another currently allowed route that does not depend on restricted free resort transfers.",
    freshnessRule:
      "Recheck immediately after Disney Springs transportation, resort access, parking, dining, or experience-reservation policy changes and at least weekly.",
    killRule:
      "Noindex or merge if current access rules cannot be verified or if the page would imply Disney Springs is a free resort-transfer hub.",
  },
};

function qualificationFor(slug: string): SeoGuideQualification {
  const qualification = GUIDE_QUALIFICATIONS[slug];
  if (!qualification) {
    throw new Error(`Missing SEO guide qualification for ${slug}`);
  }
  return qualification;
}

// Internal SEO planning definitions only. The public /guides route family was
// removed; these records feed qualification, discovery, and product-route links.
export const HIGH_VALUE_GUIDES: SeoGuideDefinition[] = HIGH_VALUE_GUIDE_DRAFTS.map(
  (guide) => ({
    ...guide,
    ...qualificationFor(guide.slug),
  })
);

// Internal activity-explainer definitions that point into current product pages.
export const PRIORITY_ACTIVITY_GUIDES: SeoActivityDefinition[] = [
  {
    slug: "movies-under-the-stars",
    title: "Movies Under the Stars",
    description:
      "Outdoor movie nights at select Walt Disney World resorts, usually dependent on weather and current recreation calendars.",
    bestFor: "Low-key evening plans, families, arrival nights, and resort days.",
    currentCheckHref: "/tonight",
    caveats: [
      "Outdoor movies are weather-dependent and may move, change, or be canceled.",
      "Confirm the current movie, time, and location with the resort before heading out.",
    ],
  },
  {
    slug: "campfire",
    title: "Campfire Activities",
    description:
      "Evening campfire activities at select Walt Disney World resorts, often paired with marshmallow roasting or nearby outdoor recreation.",
    bestFor: "Evening resort downtime, families, and first-night plans close to your resort.",
    currentCheckHref: "/tonight",
    caveats: [
      "Campfires are outdoor and weather-dependent.",
      "Some locations, supplies, or schedules may be resort-specific.",
    ],
  },
  {
    slug: "poolside-activities",
    title: "Poolside Activities",
    description:
      "Resort pool games and recreation-team activities that are usually best for daytime, warm weather, and resort guests.",
    bestFor: "Pool breaks, kids, resort days, and flexible afternoon plans.",
    currentCheckHref: "/today",
    caveats: [
      "Poolside programming can change for weather, staffing, or pool access rules.",
      "Some pools are gated or limited to resort guests.",
    ],
  },
  {
    slug: "arcades",
    title: "Arcades",
    description:
      "Current arcade options across Disney resorts, with locations, cost notes, and source freshness.",
    bestFor: "Rain breaks, arrival day, rest days, and kids who need an indoor activity.",
    currentCheckHref: "/activities?category=arcade",
    caveats: [
      "Arcade hours and payment systems can vary by resort.",
      "Confirm location and hours before crossing resorts.",
    ],
  },
  {
    slug: "crafts",
    title: "Crafts and Creative Activities",
    description:
      "Resort crafts, tie-dye, painting, mosaics, and other creative activities from current recreation calendars.",
    bestFor: "Kids, rainy-day backups, low-walking plans, and relaxed resort time.",
    currentCheckHref: "/activities?category=arts_crafts",
    caveats: [
      "Some crafts are free, while others require a fee or reservation.",
      "Age limits, supplies, and timing vary by resort.",
    ],
  },
  {
    slug: "electrical-water-pageant",
    title: "Electrical Water Pageant",
    description:
      "A short nighttime water pageant visible from select Magic Kingdom-area resorts, useful for simple evening plans.",
    bestFor: "Couples, grandparents, low-stakes evening plans, and Magic Kingdom-area resort stays.",
    currentCheckHref: "/tonight",
    caveats: [
      "Viewing depends on location, timing, weather, and current Disney operations.",
      "Do not assume resort parking or access is available without a stay, reservation, or current Disney permission.",
    ],
  },
  {
    slug: "fitness",
    title: "Fitness and Wellness Activities",
    description:
      "Resort fitness, wellness, jogging, yoga, and recreation options where schedules or access may vary.",
    bestFor: "Adults, teens, solo downtime, and low-park-intensity mornings.",
    currentCheckHref: "/activities?category=fitness",
    caveats: [
      "Outdoor fitness options are weather-sensitive.",
      "Some fitness centers, classes, or facilities may be limited to resort guests or require a fee.",
    ],
  },
  {
    slug: "community-halls",
    title: "Community Halls",
    description:
      "Disney Vacation Club-style community hall spaces with games, crafts, rentals, and indoor-friendly resort activities where available.",
    bestFor: "Rainy days, kids, crafts, and lower-walking resort breaks.",
    currentCheckHref: "/activities?category=community_hall",
    caveats: [
      "Availability and eligibility vary by resort.",
      "Some activities, rentals, or crafts may have fees or age requirements.",
    ],
  },
];

export const PRIORITY_ACTIVITY_SLUGS = PRIORITY_ACTIVITY_GUIDES.map(
  (activity) => activity.slug
);

export function getSeoGuideBySlug(slug: string): SeoGuideDefinition | undefined {
  return HIGH_VALUE_GUIDES.find((guide) => guide.slug === slug);
}

export function getSeoActivityBySlug(
  slug: string
): SeoActivityDefinition | undefined {
  return PRIORITY_ACTIVITY_GUIDES.find((activity) => activity.slug === slug);
}

export function validateSeoGuideQualifications(
  guides: SeoGuideDefinition[]
): string[] {
  const issues: string[] = [];
  const requiredTextFields: Array<keyof Pick<
    SeoGuideDefinition,
    | "userIntent"
    | "afterTheParksAdvantage"
    | "decisionFilter"
    | "freshnessRule"
    | "killRule"
    | "userPromise"
    | "description"
  >> = [
    "userIntent",
    "afterTheParksAdvantage",
    "decisionFilter",
    "freshnessRule",
    "killRule",
    "userPromise",
    "description",
  ];

  for (const guide of guides) {
    for (const field of requiredTextFields) {
      if (!guide[field] || guide[field].trim().length < 24) {
        issues.push(`${guide.slug}: ${field} is missing or too thin`);
      }
    }

    const arrayChecks: Array<{
      field: keyof Pick<
        SeoGuideDefinition,
        | "liveDataDependencies"
        | "researchSources"
        | "exclusionRules"
        | "deepLinks"
        | "sections"
        | "caveats"
        | "keywords"
      >;
      minimum: number;
    }> = [
      { field: "liveDataDependencies", minimum: 3 },
      { field: "researchSources", minimum: 3 },
      { field: "exclusionRules", minimum: 1 },
      { field: "deepLinks", minimum: 2 },
      { field: "sections", minimum: 3 },
      { field: "caveats", minimum: 1 },
      { field: "keywords", minimum: 2 },
    ];

    for (const check of arrayChecks) {
      if (guide[check.field].length < check.minimum) {
        issues.push(
          `${guide.slug}: ${check.field} needs at least ${check.minimum} entries`
        );
      }
    }

    if (!guide.primaryAction.href.startsWith("/")) {
      issues.push(`${guide.slug}: primaryAction must link to an internal route`);
    }

    for (const href of guide.deepLinks) {
      if (!href.startsWith("/")) {
        issues.push(`${guide.slug}: deepLink must be internal: ${href}`);
      }
    }

    const joined = [
      guide.title,
      guide.description,
      guide.userPromise,
      guide.decisionFilter,
      ...guide.caveats,
      ...guide.exclusionRules,
    ]
      .join(" ")
      .toLowerCase();

    if (joined.includes("disney springs as a free way")) {
      const hasRestrictionLanguage =
        joined.includes("do not") ||
        joined.includes("not a free") ||
        joined.includes("reservation") ||
        joined.includes("resort stay");
      if (!hasRestrictionLanguage) {
        issues.push(
          `${guide.slug}: Disney Springs transportation language lacks current restriction caveat`
        );
      }
    }
  }

  return issues;
}
