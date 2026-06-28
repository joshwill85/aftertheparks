"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import type { WeatherIconKey } from "@/lib/weather/types";
import { cn } from "@/lib/utils";

interface ScenePalette {
  top: string;
  bottom: string;
  accent: string;
  wash: "normal" | "strong" | "dark";
}

const PALETTES: Record<WeatherIconKey, ScenePalette> = {
  sunny_day: { top: "#FFE8A3", bottom: "#FFF8E1", accent: "#FFB22E", wash: "normal" },
  clear_night: { top: "#263A73", bottom: "#121A3C", accent: "#F8D66D", wash: "dark" },
  partly_cloudy_day: { top: "#BDEBFF", bottom: "#FFF3BF", accent: "#FFC44D", wash: "normal" },
  partly_cloudy_night: { top: "#29396D", bottom: "#162142", accent: "#D8C5FF", wash: "dark" },
  cloudy: { top: "#DDF4FF", bottom: "#EFF8FF", accent: "#7AB8D6", wash: "normal" },
  overcast: { top: "#B9C6D5", bottom: "#E4E8ED", accent: "#65768A", wash: "strong" },
  mist: { top: "#D7F0EE", bottom: "#F6FCFA", accent: "#7BBAB2", wash: "strong" },
  fog: { top: "#CFD7DF", bottom: "#F7F4EF", accent: "#8D99A6", wash: "strong" },
  haze: { top: "#FFD89C", bottom: "#F5E5C8", accent: "#D49353", wash: "strong" },
  smoke: { top: "#D3D0C9", bottom: "#F2EEE6", accent: "#6F6B68", wash: "strong" },
  dust: { top: "#EFCB8B", bottom: "#FFF1CF", accent: "#B97836", wash: "strong" },
  patchy_rain: { top: "#CAE9F7", bottom: "#F6FBFF", accent: "#4386C6", wash: "normal" },
  light_rain: { top: "#BBDFF5", bottom: "#F4FAFF", accent: "#2E83C5", wash: "normal" },
  moderate_rain: { top: "#A7CBE3", bottom: "#E9F6FF", accent: "#166DB0", wash: "normal" },
  heavy_rain: { top: "#7499B9", bottom: "#D7ECFA", accent: "#075A9A", wash: "normal" },
  rain_shower: { top: "#B8E9FF", bottom: "#FFF4C7", accent: "#2B8ED8", wash: "normal" },
  torrential_rain: { top: "#526C90", bottom: "#C4DCEF", accent: "#043D78", wash: "dark" },
  drizzle: { top: "#D7EEF9", bottom: "#FAFDFF", accent: "#6BAED8", wash: "normal" },
  freezing_drizzle: { top: "#D7F7FF", bottom: "#F9FEFF", accent: "#5FB6D6", wash: "normal" },
  freezing_rain: { top: "#C3EFFF", bottom: "#F2FCFF", accent: "#2E90C5", wash: "normal" },
  thunder_possible: { top: "#A7B2D6", bottom: "#F0EEFF", accent: "#F6C945", wash: "dark" },
  rain_with_thunder: { top: "#6F7FA9", bottom: "#DDE8FF", accent: "#FFD34F", wash: "dark" },
  snow: { top: "#DFF6FF", bottom: "#FFFFFF", accent: "#73B9DE", wash: "normal" },
  sleet: { top: "#CDEBFA", bottom: "#F8FDFF", accent: "#6AA6C8", wash: "normal" },
  ice_pellets: { top: "#CFF4FF", bottom: "#F9FEFF", accent: "#5DAFD3", wash: "normal" },
  wind: { top: "#D7F4F3", bottom: "#FFF7DF", accent: "#39A69B", wash: "normal" },
  heat: { top: "#FFB36B", bottom: "#FFE7B3", accent: "#E45D2B", wash: "normal" },
  official_alert: { top: "#FFD7D0", bottom: "#FFF4D9", accent: "#D9362B", wash: "normal" },
  unknown: { top: "#D8D9FF", bottom: "#FFF7E9", accent: "#7B63C7", wash: "strong" },
};

function washStops(wash: ScenePalette["wash"]) {
  if (wash === "dark") return [0.16, 0.1, 0.04];
  if (wash === "strong") return [0.5, 0.31, 0.12];
  return [0.34, 0.2, 0.06];
}

function cloud(
  x: number,
  y: number,
  scale: number,
  fill: string,
  stroke: string,
  opacity: number
) {
  return (
    <path
      opacity={opacity}
      d={`M${x} ${y + 42 * scale}h${92 * scale}c${21 * scale} 0 ${
        35 * scale
      }-${11 * scale} ${35 * scale}-${27 * scale} 0-${17 * scale}-${
        15 * scale
      }-${29 * scale}-${34 * scale}-${26 * scale}-${10 * scale}-${
        23 * scale
      }-${44 * scale}-${28 * scale}-${61 * scale}-${9 * scale}-${
        20 * scale
      }-${5 * scale}-${38 * scale} ${9 * scale}-${38 * scale} ${30 * scale} 0 ${
        13 * scale
      } ${5 * scale} ${23 * scale} ${6 * scale} ${32 * scale}Z`}
      fill={fill}
      stroke={stroke}
      strokeWidth={2.4 * scale}
      strokeLinejoin="round"
    />
  );
}

function simpleCloud(
  x: number,
  y: number,
  scale: number,
  fill: string,
  stroke: string,
  opacity: number
) {
  return (
    <path
      opacity={opacity}
      d={`M${x} ${y + 30 * scale}h${78 * scale}c${14 * scale} 0 ${
        25 * scale
      }-${8 * scale} ${25 * scale}-${20 * scale}s-${10 * scale}-${
        20 * scale
      }-${24 * scale}-${20 * scale}c-${8 * scale}-${18 * scale}-${
        33 * scale
      }-${21 * scale}-${46 * scale}-${6 * scale}-${18 * scale}-${
        3 * scale
      }-${32 * scale} ${8 * scale}-${32 * scale} ${24 * scale} 0 ${
        10 * scale
      } ${4 * scale} ${16 * scale} ${1 * scale} ${22 * scale}Z`}
      fill={fill}
      stroke={stroke}
      strokeWidth={2 * scale}
    />
  );
}

function rainLines(kind: "light" | "moderate" | "heavy" | "torrential" | "freezing") {
  const config = {
    light: { count: 8, width: 2.2, length: 24, opacity: 0.48, color: "#2E83C5" },
    moderate: { count: 13, width: 3, length: 34, opacity: 0.56, color: "#166DB0" },
    heavy: { count: 18, width: 4.1, length: 46, opacity: 0.64, color: "#075A9A" },
    torrential: { count: 24, width: 5.2, length: 62, opacity: 0.7, color: "#043D78" },
    freezing: { count: 11, width: 3, length: 34, opacity: 0.55, color: "#2E90C5" },
  }[kind];

  return (
    <g
      stroke={config.color}
      strokeWidth={config.width}
      strokeLinecap="round"
      opacity={config.opacity}
    >
      {Array.from({ length: config.count }, (_, index) => {
        const x = 42 + ((index * 29) % 250);
        const y = 38 + ((index * 17) % 48);
        const length = config.length - (index % 3) * 7;
        return <path key={index} d={`M${x} ${y} l-${Math.round(length * 0.36)} ${length}`} />;
      })}
    </g>
  );
}

function drizzleDots(frozen = false) {
  const color = frozen ? "#5FB6D6" : "#65ADD8";
  return (
    <g fill={color} opacity="0.58">
      {Array.from({ length: 20 }, (_, index) => {
        const x = 40 + ((index * 37) % 245);
        const y = 42 + ((index * 19) % 70);
        return <circle key={index} cx={x} cy={y} r={frozen ? 2.1 : 1.7} />;
      })}
    </g>
  );
}

function splash(color = "#2B86C5", opacity = 0.52) {
  return (
    <g stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" opacity={opacity}>
      <path d="M20 108c16 11 36 11 55 0" />
      <path d="M92 111c20 9 43 7 63-2" />
      <path d="M177 109c20 10 43 9 66-2" />
      <path d="M250 112c15 5 29 4 43-3" />
    </g>
  );
}

function snow(count = 18) {
  return (
    <g stroke="#66BFD9" strokeWidth="1.8" strokeLinecap="round" opacity="0.62">
      {Array.from({ length: count }, (_, index) => {
        const x = 25 + ((index * 43) % 270);
        const y = 26 + ((index * 31) % 82);
        const radius = index % 3 === 0 ? 5 : 3.5;
        return (
          <g key={index}>
            <path d={`M${x} ${y - radius}v${2 * radius}`} />
            <path d={`M${x - radius} ${y}h${2 * radius}`} />
            <path d={`M${x - radius * 0.7} ${y - radius * 0.7}l${1.4 * radius} ${1.4 * radius}`} />
            <path d={`M${x + radius * 0.7} ${y - radius * 0.7}l-${1.4 * radius} ${1.4 * radius}`} />
          </g>
        );
      })}
    </g>
  );
}

function icePellets(count = 13) {
  return (
    <g fill="#A7E8F7" stroke="#428DB3" strokeWidth="1.4" opacity="0.62">
      {Array.from({ length: count }, (_, index) => {
        const x = 35 + ((index * 47) % 250);
        const y = 40 + ((index * 23) % 62);
        return (
          <polygon
            key={index}
            points={`${x},${y - 6} ${x + 6},${y - 2} ${x + 5},${y + 5} ${x - 3},${
              y + 7
            } ${x - 7},${y}`}
          />
        );
      })}
    </g>
  );
}

function sceneArt(iconKey: WeatherIconKey): ReactNode {
  switch (iconKey) {
    case "sunny_day":
      return (
        <>
          <g opacity="0.62">
            <circle cx="244" cy="34" r="37" fill="#FFD45A" stroke="#8F4E13" strokeWidth="4" />
            <g stroke="#D86F1D" strokeWidth="4" strokeLinecap="round">
              <path d="M244 -20v28M244 61v30M190 34h29M269 34h31" />
              <path d="M205 -3l20 20M282 -2l-20 20M205 71l20-20M282 70l-20-20" />
            </g>
          </g>
          <path
            d="M14 112c38-20 76-20 114 0s76 20 114 0 45-14 64-4"
            stroke="#2E8B7C"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
            opacity="0.42"
          />
        </>
      );
    case "clear_night":
      return (
        <>
          {starDots()}
          <path
            opacity="0.72"
            d="M250 10c-42 20-54 66-29 93 22 23 60 23 83 4-18 33-62 45-98 25-42-24-55-75-31-116 18-31 47-45 75-36Z"
            fill="#FFE7A6"
            stroke="#4D3764"
            strokeWidth="4"
          />
          <path
            d="M16 112c34-25 71-30 108-8 32 19 62 18 94-7"
            stroke="#A7C6FF"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            opacity="0.42"
          />
        </>
      );
    case "partly_cloudy_day":
      return (
        <>
          <circle cx="238" cy="30" r="38" fill="#FFD45A" stroke="#8F4E13" strokeWidth="4" opacity="0.55" />
          <g stroke="#DA7625" strokeWidth="4" strokeLinecap="round" opacity="0.42">
            <path d="M238 -22v28M238 64v27M184 30h29M264 30h30M200 -3l18 18M276 -3l-18 18" />
          </g>
          {cloud(100, 44, 1.16, "#FFFFFF", "#2D6B8F", 0.72)}
          <path d="M114 96c40 12 89 10 143-6" stroke="#9DD7EC" strokeWidth="4" strokeLinecap="round" opacity="0.46" />
        </>
      );
    case "partly_cloudy_night":
      return (
        <>
          {starDots()}
          <path
            opacity="0.68"
            d="M244 8c-32 24-35 65-10 89 20 18 51 18 72 2-13 33-49 51-83 39-43-15-63-64-44-102 13-26 38-41 65-28Z"
            fill="#FFE9A8"
            stroke="#59406E"
            strokeWidth="4"
          />
          {cloud(92, 52, 1.12, "#F6FAFF", "#8CB0D8", 0.72)}
          <path d="M108 101c43 9 94 7 153-8" stroke="#CBD7FF" strokeWidth="4" strokeLinecap="round" opacity="0.42" />
        </>
      );
    case "cloudy":
      return (
        <>
          {cloud(92, 26, 1.25, "#FFFFFF", "#437594", 0.76)}
          {simpleCloud(-12, 66, 0.9, "#F7FCFF", "#8EC6D9", 0.38)}
          <path d="M92 88c56 14 117 9 186-12" stroke="#AFDAEB" strokeWidth="5" strokeLinecap="round" opacity="0.48" />
        </>
      );
    case "overcast":
      return (
        <>
          {cloud(54, 10, 1.28, "#DDE5EC", "#53697C", 0.7)}
          {cloud(88, 48, 1.24, "#F4F7FA", "#53697C", 0.72)}
          <path d="M0 96c64-13 147-13 250 1" stroke="#7C8C9B" strokeWidth="5" strokeLinecap="round" opacity="0.42" />
        </>
      );
    case "mist":
      return (
        <>
          {simpleCloud(92, 18, 1.06, "#FFFFFF", "#57948F", 0.44)}
          <g stroke="#7DBBB5" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.52">
            <path d="M-18 58c45-14 81 14 127 0s72-13 115 0 75 9 118-6" />
            <path d="M-8 80c42-11 78 11 118 0s76-12 123 5" />
            <path d="M-22 103c57-9 116 9 178-1s98-9 160 4" />
          </g>
        </>
      );
    case "fog":
      return (
        <>
          <circle cx="82" cy="40" r="26" fill="#FFE6A6" opacity="0.36" />
          {simpleCloud(90, 24, 1.02, "#EEF3F6", "#6F8190", 0.4)}
          <g stroke="#7C8A98" strokeWidth="6" strokeLinecap="round" opacity="0.64">
            <path d="M-12 66h264M24 84h248M-4 104h204" />
            <path d="M218 104c20-10 39-10 58 0" stroke="#BAC3CC" strokeWidth="4" />
          </g>
        </>
      );
    case "haze":
      return (
        <>
          <circle cx="242" cy="36" r="42" fill="#FFD260" stroke="#A95F24" strokeWidth="4" opacity="0.45" />
          <g stroke="#B78158" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.5">
            <path d="M-4 70c39-15 76 13 116 0s75-14 116 1 69 12 99-3" />
            <path d="M-2 92c49-10 90 11 139 0s92-9 174 5" />
            <path d="M20 112h245" />
          </g>
        </>
      );
    case "smoke":
      return (
        <>
          <g stroke="#6E6C6B" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.52">
            <path d="M72 120c-40-40 26-54-6-88-18-19-4-42 30-56" />
            <path d="M142 120c-34-38 36-53 3-88-28-30 5-55 42-74" />
            <path d="M216 120c-30-34 34-48 4-82-22-26 6-44 40-58" />
          </g>
          <path d="M32 103c42 29 156 34 230 0" stroke="#B0AAA3" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.48" />
        </>
      );
    case "dust":
      return (
        <>
          <path
            d="M54 75c36-55 145-68 209-17 42 34 24 76-39 91-70 16-148-7-181-48"
            stroke="#B97836"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
            opacity="0.54"
          />
          <path d="M72 100c52-25 125-22 174 7" stroke="#D79B50" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.46" />
          <g fill="#9D602D" opacity="0.5">
            <circle cx="60" cy="38" r="5" />
            <circle cx="235" cy="27" r="4" />
            <circle cx="186" cy="110" r="4" />
            <circle cx="282" cy="73" r="3" />
          </g>
        </>
      );
    case "patchy_rain":
      return (
        <>
          <circle cx="246" cy="32" r="30" fill="#FFD763" stroke="#B56A1E" strokeWidth="4" opacity="0.44" />
          {simpleCloud(70, 34, 1.08, "#FFFFFF", "#3F789D", 0.74)}
          <g stroke="#2D87D2" strokeWidth="3.2" strokeLinecap="round" opacity="0.58">
            <path d="M86 82l-14 28M128 80l-12 25M172 84l-11 22" />
          </g>
          <path d="M196 104c31-16 63-15 94 4" stroke="#E6B75C" strokeWidth="4" strokeLinecap="round" opacity="0.38" fill="none" />
        </>
      );
    case "light_rain":
      return (
        <>
          {cloud(80, 18, 1.18, "#FFFFFF", "#39759A", 0.7)}
          {rainLines("light")}
          <path d="M108 82c26-24 76-23 103 1" stroke="#6DB6DE" strokeWidth="4" strokeLinecap="round" opacity="0.44" fill="none" />
          {splash("#99CBE9", 0.38)}
        </>
      );
    case "moderate_rain":
      return (
        <>
          {cloud(64, 14, 1.26, "#F8FCFF", "#2E668C", 0.72)}
          {rainLines("moderate")}
          {splash("#5EA6D7", 0.48)}
        </>
      );
    case "heavy_rain":
      return (
        <>
          {cloud(46, 8, 1.36, "#ECF7FF", "#245577", 0.78)}
          <rect x="0" y="34" width="320" height="94" fill="#075A9A" opacity="0.08" />
          {rainLines("heavy")}
          {splash("#2B86C5", 0.62)}
          <g fill="#2B86C5" opacity="0.48">
            <circle cx="82" cy="105" r="4" />
            <circle cx="200" cy="108" r="3.4" />
            <circle cx="260" cy="98" r="3" />
          </g>
        </>
      );
    case "rain_shower":
      return (
        <>
          <path d="M58 28c52-44 142-44 194 2" stroke="#F6B742" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.4" />
          <path d="M78 30c42-26 116-25 158 1" stroke="#62C98D" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.35" />
          {cloud(96, 34, 1.15, "#FFFFFF", "#347899", 0.72)}
          <g stroke="#2B8ED8" strokeWidth="3.4" strokeLinecap="round" opacity="0.58">
            <path d="M134 84l-15 28M178 82l-15 27M226 78l-13 24" />
          </g>
          {splash("#7DCAF0", 0.42)}
        </>
      );
    case "torrential_rain":
      return (
        <>
          {cloud(32, 4, 1.42, "#E8F4FF", "#1E4569", 0.82)}
          <rect x="0" y="27" width="320" height="101" fill="#043D78" opacity="0.15" />
          {rainLines("torrential")}
          {splash("#155F9E", 0.74)}
          <path d="M14 113h248" stroke="#9EC8E3" strokeWidth="4" strokeLinecap="round" opacity="0.38" />
        </>
      );
    case "drizzle":
      return (
        <>
          {simpleCloud(84, 24, 1.16, "#FFFFFF", "#6096B5", 0.64)}
          {drizzleDots()}
          <path d="M70 112c48 5 104 5 168 0" stroke="#B6DFEF" strokeWidth="4" strokeLinecap="round" opacity="0.42" />
        </>
      );
    case "freezing_drizzle":
      return (
        <>
          {simpleCloud(82, 22, 1.16, "#FFFFFF", "#5C91AA", 0.64)}
          {drizzleDots(true)}
          <g stroke="#8BD7EC" strokeWidth="2.4" strokeLinecap="round" opacity="0.58">
            <path d="M58 103l10 10M68 103l-10 10M140 98v20M130 108h20M250 103l10 10M260 103l-10 10" />
          </g>
        </>
      );
    case "freezing_rain":
      return (
        <>
          {cloud(58, 16, 1.26, "#FFFFFF", "#477B99", 0.7)}
          {rainLines("freezing")}
          <path d="M36 104h238" stroke="#9BE3F7" strokeWidth="6" strokeLinecap="round" opacity="0.58" />
          <g stroke="#66BFD9" strokeWidth="3" strokeLinecap="round" opacity="0.54">
            <path d="M76 95l-12 30M148 95l-12 30M218 95l-12 30" />
          </g>
        </>
      );
    case "thunder_possible":
      return (
        <>
          {cloud(58, 14, 1.28, "#F8FAFF", "#4B5D87", 0.76)}
          <path d="M206 46l-42 73h42l-18 47 68-84h-43l25-36Z" fill="#FFD957" stroke="#7E4A15" strokeWidth="4" strokeLinejoin="round" opacity="0.64" />
          <path d="M28 102c30-12 60-11 92 0" stroke="#8998C8" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.38" />
        </>
      );
    case "rain_with_thunder":
      return (
        <>
          {cloud(40, 8, 1.34, "#EEF5FF", "#33486F", 0.8)}
          <path d="M188 40l-42 72h40l-17 45 70-84h-42l24-33Z" fill="#FFD957" stroke="#6A3F16" strokeWidth="4" strokeLinejoin="round" opacity="0.72" />
          {rainLines("heavy")}
          {splash("#3B8ECB", 0.58)}
        </>
      );
    case "snow":
      return (
        <>
          {cloud(68, 16, 1.22, "#FFFFFF", "#527F9A", 0.68)}
          {snow(22)}
          <path d="M32 112c62 10 139 9 230-4" stroke="#BCE8F5" strokeWidth="5" strokeLinecap="round" opacity="0.48" />
        </>
      );
    case "sleet":
      return (
        <>
          {cloud(64, 14, 1.22, "#FFFFFF", "#527F9A", 0.68)}
          {rainLines("freezing")}
          {snow(8)}
          {icePellets(5)}
          <path d="M36 112c60 10 137 8 228-5" stroke="#BCE8F5" strokeWidth="5" strokeLinecap="round" opacity="0.45" />
        </>
      );
    case "ice_pellets":
      return (
        <>
          {cloud(68, 14, 1.18, "#FFFFFF", "#527F9A", 0.66)}
          {icePellets(18)}
          <path d="M30 112c74 10 154 8 242-4" stroke="#B7E9F5" strokeWidth="5" strokeLinecap="round" opacity="0.46" />
        </>
      );
    case "wind":
      return (
        <>
          <g fill="none" strokeLinecap="round" opacity="0.56">
            <path d="M10 38h158c42 0 42-48 2-48-24 0-36 16-34 31" stroke="#168A83" strokeWidth="5" />
            <path d="M28 76h210c48 0 48-60 0-60-28 0-42 19-41 38" stroke="#42AFA7" strokeWidth="5" />
            <path d="M20 108h150c34 0 34 42 0 42-20 0-30-12-29-27" stroke="#74C9C1" strokeWidth="4" />
          </g>
          <path d="M246 96c26-24 44-52 51-85" stroke="#E1B753" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.36" />
        </>
      );
    case "heat":
      return (
        <>
          <circle cx="244" cy="34" r="48" fill="#FFD04D" stroke="#923F16" strokeWidth="4" opacity="0.6" />
          <g stroke="#C64C25" strokeWidth="3.4" strokeLinecap="round" fill="none" opacity="0.5">
            <path d="M54 110c-20-21 20-30 0-52M118 112c-20-22 23-33 0-56M185 110c-21-20 21-31 0-54M252 112c-20-22 22-34 0-58" />
          </g>
          <path d="M32 116c56 14 161 14 229 0" stroke="#E9914C" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
        </>
      );
    case "official_alert":
      return (
        <g opacity="0.62">
          <path d="M244 14l60 104H184L244 14Z" fill="#FFE07A" stroke="#82261E" strokeWidth="4" />
          <path d="M244 46v36" stroke="#82261E" strokeWidth="8" strokeLinecap="round" />
          <circle cx="244" cy="99" r="5" fill="#82261E" />
          <g stroke="#D9362B" strokeWidth="4" strokeLinecap="round" opacity="0.36">
            <path d="M-10 30h180M-6 94h190" />
          </g>
        </g>
      );
    case "unknown":
      return (
        <>
          <path
            d="M92 56c6-42 41-69 83-63 39 5 62 31 61 65 0 43-43 48-62 76"
            stroke="#5E4AA3"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
            opacity="0.46"
          />
          <circle cx="166" cy="112" r="7" fill="#5E4AA3" opacity="0.46" />
          <path d="M30 98c34-16 70-16 104 0s68 16 102 0" stroke="#BAA7F1" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.45" />
        </>
      );
  }
}

function starDots() {
  return (
    <g stroke="#FFF6B8" strokeWidth="2" strokeLinecap="round" opacity="0.65">
      <path d="M36 18v8M32 22h8" />
      <path d="M92 39v6M89 42h6" />
      <path d="M242 23v10M237 28h10" />
      <path d="M278 71v6M275 74h6" />
      <path d="M184 15v6M181 18h6" />
    </g>
  );
}

export function WeatherAtmosphereScene({
  iconKey,
  className,
}: {
  iconKey: WeatherIconKey;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const rawId = useId().replaceAll(":", "");
  const skyId = `weather-scene-sky-${rawId}`;
  const accentId = `weather-scene-accent-${rawId}`;
  const washId = `weather-scene-wash-${rawId}`;
  const palette = PALETTES[iconKey] ?? PALETTES.unknown;
  const [washStart, washMiddle, washEnd] = washStops(palette.wash);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={cn("weather-atmosphere-scene", className)}
      viewBox="0 0 320 128"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="320" y2="128" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={palette.top} />
          <stop offset="1" stopColor={palette.bottom} />
        </linearGradient>
        <radialGradient
          id={accentId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(250 30) rotate(140) scale(140 90)"
        >
          <stop offset="0" stopColor={palette.accent} stopOpacity="0.26" />
          <stop offset="1" stopColor={palette.accent} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={washId} x1="0" y1="0" x2="320" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={washStart} />
          <stop offset="0.48" stopColor="#FFFFFF" stopOpacity={washMiddle} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={washEnd} />
        </linearGradient>
      </defs>
      <rect width="320" height="128" rx="8" fill={`url(#${skyId})`} />
      <rect width="320" height="128" rx="8" fill={`url(#${accentId})`} />
      {sceneArt(iconKey)}
      <rect width="320" height="128" rx="8" fill={`url(#${washId})`} opacity="0.95" />
    </svg>
  );
}
