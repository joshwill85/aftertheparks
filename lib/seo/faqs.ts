import type { ActivityOccurrence, ResortSummary } from "@/lib/types/occurrence";

export interface SeoFaqItem {
  question: string;
  answer: string;
}

export interface ResortFaqCounts {
  scheduledCount: number;
  offeringCount: number;
  todayCount: number;
  tonightCount: number;
  sourceCount: number;
}

function priceAnswer(activity: ActivityOccurrence): string {
  if (activity.price.state === "free") {
    return `${activity.title} is currently tracked as free in After the Parks data for ${activity.resort.name}. Confirm current eligibility, supplies, and access with the resort before you plan around it.`;
  }
  if (activity.price.state === "fee") {
    return `${activity.title} may have a fee or paid component. Check the current official source and any reservation details before you go.`;
  }
  return `The current cost for ${activity.title} is not fully confirmed in the tracked data. Check the official resort source before relying on it as a free or paid activity.`;
}

function scheduleAnswer(activity: ActivityOccurrence, upcomingCount: number): string {
  if (upcomingCount > 0) {
    return `After the Parks currently has ${upcomingCount} upcoming verified listing${upcomingCount === 1 ? "" : "s"} for ${activity.title}. Times can change, so confirm the latest resort recreation source before heading out.`;
  }
  if (activity.scheduleText) {
    return `${activity.title} has schedule text in the current data, but day-of timing should still be confirmed with the resort before you go.`;
  }
  return `${activity.title} is best treated as an activity guide until a current schedule row is available. Use today and tonight views for current timing.`;
}

function weatherAnswer(activity: ActivityOccurrence): string | undefined {
  const weather = activity.enrichment?.weatherDependency;
  const title = activity.title.toLowerCase();
  if (!weather && !/(movie|campfire|pool|outdoor|pageant|fitness|yoga|trail)/i.test(title)) {
    return undefined;
  }
  if (weather) {
    return `${activity.title} has weather-sensitive details in the tracked data: ${weather} Confirm outdoor, poolside, boat, Skyliner, movie, and campfire plans before leaving your resort.`;
  }
  return `${activity.title} may be affected by weather if it is outdoors, poolside, or transportation-sensitive. Check current conditions and the official resort source before you go.`;
}

function reservationAnswer(activity: ActivityOccurrence): string {
  if (activity.enrichment?.reservationRequired || activity.eligibility.reservation?.required) {
    return `Yes. ${activity.title} is marked as requiring a reservation in the tracked data. Confirm the booking method, timing, cost, and eligibility with the official source.`;
  }
  if (activity.enrichment?.reservationRecommended) {
    return `${activity.title} is marked as reservation-recommended. Walk-up availability may vary, so confirm before building a plan around it.`;
  }
  return `${activity.title} is not currently marked as reservation-required in the tracked data, but eligibility and access can vary by resort, season, and operations.`;
}

export function buildActivityFaqItems(
  activity: ActivityOccurrence,
  upcomingCount: number
): SeoFaqItem[] {
  const items: SeoFaqItem[] = [
    {
      question: `Is ${activity.title} free?`,
      answer: priceAnswer(activity),
    },
    {
      question: `When is ${activity.title} offered?`,
      answer: scheduleAnswer(activity, upcomingCount),
    },
    {
      question: `Do I need a reservation for ${activity.title}?`,
      answer: reservationAnswer(activity),
    },
  ];

  const weather = weatherAnswer(activity);
  if (weather) {
    items.push({
      question: `Can ${activity.title} be affected by weather?`,
      answer: weather,
    });
  }

  items.push({
    question: `Where should I confirm ${activity.title} before going?`,
    answer: `Use the current After the Parks listing as a planning shortcut, then confirm times, location, cost, eligibility, and weather changes with the official resort source for ${activity.resort.name}.`,
  });

  return items;
}

export function buildResortFaqItems(
  resort: ResortSummary,
  counts: ResortFaqCounts
): SeoFaqItem[] {
  return [
    {
      question: `What activities are currently tracked at ${resort.name}?`,
      answer: `After the Parks currently tracks ${counts.scheduledCount} scheduled activit${counts.scheduledCount === 1 ? "y" : "ies"} and ${counts.offeringCount} standing offering${counts.offeringCount === 1 ? "" : "s"} for ${resort.name}. Use the resort page, today view, and tonight view for the current verified list.`,
    },
    {
      question: `What can I do at ${resort.name} today or tonight?`,
      answer: `${resort.name} currently has ${counts.todayCount} tracked activit${counts.todayCount === 1 ? "y" : "ies"} today and ${counts.tonightCount} tonight. Confirm same-day times and locations before leaving your room or crossing resorts.`,
    },
    {
      question: `Are ${resort.name} activities official Disney schedules?`,
      answer: `After the Parks is independent and uses verified source data to make resort planning easier. This page currently references ${counts.sourceCount} official or verified URL${counts.sourceCount === 1 ? "" : "s"}, but Disney remains the source to confirm final times, access, cost, and cancellations.`,
    },
    {
      question: `Can non-resort guests use activities at ${resort.name}?`,
      answer: `Access can depend on the activity, resort operations, parking, dining reservations, capacity, and guest eligibility. Do not use Disney Springs as a free resort-transfer hub; use a resort stay, confirmed dining/experience reservation, rideshare, or another currently allowed direct route.`,
    },
  ];
}

export function validateSeoFaqItems(items: SeoFaqItem[]): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.question)) {
      issues.push(`Duplicate FAQ question: ${item.question}`);
    }
    seen.add(item.question);
    if (item.question.trim().length < 12) {
      issues.push(`Question is too thin: ${item.question}`);
    }
    if (item.answer.trim().length < 60) {
      issues.push(`Answer is too thin: ${item.question}`);
    }
    if (/guaranteed|always|never changes/i.test(item.answer)) {
      issues.push(`Answer overclaims certainty: ${item.question}`);
    }
  }

  return issues;
}
