import type { WeatherFit } from "@/lib/seo/fit";

interface WeatherFitTextInput {
  title?: string;
  category?: string;
  summary?: string;
  location?: string;
  tags?: string[];
  amenities?: string[];
  weatherDependency?: string;
}

function textFrom(values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ").toLowerCase();
}

function isPoolTableText(text: string): boolean {
  return /\bpool table\b/.test(text);
}

function hasOutdoorLocation(location: string): boolean {
  if (!location) return false;
  return (
    /\boutside\b/.test(location) ||
    /\b(pool|poolside|pool deck|feature pool|tennis courts?|pickleball courts?|sports courts?|lawn|beach|marina|trail|playground)\b/.test(
      location
    )
  );
}

export function inferWeatherFitFromText(item: WeatherFitTextInput): WeatherFit | undefined {
  const titleCategory = textFrom([item.title, item.category]);
  const location = textFrom([item.location]);
  const explicitWeather = textFrom([item.weatherDependency]);
  const summary = textFrom([item.summary]);
  const extras = textFrom([...(item.tags ?? []), ...(item.amenities ?? [])]);
  const allText = textFrom([titleCategory, location, explicitWeather, summary, extras]);

  if (/\bpoolside\b/.test(titleCategory) || item.category === "poolside") {
    return "outdoor_weather_dependent";
  }

  if (hasOutdoorLocation(location) && !isPoolTableText(location)) {
    return "outdoor_weather_dependent";
  }

  if (/\bindoor\b/.test(explicitWeather)) return "indoor";
  if (/\bcovered\b/.test(explicitWeather)) return "covered";

  if (
    /\barcade\b|community hall|lobby|animation hall|learn to draw/.test(
      textFrom([titleCategory, location, extras])
    )
  ) {
    return "indoor";
  }

  if (/\bcovered\b|porch|pavilion|under cover|covered walkway/.test(allText)) {
    return "covered";
  }

  if (/weather|outdoor|movie|campfire|poolside|trail|surrey/.test(allText)) {
    return "outdoor_weather_dependent";
  }

  if (/\bpool\b/.test(allText) && !isPoolTableText(allText)) {
    return "outdoor_weather_dependent";
  }

  return undefined;
}
