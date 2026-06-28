import type { WeatherAlert } from "@/lib/weather/types";

function isUrgent(alert: WeatherAlert): boolean {
  return alert.severity === "Severe" || alert.severity === "Extreme";
}

export function NwsAlertBanner({ alerts }: { alerts: WeatherAlert[] }) {
  if (alerts.length === 0) return null;
  const urgent = alerts.some(isUrgent);
  return (
    <section className="nws-alert-banner" role={urgent ? "alert" : "status"}>
      <p className="nws-alert-banner__eyebrow">Official NWS alert</p>
      {alerts.map((alert) => (
        <article key={alert.id}>
          <h2>{alert.event}</h2>
          <p>{alert.headline}</p>
          {alert.instruction && <p>{alert.instruction}</p>}
        </article>
      ))}
    </section>
  );
}
