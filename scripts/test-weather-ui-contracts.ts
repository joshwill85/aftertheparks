import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = [
  "components/weather/WeatherIcon.tsx",
  "components/weather/WeatherIconButton.tsx",
  "components/weather/WeatherTimeSpanPopover.tsx",
  "components/weather/WeatherStatusStrip.tsx",
  "components/weather/NearTermRainLine.tsx",
  "components/weather/WeatherPrecipMapPreview.tsx",
  "components/weather/NwsAlertBanner.tsx",
  "components/weather/ForecastTimeline.tsx",
  "components/weather/ActivityWeatherBadge.tsx",
  "components/weather/WeatherWindowStrip.tsx",
  "components/weather/WeatherWindowCard.tsx",
  "components/weather/WeatherStoryStrip.tsx",
  "components/weather/PlanResilienceScore.tsx",
  "components/weather/StormModeBanner.tsx",
  "components/weather/StormModeActivitySuppression.tsx",
  "components/weather/ForecastCompare.tsx",
  "components/weather/ResortWeatherPersonality.tsx",
  "components/weather/RouteWeatherImpact.tsx",
];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(
    source,
    /cdn\.weatherapi\.com|condition\.icon/,
    `${file} must not render WeatherAPI icons`
  );
}

const iconButton = readFileSync("components/weather/WeatherIconButton.tsx", "utf8");
const atmosphereScene = readFileSync("components/weather/WeatherAtmosphereScene.tsx", "utf8");
assert.match(iconButton, /aria-label/);
assert.match(iconButton, /formatTempDual/);
assert.match(iconButton, /WeatherFreshnessLine/);
assert.match(iconButton, /next\/link/);
assert.match(iconButton, /weatherPageHref\(weather\.locationKey\)/);
assert.match(iconButton, /weather-icon-button__icon-link/);
assert.match(
  atmosphereScene,
  /useEffect/,
  "Decorative weather atmosphere SVGs should mount client-side to avoid SSR/client element order mismatches."
);
assert.match(
  atmosphereScene,
  /if \(!mounted\) return null/,
  "Decorative weather atmosphere SVGs should be absent from SSR and initial hydration."
);
assert.match(
  atmosphereScene,
  /preserveAspectRatio="xMidYMid slice"/,
  "Weather atmosphere scenes should preserve their authored 320:128 proportions instead of stretching to arbitrary block shapes."
);

const popover = readFileSync("components/weather/WeatherTimeSpanPopover.tsx", "utf8");
assert.match(popover, /hourlyBreakdown/);
assert.match(popover, /nwsAlerts/);
assert.match(popover, /formatTempDual/);
assert.match(popover, /formatWindDual/);
assert.match(popover, /WeatherFreshnessLine/);
assert.match(popover, /NearTermRainLine/);
assert.match(popover, /WeatherPrecipMapPreview/);

const statusStrip = readFileSync("components/weather/WeatherStatusStrip.tsx", "utf8");
assert.match(statusStrip, /WeatherFreshnessLine/);
assert.match(statusStrip, /NearTermRainLine/);
assert.doesNotMatch(statusStrip, /WeatherPrecipMapPreview/);
assert.match(statusStrip, /weather-status-strip__action/);

const tonightClient = readFileSync("components/atlas/TonightClient.tsx", "utf8");
assert.doesNotMatch(tonightClient, /StormModeBanner/);
assert.doesNotMatch(tonightClient, /Indoor tonight/);
assert.match(tonightClient, /Covered Options/);

const todayClient = readFileSync("components/atlas/TodayClient.tsx", "utf8");
assert.doesNotMatch(todayClient, /StormModeBanner/);
assert.doesNotMatch(todayClient, /Indoor backups/);
assert.match(todayClient, /Covered Options/);

const eventSignal = readFileSync("components/weather/EventWeatherSignal.tsx", "utf8");
assert.match(eventSignal, /WeatherFreshnessLine/);
assert.doesNotMatch(
  eventSignal,
  /nearTermRain/,
  "Inline event-card weather should not include near-term rain copy or fallbacks."
);
assert.doesNotMatch(
  eventSignal,
  /NearTermRainLine/,
  "Inline event-card weather should stay compact and avoid low-value near-term rain copy."
);
assert.match(eventSignal, /weatherPageHref\(guidance\.locationKey\)/);
assert.match(eventSignal, /event-weather-signal__icon-link/);
assert.match(eventSignal, /window\.location\.assign\(weatherHref\)/);
assert.match(eventSignal, /event\.stopPropagation\(\)/);

const nearTermRain = readFileSync("components/weather/NearTermRainLine.tsx", "utf8");
assert.match(nearTermRain, /not radar-confirmed|nearTermRainShortCopy/);

const precipMapPreview = readFileSync("components/weather/WeatherPrecipMapPreview.tsx", "utf8");
assert.match(precipMapPreview, /previewTileUrl/);
assert.match(precipMapPreview, /PrecipMapContext|precipMap/);

const precipMapContext = readFileSync("lib/weather/precipMap.ts", "utf8");
assert.doesNotMatch(
  precipMapContext,
  /Precipitation map context|WeatherAPI precipitation map context/
);

const freshness = readFileSync("lib/weather/freshness.ts", "utf8");
const freshnessLine = readFileSync("components/weather/WeatherFreshnessLine.tsx", "utf8");
assert.match(freshness, /Updated \${minutes} min ago/);
assert.match(freshness, /Hourly forecast/);
assert.match(freshness, /weatherLocationLabel/);
assert.match(
  freshnessLine,
  /suppressHydrationWarning/,
  "Relative weather freshness copy should not trigger hydration mismatches when preloaded weather is rendered."
);

const tokens = readFileSync("src/styles/tokens.css", "utf8");
const polish = readFileSync("src/styles/polish.css", "utf8");
for (const token of [
  "--weather-normal-bg",
  "--weather-rain-bg",
  "--weather-heat-bg",
  "--weather-storm-bg",
  "--weather-alert-bg",
  "--weather-stale-bg",
  "--weather-unavailable-bg",
]) {
  assert.match(tokens, new RegExp(token), `${token} missing`);
}
for (const token of [
  "--weather-card-primary-text",
  "--weather-card-secondary-text",
  "--weather-card-light-text",
  "--weather-card-light-muted-text",
  "--weather-card-dark-bg",
  "--weather-card-dark-bg-2",
  "--weather-card-dark-surface",
  "--weather-card-dark-surface-strong",
  "--weather-card-dark-text",
  "--weather-card-dark-muted-text",
  "--weather-card-dark-soft-text",
  "--weather-card-dark-border",
  "--weather-card-dark-chip-bg",
  "--weather-card-dark-chip-border",
]) {
  assert.match(tokens, new RegExp(token), `${token} missing`);
}
assert.match(
  tokens,
  /--weather-card-light-text:\s*#fff;/,
  "Inline illustrated weather cards should use maximum-luminance white for primary text."
);
assert.match(
  tokens,
  /--weather-card-light-muted-text:\s*rgba\(255,\s*255,\s*255,\s*0\.94\);/,
  "Inline illustrated weather cards should keep secondary text close to white for small-copy contrast."
);
assert.match(
  polish,
  /\.event-weather-signal\s*\{[\s\S]*color:\s*var\(--weather-card-light-text\)/,
  "Inline event-card weather should use light text over illustrated weather art."
);
assert.match(
  polish,
  /\.event-weather-signal::before\s*\{[\s\S]*rgba\(4,\s*12,\s*22,\s*0\.98\)[\s\S]*rgba\(4,\s*12,\s*22,\s*0\.9\)/,
  "Inline event-card weather should use a strong dark scrim behind text for contrast."
);
assert.match(
  polish,
  /\.weather-atmosphere-scene\s*\{[\s\S]*aspect-ratio:\s*320 \/ 128/,
  "Scene artwork should keep the authored 320:128 atmosphere frame."
);
assert.match(
  polish,
  /\.weather-icon-button\s*\{[\s\S]*contain:\s*paint[\s\S]*overflow:\s*hidden/,
  "Compact weather button shells should clip the scene layer without forcing the whole pill to the scene aspect ratio."
);
assert.match(
  polish,
  /\.event-weather-signal\s*\{[\s\S]*contain:\s*paint[\s\S]*overflow:\s*hidden/,
  "Inline weather signal shells should clip the scene layer without forcing the whole box to the scene aspect ratio."
);
assert.match(
  polish,
  /\.event-weather-signal__copy > span\s*\{[\s\S]*color:\s*var\(--weather-card-light-muted-text\)/,
  "Inline event-card weather metric text should use light secondary text over the scrim."
);
assert.match(
  polish,
  /\.event-weather-signal \.weather-freshness-line\s*\{[\s\S]*color:\s*var\(--weather-card-light-muted-text\)/,
  "Freshness copy inside inline illustrated weather cards should stay readable over the artwork."
);
assert.match(
  polish,
  /\.event-weather-signal::after\s*\{[\s\S]*background:\s*rgba\(5,\s*12,\s*24,\s*0\.34\)/,
  "Inline event-card weather should lock artwork behind text with a dark overlay."
);
assert.match(
  polish,
  /\.weather-page-dark-card,\n\.weather-atmosphere,\n\.weather-current-orb,\n\.weather-day-arc,\n\.weather-risk-constellation,\n\.weather-area-card,\n\.weather-chapter-card\s*\{[\s\S]*color:\s*var\(--weather-card-dark-text\)/,
  "Dark weather page cards should share high-contrast text color."
);
assert.match(
  polish,
  /\.weather-atmosphere,\n\.weather-story-stage,\n\.weather-page-section\s*\{[\s\S]*width:\s*min\(78rem,\s*100%\)/,
  "Weather page sections should size against the padded app shell, not 100vw, to avoid desktop horizontal overflow."
);
assert.doesNotMatch(
  polish,
  /\.weather-atmosphere,\n\.weather-story-stage,\n\.weather-page-section\s*\{[\s\S]*100vw/,
  "Weather page section containers must not use viewport width inside the padded app shell."
);
assert.match(
  polish,
  /\.weather-page-dark-card::after,\n\.weather-atmosphere::after,\n\.weather-current-orb::after,\n\.weather-day-arc::after,\n\.weather-risk-constellation::after,\n\.weather-area-card::after,\n\.weather-chapter-card::after\s*\{[\s\S]*background:\s*rgba\(5,\s*12,\s*24,\s*0\.34\)/,
  "Dark weather page cards should use a dark contrast overlay behind copy."
);
assert.match(
  polish,
  /\.weather-popover,\n\.forecast-timeline,\n\.weather-window-card,\n\.weather-story-strip,\n\.storm-mode-banner,\n\.storm-mode-suppression,\n\.forecast-compare,\n\.resort-weather-personality,\n\.route-weather-impact,\n\.plan-weather-panel\s*\{[\s\S]*background:[\s\S]*var\(--weather-card-dark-bg\)/,
  "Reusable weather modules should render as dark high-contrast information cards."
);
assert.match(
  polish,
  /\.weather-popover p,\n\.weather-window-card p,\n\.weather-story-strip p,\n\.forecast-timeline__row p,\n\.resort-weather-personality p,\n\.route-weather-impact p,\n\.plan-weather-panel p\s*\{[\s\S]*color:\s*var\(--weather-card-dark-muted-text\)/,
  "Reusable weather module body copy should use high-contrast muted text instead of low-opacity gray."
);
assert.match(
  polish,
  /\.weather-current-orb \.weather-precip-map figcaption,\n\.weather-chapter-card \.weather-precip-map figcaption,\n\.weather-popover \.weather-precip-map figcaption\s*\{[\s\S]*color:\s*var\(--weather-card-dark-muted-text\)/,
  "Weather map captions inside dark cards should remain readable."
);
assert.match(
  polish,
  /\.weather-hour-chip,\n\.weather-day-chip,\n\.weather-week-cell\s*\{[\s\S]*background:\s*var\(--weather-card-dark-surface\)[\s\S]*color:\s*var\(--weather-card-dark-text\)/,
  "Weather timeline chips should use dark-card backgrounds when inheriting light timestamp text."
);

const stormMode = readFileSync("components/weather/StormModeBanner.tsx", "utf8");
assert.match(stormMode, /role="alert"/);
assert.match(stormMode, /Official/);

const windows = readFileSync("components/weather/WeatherWindowStrip.tsx", "utf8");
assert.match(windows, /WeatherWindowCard/);
assert.match(windows, /deepLinks/);

const story = readFileSync("components/weather/WeatherStoryStrip.tsx", "utf8");
assert.match(story, /chapters/);

const resilience = readFileSync("components/weather/PlanResilienceScore.tsx", "utf8");
assert.match(resilience, /score/);
assert.match(resilience, /improvements/);
assert.doesNotMatch(resilience, /disabled/);

const planWeatherPanel = readFileSync("components/weather/PlanWeatherPanel.tsx", "utf8");
assert.match(planWeatherPanel, /onApplyWeatherNote/);
assert.match(planWeatherPanel, /Add backup/);
assert.doesNotMatch(planWeatherPanel, /disabled/);

console.log("Weather UI contracts passed.");
