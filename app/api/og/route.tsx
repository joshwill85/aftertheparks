import { ImageResponse } from "next/og";

export const runtime = "edge";

const size = {
  width: 1200,
  height: 630,
};

function clean(value: string | null, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 120) : fallback;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = clean(searchParams.get("title"), "After the Parks");
  const eyebrow = clean(searchParams.get("eyebrow"), "Walt Disney World resort activities");
  const summary = clean(
    searchParams.get("summary"),
    "Current resort activities, calendars, source caveats, and no-park-day planning."
  );
  const afterTheParksWordmark = (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        color: "#0B2340",
        fontFamily: "Georgia, serif",
        fontSize: 42,
        fontWeight: 700,
      }}
    >
      <span>After</span>
      <span style={{ fontStyle: "italic", fontSize: 26 }}>the</span>
      <span>Parks</span>
    </div>
  );
  const pocketMapMotif = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: "#E9AD2E",
        fontSize: 26,
        fontWeight: 900,
      }}
    >
      <span>✦</span>
      <span style={{ letterSpacing: 8 }}>•••</span>
      <span>✦</span>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#f7f2e8",
          color: "#21343a",
          fontFamily: "Arial, Helvetica, sans-serif",
          border: "18px solid #16a6b6",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 0,
            color: "#0b6f7a",
          }}
        >
          <span>{eyebrow}</span>
          {afterTheParksWordmark}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 76,
              lineHeight: 1.04,
              fontWeight: 800,
              maxWidth: 980,
              letterSpacing: 0,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 32,
              lineHeight: 1.3,
              maxWidth: 900,
              color: "#4f6268",
            }}
          >
            {summary}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            fontSize: 26,
            fontWeight: 700,
            color: "#21343a",
          }}
        >
          <div style={{ display: "flex", gap: 18 }}>
            <span>Today</span>
            <span>Tonight</span>
            <span>Resorts</span>
            <span>Guides</span>
          </div>
          {pocketMapMotif}
        </div>
      </div>
    ),
    size
  );
}
