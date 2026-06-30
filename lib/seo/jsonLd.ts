export type JsonLdObject = Record<string, unknown>;

interface ActivityEventInput {
  id: string;
  activitySlug: string;
  title: string;
  summary?: string;
  startDateTime?: string;
  endDateTime?: string;
  status?: "active" | "seasonal" | "paused";
  price?: {
    state: "free" | "fee" | "unknown";
    amountCents?: number;
    minAmountCents?: number;
  };
  location: { label: string };
  resort: { name: string };
  freshness?: {
    sourceUrl?: string;
    lastVerified?: string;
  };
}

function absoluteUrl(baseUrl: string, path: string): string {
  return new URL(path, baseUrl).toString().replace(/\/$/, "");
}

export function buildOrganizationJsonLd(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "After the Parks",
    url: absoluteUrl(baseUrl, "/"),
    description:
      "After the Parks is an independent Walt Disney World resort activity planner for current resort recreation, activity calendars, and no-park-day planning.",
  };
}

export function buildWebsiteJsonLd(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "After the Parks",
    url: absoluteUrl(baseUrl, "/"),
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl(baseUrl, "/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildBreadcrumbJsonLd(
  baseUrl: string,
  items: Array<{ name: string; path: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(baseUrl, item.path),
    })),
  };
}

export function buildPlanningArticleJsonLd(
  baseUrl: string,
  article: {
    path: string;
    title: string;
    description: string;
    dateModified: string;
  }
) {
  const url = absoluteUrl(baseUrl, article.path);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    mainEntityOfPage: url,
    url,
    dateModified: article.dateModified,
    author: {
      "@type": "Organization",
      name: "After the Parks",
      url: absoluteUrl(baseUrl, "/"),
    },
    reviewedBy: {
      "@type": "Organization",
      name: "After the Parks",
      url: absoluteUrl(baseUrl, "/"),
    },
    publisher: {
      "@type": "Organization",
      name: "After the Parks",
      url: absoluteUrl(baseUrl, "/"),
    },
  };
}

export function buildResortAccommodationJsonLd(
  baseUrl: string,
  resort: {
    slug: string;
    name: string;
    description: string;
    dateModified?: string;
    sourceUrl?: string;
  }
) {
  const url = absoluteUrl(baseUrl, `/resorts/${resort.slug}`);
  const sourceUrl = resort.sourceUrl ?? url;

  return {
    "@context": "https://schema.org",
    "@type": "TouristAccommodation",
    name: resort.name,
    description: resort.description,
    url,
    mainEntityOfPage: url,
    dateModified: resort.dateModified,
    isPartOf: {
      "@type": "TouristDestination",
      name: "Walt Disney World Resort",
    },
    subjectOf: {
      "@type": "CreativeWork",
      url: sourceUrl,
      dateModified: resort.dateModified,
    },
  };
}

export function buildItemListJsonLd(
  baseUrl: string,
  name: string,
  items: Array<{ name: string; path: string; description?: string }>,
  metadata: {
    dateModified?: string;
    currentScheduleWindow?: string;
    sourceSummary?: string;
  } = {}
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    dateModified: metadata.dateModified,
    temporalCoverage: metadata.currentScheduleWindow,
    description: metadata.sourceSummary,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      description: item.description,
      url: absoluteUrl(baseUrl, item.path),
    })),
  };
}

export function buildFaqPageJsonLd(
  baseUrl: string,
  path: string,
  items: Array<{ question: string; answer: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntityOfPage: absoluteUrl(baseUrl, path),
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

function eventStatus(status?: ActivityEventInput["status"]): string {
  if (status === "paused") return "https://schema.org/EventCancelled";
  return "https://schema.org/EventScheduled";
}

function eventOffer(price?: ActivityEventInput["price"]) {
  if (!price || price.state === "unknown") return undefined;
  const amountCents = price.state === "free"
    ? 0
    : price.amountCents ?? price.minAmountCents;

  if (amountCents == null) return undefined;

  return {
    "@type": "Offer",
    price: String(amountCents / 100),
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  };
}

export function buildActivityEventJsonLd(
  baseUrl: string,
  occurrence: ActivityEventInput
): JsonLdObject | undefined {
  if (!occurrence.startDateTime) return undefined;

  const sourceUrl = occurrence.freshness?.sourceUrl;
  const source =
    sourceUrl
      ? {
          "@type": "CreativeWork",
          url: sourceUrl,
          dateModified: occurrence.freshness?.lastVerified,
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": absoluteUrl(baseUrl, `/activities/${occurrence.activitySlug}#${occurrence.id}`),
    name: occurrence.title,
    description: occurrence.summary || `${occurrence.title} at ${occurrence.resort.name}.`,
    url: absoluteUrl(baseUrl, `/activities/${occurrence.activitySlug}`),
    startDate: occurrence.startDateTime,
    endDate: occurrence.endDateTime,
    eventStatus: eventStatus(occurrence.status),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    isAccessibleForFree: occurrence.price?.state === "free",
    organizer: {
      "@type": "TouristAccommodation",
      name: occurrence.resort.name,
    },
    location: {
      "@type": "Place",
      name: occurrence.location.label,
      containedInPlace: {
        "@type": "TouristAccommodation",
        name: occurrence.resort.name,
      },
    },
    offers: eventOffer(occurrence.price),
    subjectOf: source,
  };
}

export function stringifyJsonLd(jsonLd: JsonLdObject | JsonLdObject[]): string {
  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}
