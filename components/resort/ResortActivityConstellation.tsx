import Link from "next/link";
import type { CSSProperties } from "react";
import { IconGlyph } from "@/components/icons/IconGlyph";
import {
  buildResortActivityConstellation,
  type ResortConstellationNode,
} from "@/lib/visualizations/resortConstellation";
import type { ActivityOccurrence, Daypart } from "@/lib/types/occurrence";

const ORBIT_RADIUS = {
  morning: 18,
  afternoon: 31,
  evening: 44,
  late: 57,
  anytime: 70,
} satisfies Record<Daypart, number>;

type ConstellationStyle = CSSProperties & Record<`--${string}`, string | number>;

function categoryHref({
  resortSlug,
  daypart,
  category,
}: {
  resortSlug: string;
  daypart: Daypart;
  category: string;
}) {
  const params = new URLSearchParams({ resort: resortSlug, category });
  if (daypart !== "anytime") params.set("daypart", daypart);
  return `/activities?${params.toString()}`;
}

function nodeClassName(node: ResortConstellationNode) {
  return `resort-constellation-node resort-constellation-node--${node.size}`;
}

function nodeStyle(orbitKey: Daypart, angle: number): ConstellationStyle {
  const radians = (angle * Math.PI) / 180;
  const radius = ORBIT_RADIUS[orbitKey] / 2;
  return {
    "--node-angle": `${angle}deg`,
    left: `${50 + Math.cos(radians) * radius}%`,
    top: `${50 + Math.sin(radians) * radius}%`,
  };
}

export function ResortActivityConstellation({
  activities,
  resortSlug,
  resortName,
}: {
  activities: ActivityOccurrence[];
  resortSlug: string;
  resortName: string;
}) {
  const constellation = buildResortActivityConstellation(activities);

  if (constellation.total === 0) return null;

  return (
    <section
      className="resort-constellation"
      aria-labelledby="resort-constellation-heading"
    >
      <div className="resort-constellation__copy">
        <p className="resort-constellation__eyebrow">Activity Constellation</p>
        <h2 id="resort-constellation-heading">
          The shape of {resortName}, before you read every card
        </h2>
        <p>{constellation.summary}</p>
        <div className="resort-constellation__stats" aria-label="Constellation summary">
          <span>
            <strong>{constellation.total}</strong>
            activities
          </span>
          <span>
            <strong>{constellation.costMix.free}</strong>
            free
          </span>
          <span>
            <strong>{constellation.costMix.paid}</strong>
            paid
          </span>
          <span>
            <strong>{constellation.costMix.unknown}</strong>
            price unclear
          </span>
        </div>
      </div>

      <div className="resort-constellation__visual">
        <div
          className="resort-constellation__sky"
          role="img"
          aria-label={constellation.ariaLabel}
        >
          {constellation.orbits.map((orbit) => (
            <div
              key={orbit.key}
              className="resort-constellation__orbit"
              style={
                {
                  "--orbit-size": `${ORBIT_RADIUS[orbit.key]}%`,
                  "--orbit-opacity": Math.max(0.18, orbit.intensity),
                } as ConstellationStyle
              }
              aria-hidden="true"
            >
              <span>{orbit.shortLabel}</span>
            </div>
          ))}

          {constellation.orbits.flatMap((orbit) =>
            orbit.nodes.map((node) => (
              <Link
                key={`${orbit.key}-${node.category}`}
                href={categoryHref({
                  resortSlug,
                  daypart: orbit.key,
                  category: node.category,
                })}
                className={nodeClassName(node)}
                style={nodeStyle(orbit.key, node.angle)}
                aria-label={`${orbit.label}: ${node.count} ${
                  node.count === 1 ? "activity" : "activities"
                } in ${node.label}`}
              >
                <IconGlyph iconKey={node.iconKey} decorative />
                <span>{node.count}</span>
              </Link>
            ))
          )}
        </div>

        <div className="resort-constellation__legend" aria-hidden="true">
          {constellation.orbits
            .filter((orbit) => orbit.count > 0)
            .map((orbit) => (
              <span key={orbit.key}>
                {orbit.label}
                <strong>{orbit.count}</strong>
              </span>
            ))}
        </div>
      </div>
    </section>
  );
}
