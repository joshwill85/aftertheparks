import Link from "next/link";
import type { CSSProperties } from "react";
import {
  buildNightfallTimeline,
  type NightfallTimelineStatus,
} from "@/lib/visualizations/nightfallTimeline";
import type {
  ActivityOccurrence,
  MovieNightOccurrence,
} from "@/lib/types/occurrence";

const STATUS_LABELS: Record<NightfallTimelineStatus, string> = {
  happening_now: "Happening now",
  next_showing: "Next showing",
  later_tonight: "Later tonight",
  last_call: "Last call",
};

export function NightfallTimeline({
  activities,
  movieNights,
}: {
  activities: ActivityOccurrence[];
  movieNights: MovieNightOccurrence[];
}) {
  const timeline = buildNightfallTimeline({
    activities,
    movies: movieNights,
  });

  if (timeline.items.length === 0) return null;

  return (
    <section
      className="nightfall-timeline"
      aria-labelledby="nightfall-timeline-heading"
      aria-describedby="nightfall-timeline-summary"
    >
      <div className="nightfall-timeline__header">
        <div>
          <p className="nightfall-timeline__eyebrow">Nightfall Timeline</p>
          <h2 id="nightfall-timeline-heading">Plan tonight from dinner to starlight</h2>
        </div>
        <p id="nightfall-timeline-summary">{timeline.summary}</p>
      </div>

      <div className="nightfall-timeline__axis" role="img" aria-label={timeline.ariaLabel}>
        <svg
          className="wow-starlight-firefly-route-map"
          data-wow-moment="starlight_firefly_route_map"
          viewBox="0 0 100 24"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            className="wow-firefly-route__trail"
            d="M 4 12 C 22 2, 34 22, 50 12 S 78 2, 96 12"
            pathLength="100"
          />
          <path
            className="wow-firefly-route__glow"
            d="M 4 12 C 22 2, 34 22, 50 12 S 78 2, 96 12"
            pathLength="100"
          />
        </svg>
        <div className="nightfall-timeline__rail" aria-hidden />
        <span
          className="hidden-resort-magic hrm-firefly-pause"
          data-hidden-detail="starlight_firefly_pause"
          aria-hidden
        />
        <div className="nightfall-timeline__ticks" aria-hidden>
          <span>5 PM</span>
          <span>7 PM</span>
          <span>9 PM</span>
          <span>11 PM</span>
        </div>
        <ol className="nightfall-timeline__stops">
          {timeline.items.map((item) => (
            <li
              key={item.id}
              className={`nightfall-stop nightfall-stop--${item.status} nightfall-stop--${item.kind}`}
              style={{ "--stop-position": `${item.positionPct}%` } as CSSProperties}
            >
              <Link href={item.href ?? "/tonight"} className="nightfall-stop__link">
                <span className="nightfall-stop__time">{item.timeLabel}</span>
                <span className="nightfall-stop__dot" aria-hidden />
                <span className="nightfall-stop__body">
                  <span className="nightfall-stop__status">
                    {STATUS_LABELS[item.status]}
                  </span>
                  <span className="nightfall-stop__title">{item.title}</span>
                  <span className="nightfall-stop__meta">
                    {item.resortName} · {item.categoryLabel}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>

      <p className="nightfall-timeline__note">
        Times can change. Check the resort guide before you go.
      </p>
      <span className="sr-only">
        Timeline window runs from 5:00 PM to 11:00 PM.
      </span>
    </section>
  );
}
