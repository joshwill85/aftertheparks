import type { WeatherHour } from "@/lib/weather/types";

export type ForecastTimelineLabel = "Now" | "Next 2 hours" | "Afternoon" | "Evening" | "Tonight";

export type ForecastTimelineGroup = {
  label: ForecastTimelineLabel;
  rows: Array<{
    hour: WeatherHour;
    displayTime: string;
    isNow?: boolean;
  }>;
};

function disneyDateKey(value: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function disneyHour(value: string): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: "America/New_York",
  })
    .formatToParts(new Date(value))
    .find((part) => part.type === "hour")?.value;
  return Number(hour ?? 0);
}

export function formatDisneyForecastTime(value: string): string {
  const date = new Date(value);
  const minute = new Intl.DateTimeFormat("en-US", {
    minute: "2-digit",
    timeZone: "America/New_York",
  })
    .formatToParts(date)
    .find((part) => part.type === "minute")?.value;
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    timeZone: "America/New_York",
  };
  if (minute && Number(minute) !== 0) options.minute = "2-digit";
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

function rowsFor(hours: WeatherHour[]) {
  return hours.map((hour) => ({
    hour,
    displayTime: formatDisneyForecastTime(hour.time),
  }));
}

export function buildForecastTimelineGroups({
  hours,
  now = new Date(),
}: {
  hours: WeatherHour[];
  now?: Date;
}): ForecastTimelineGroup[] {
  const nowTime = now.getTime();
  const currentDisneyDate = disneyDateKey(now);
  const currentDisneyHour = disneyHour(now.toISOString());
  const futureHours = hours.filter(
    (hour) => new Date(hour.time).getTime() >= nowTime - 30 * 60 * 1000
  );
  const nextTwoHours = futureHours.filter(
    (hour) => new Date(hour.time).getTime() > nowTime
  );
  const todayHours = futureHours.filter(
    (hour) => disneyDateKey(hour.time) === currentDisneyDate
  );
  const nowRows = futureHours[0]
    ? [
        {
          hour: futureHours[0],
          displayTime: formatDisneyForecastTime(now.toISOString()),
          isNow: true,
        },
      ]
    : [];
  const groups: ForecastTimelineGroup[] = [
    { label: "Now", rows: nowRows },
    { label: "Next 2 hours", rows: rowsFor(nextTwoHours.slice(0, 2)) },
    {
      label: "Afternoon",
      rows:
        currentDisneyHour < 12
          ? rowsFor(todayHours.filter((hour) => disneyHour(hour.time) >= 12 && disneyHour(hour.time) < 17))
          : [],
    },
    {
      label: "Evening",
      rows:
        currentDisneyHour < 17
          ? rowsFor(todayHours.filter((hour) => disneyHour(hour.time) >= 17 && disneyHour(hour.time) < 22))
          : [],
    },
    {
      label: "Tonight",
      rows: rowsFor(todayHours.filter((hour) => disneyHour(hour.time) >= 22 || disneyHour(hour.time) < 6)),
    },
  ];
  return groups.filter((group) => group.rows.length > 0);
}
