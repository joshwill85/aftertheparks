import type { WeatherWindow } from "@/lib/weather/types";
import { WeatherWindowCard } from "@/components/weather/WeatherWindowCard";

export function WeatherWindowStrip({ windows }: { windows: WeatherWindow[] }) {
  if (windows.length === 0) return null;
  return (
    <section className="weather-window-strip">
      {windows.map((window) => (
        <div key={window.id} className="weather-window-strip__item">
          <WeatherWindowCard window={window} />
          <nav className="sr-only" aria-label={`${window.title} actions`}>
            {window.deepLinks.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      ))}
    </section>
  );
}
