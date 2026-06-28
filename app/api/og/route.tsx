import { ImageResponse } from "next/og";

export const runtime = "edge";

const size = {
  width: 1200,
  height: 630,
};
const afterTheParksWordmark = "After the Parks";
const pocketMapMotif = "resort-pocket-map-route";

function clean(value: string | null, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 150) : fallback;
}

function burst(cx: number, cy: number, color: string, scale = 1) {
  const arm = 30 * scale;
  const diagonal = 22 * scale;

  return (
    <g opacity="0.95">
      <path
        d={`M ${cx - arm} ${cy} H ${cx + arm} M ${cx} ${cy - arm} V ${cy + arm}`}
        stroke={color}
        strokeLinecap="round"
        strokeWidth={3 * scale}
      />
      <path
        d={`M ${cx - diagonal} ${cy - diagonal} L ${cx + diagonal} ${cy + diagonal} M ${cx + diagonal} ${cy - diagonal} L ${cx - diagonal} ${cy + diagonal}`}
        stroke={color}
        strokeLinecap="round"
        strokeWidth={2.4 * scale}
      />
    </g>
  );
}

function featureIcon(label: string, left: number, kind: "movie" | "campfire" | "pool") {
  return (
    <div
      key={label}
      style={{
        position: "absolute",
        left,
        top: 426,
        width: 128,
        height: 42,
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: "#061b33",
        fontSize: 17,
        fontWeight: 800,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          display: "flex",
          position: "relative",
          borderRadius: 19,
          background: kind === "campfire" ? "#ffe1a0" : "#d8f6ef",
          border: "2px solid #0b7280",
        }}
      >
        {kind === "movie" && (
          <>
            <div style={{ position: "absolute", left: 10, top: 12, width: 18, height: 12, border: "3px solid #061b33", borderRadius: 3 }} />
            <div style={{ position: "absolute", left: 13, top: 26, width: 12, height: 3, background: "#061b33", borderRadius: 2 }} />
          </>
        )}
        {kind === "campfire" && (
          <>
            <div style={{ position: "absolute", left: 12, top: 19, width: 17, height: 11, background: "#8a4f2a", borderRadius: 6 }} />
            <div style={{ position: "absolute", left: 15, top: 8, width: 10, height: 18, background: "#f6be3f", borderRadius: 8 }} />
            <div style={{ position: "absolute", left: 18, top: 12, width: 7, height: 14, background: "#ff7b45", borderRadius: 8 }} />
          </>
        )}
        {kind === "pool" && (
          <>
            <div style={{ position: "absolute", left: 8, top: 14, width: 22, height: 5, background: "#087b86", borderRadius: 5 }} />
            <div style={{ position: "absolute", left: 11, top: 23, width: 22, height: 5, background: "#f6be3f", borderRadius: 5 }} />
          </>
        )}
      </div>
      <span>{label}</span>
    </div>
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const summary = clean(
    searchParams.get("summary"),
    "Movies under the stars, campfires, pool breaks, resort activities, and no-park-day ideas in one beautiful guide."
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #030c1d 0%, #052b43 52%, #f09f32 100%)",
          color: "#ffffff",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -170,
            top: -170,
            width: 650,
            height: 650,
            borderRadius: 325,
            background: "#031022",
            opacity: 0.84,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -126,
            top: -205,
            width: 680,
            height: 680,
            borderRadius: 340,
            background: "#f8c75a",
            opacity: 0.34,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -130,
            bottom: -170,
            width: 760,
            height: 520,
            borderRadius: 380,
            background: "#78e7dd",
            opacity: 0.2,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -180,
            bottom: -150,
            width: 890,
            height: 310,
            borderRadius: 445,
            background: "#f2b744",
            opacity: 0.54,
          }}
        />

        <svg
          aria-label={pocketMapMotif}
          width="1200"
          height="630"
          viewBox="0 0 1200 630"
          style={{ position: "absolute", inset: 0 }}
        >
          {burst(878, 92, "#ffffff")}
          {burst(970, 86, "#f6be3f")}
          {burst(1064, 138, "#6fe5e7")}
          {([
            [84, 88, 6, "#f6be3f"],
            [208, 124, 4, "#ffffff"],
            [333, 82, 5, "#6fe5e7"],
            [448, 154, 4, "#ffffff"],
            [504, 93, 5, "#f6be3f"],
            [1132, 84, 4, "#ffffff"],
            [1144, 202, 5, "#f6be3f"],
            [724, 82, 4, "#ffffff"],
            [414, 226, 5, "#fff3b0"],
          ] satisfies Array<[number, number, number, string]>).map(([x, y, r, fill]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={fill} opacity="0.95" />
          ))}
        </svg>

        <div
          style={{
            position: "absolute",
            left: 548,
            top: 100,
            width: 548,
            height: 394,
            display: "flex",
            borderRadius: 38,
            background: "#fff6df",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 565,
            top: 126,
            width: 548,
            height: 394,
            display: "flex",
            borderRadius: 38,
            background: "#021024",
            opacity: 0.22,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 548,
            top: 100,
            width: 548,
            height: 394,
            display: "flex",
            borderRadius: 38,
            background: "#fff6df",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 593,
            top: 164,
            width: 460,
            height: 244,
            display: "flex",
            overflow: "hidden",
            borderRadius: 28,
            background: "#bdf4ec",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              width: "100%",
              height: 94,
              background: "#57c9ba",
              opacity: 0.4,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 55,
              top: 30,
              width: 96,
              height: 96,
              borderRadius: 48,
              background: "#f5c85a",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 205,
              top: 52,
              width: 56,
              height: 112,
              borderRadius: 10,
              background: "#123c60",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 271,
              top: 8,
              width: 94,
              height: 156,
              borderRadius: 14,
              background: "#071d3a",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 375,
              top: 74,
              width: 50,
              height: 90,
              borderRadius: 10,
              background: "#18516d",
            }}
          />
          {([
            [223, 74],
            [242, 102],
            [294, 36],
            [329, 68],
            [393, 96],
          ] satisfies Array<[number, number]>).map(([x, y]) => (
            <div
              key={`${x}-${y}`}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: 11,
                height: 13,
                borderRadius: 3,
                background: "#ffd875",
              }}
            />
          ))}
        </div>

        <svg
          width="1200"
          height="630"
          viewBox="0 0 1200 630"
          style={{ position: "absolute", inset: 0 }}
        >
          <path
            d="M 652 392 C 720 363 771 350 837 384 C 875 404 904 318 932 314 C 959 312 989 339 1022 346"
            fill="none"
            opacity="0.7"
            stroke="#fff3b0"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="15"
          />
          <path
            d="M 652 392 C 720 363 771 350 837 384 C 875 404 904 318 932 314 C 959 312 989 339 1022 346"
            fill="none"
            stroke="#087b86"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="8"
          />
          <path
            d="M 652 392 C 720 363 771 350 837 384 C 875 404 904 318 932 314 C 959 312 989 339 1022 346"
            fill="none"
            stroke="#f6be3f"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
        </svg>

        {([
          [652, 392, "#071d3a"],
          [759, 362, "#071d3a"],
          [841, 382, "#f6be3f"],
          [916, 318, "#071d3a"],
          [1012, 346, "#071d3a"],
        ] satisfies Array<[number, number, string]>).map(([x, y, fill]) => (
          <div key={`${x}-${y}`} style={{ position: "absolute", left: x - 18, top: y - 18, width: 36, height: 36, display: "flex", borderRadius: 18, background: "#fff8e7" }}>
            <div style={{ position: "absolute", left: 8, top: 8, width: 20, height: 20, borderRadius: 10, background: fill }} />
          </div>
        ))}

        {featureIcon("Movies", 620, "movie")}
        {featureIcon("Campfires", 765, "campfire")}
        {featureIcon("Pool breaks", 926, "pool")}

        <div
          style={{
            position: "absolute",
            left: 72,
            top: 80,
            width: 610,
            display: "flex",
            fontSize: 61,
            lineHeight: 1,
            fontWeight: 800,
            letterSpacing: 0,
            whiteSpace: "nowrap",
          }}
        >
          {afterTheParksWordmark}
        </div>
        <div
          style={{
            position: "absolute",
            left: 72,
            top: 178,
            width: 465,
            display: "flex",
            color: "#ffe9af",
            fontSize: 34,
            lineHeight: "42px",
            fontWeight: 700,
          }}
        >
          Find the magic waiting back at your resort.
        </div>
        <div
          style={{
            position: "absolute",
            left: 72,
            top: 304,
            width: 465,
            display: "flex",
            color: "#d9f8f6",
            fontSize: 24,
            lineHeight: "32px",
            fontWeight: 500,
          }}
        >
          {summary}
        </div>

        {([
          ["Tonight", 72, 116],
          ["Resorts", 206, 118],
          ["No-park days", 342, 174],
        ] satisfies Array<[string, number, number]>).map(([label, left, width]) => (
          <div
            key={label}
            style={{
              position: "absolute",
              left,
              top: 484,
              width,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 24,
              background: "rgba(255,255,255,0.15)",
              color: "#ffffff",
              fontSize: 18,
              fontWeight: 800,
            }}
          >
            {label}
          </div>
        ))}

        <div
          style={{
            position: "absolute",
            left: 72,
            top: 560,
            display: "flex",
            color: "#6fe5e7",
            fontSize: 25,
            fontWeight: 800,
          }}
        >
          aftertheparks.com
        </div>
        <div
          style={{
            position: "absolute",
            right: 88,
            bottom: 42,
            width: 420,
            display: "flex",
            color: "#061b33",
            fontSize: 22,
            lineHeight: "28px",
            fontWeight: 800,
            textAlign: "right",
          }}
        >
          Independent Walt Disney World resort planning guide
        </div>
      </div>
    ),
    size
  );
}
