import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a8f9e, #0b1220)",
          borderRadius: 96,
        }}
      >
        <div
          style={{
            fontSize: 200,
            color: "#ffe8a3",
            fontWeight: 700,
          }}
        >
          AP
        </div>
      </div>
    ),
    { ...size }
  );
}
