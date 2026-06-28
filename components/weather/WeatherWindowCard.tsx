import type { WeatherWindow } from "@/lib/weather/types";

export function WeatherWindowCard({ window }: { window: WeatherWindow }) {
  return (
    <article className="weather-window-card">
      <p className="weather-window-card__chapter">{window.chapterLabel}</p>
      <h3>{window.headline}</h3>
      <p>{window.plainLanguageSummary}</p>
      <div className="weather-window-card__links">
        {window.deepLinks.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </div>
    </article>
  );
}
