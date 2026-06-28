import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "public/weather-icons";

const iconSpecs = {
  sunny_day: {
    label: "Sunny day",
    sky: ["#FFE8A3", "#FFF8E1"],
    accent: "#FFB22E",
    body: `
      <g class="float">
        <circle cx="32" cy="28" r="11" fill="#FFD45A" stroke="#8F4E13" stroke-width="2.3"/>
        <path d="M32 7v7M32 42v7M12 28h7M45 28h7M18 14l5 5M46 14l-5 5M18 42l5-5M46 42l-5-5" stroke="#D86F1D" stroke-width="2.5" stroke-linecap="round"/>
      </g>
      <path class="draw" d="M14 49c7-4 14-4 21 0s14 4 21 0" stroke="#2E8B7C" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M15 47c4-6 9-7 12-3" stroke="#4FAE77" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    `,
  },
  clear_night: {
    label: "Clear night",
    sky: ["#263A73", "#121A3C"],
    accent: "#F8D66D",
    body: `
      <path class="float" d="M38 12c-8 4-11 13-7 21 3 7 11 10 18 7-4 7-14 10-22 6-9-5-12-16-7-25 4-7 11-10 18-9Z" fill="#FFE7A6" stroke="#4D3764" stroke-width="2"/>
      <path d="M13 48c7-5 14-7 21-2 6 4 12 3 17-2" stroke="#A7C6FF" stroke-width="2.4" stroke-linecap="round" fill="none"/>
      <path d="M20 42h7l3-5 3 5h8" stroke="#F8D66D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".85"/>
    `,
  },
  partly_cloudy_day: {
    label: "Partly cloudy day",
    sky: ["#BDEBFF", "#FFF3BF"],
    accent: "#FFC44D",
    body: `
      <g class="float">
        <circle cx="22" cy="23" r="9" fill="#FFD45A" stroke="#8F4E13" stroke-width="2"/>
        <path d="M22 7v5M22 34v5M7 23h5M32 23h5M11 12l4 4M33 12l-4 4" stroke="#DA7625" stroke-width="2.2" stroke-linecap="round"/>
      </g>
      <path d="M18 43h28c6 0 10-3 10-8s-4-8-9-8c-2-8-13-10-18-3-7-2-13 2-13 9 0 5 2 8 2 10Z" fill="#FFFFFF" stroke="#2D6B8F" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M22 40c8 3 18 3 28-1" stroke="#9DD7EC" stroke-width="2" stroke-linecap="round" fill="none"/>
    `,
  },
  partly_cloudy_night: {
    label: "Partly cloudy night",
    sky: ["#29396D", "#162142"],
    accent: "#D8C5FF",
    body: `
      <path class="float" d="M33 11c-6 5-7 13-2 18 4 5 11 6 16 2-2 7-10 12-18 10-9-3-13-13-10-21 2-6 8-10 14-9Z" fill="#FFE9A8" stroke="#59406E" stroke-width="2"/>
      <path d="M16 46h31c6 0 10-3 10-8s-4-8-9-8c-2-7-12-9-17-3-7-2-14 2-14 9 0 5 2 8-1 10Z" fill="#F6FAFF" stroke="#8CB0D8" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M20 43c9 2 19 2 31-1" stroke="#CBD7FF" stroke-width="2" stroke-linecap="round" fill="none"/>
    `,
  },
  cloudy: {
    label: "Cloudy",
    sky: ["#DDF4FF", "#EFF8FF"],
    accent: "#7AB8D6",
    body: `
      <path d="M12 43h37c6 0 11-4 11-10 0-6-5-10-11-10h-1c-3-9-16-12-23-4-8-2-15 3-15 11 0 6 3 10 2 13Z" fill="#FFFFFF" stroke="#437594" stroke-width="2.3" stroke-linejoin="round"/>
      <path class="drift" d="M18 39c10 3 23 2 35-2" stroke="#AFDAEB" stroke-width="2.4" stroke-linecap="round" fill="none"/>
      <path d="M15 49c9-3 22-3 34 0" stroke="#8EC6D9" stroke-width="2" stroke-linecap="round" fill="none" opacity=".75"/>
    `,
  },
  overcast: {
    label: "Overcast",
    sky: ["#B9C6D5", "#E4E8ED"],
    accent: "#65768A",
    body: `
      <path d="M8 35h39c6 0 10-3 10-8s-4-9-10-9c-3-7-13-9-19-4-6-2-12 1-15 6-5 0-9 4-9 9 0 3 2 5 4 6Z" fill="#DDE5EC" stroke="#53697C" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M15 45h34c6 0 10-3 10-8s-5-9-11-8c-4-5-12-6-17-2-6-2-13 1-16 7-5 0-8 3-8 7 0 2 3 4 8 4Z" fill="#F4F7FA" stroke="#53697C" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M13 52c9-2 25-2 39 0" stroke="#7C8C9B" stroke-width="2.2" stroke-linecap="round"/>
    `,
  },
  mist: {
    label: "Mist",
    sky: ["#D7F0EE", "#F6FCFA"],
    accent: "#7BBAB2",
    body: `
      <path d="M15 33h32c5 0 8-3 8-7s-4-7-8-7c-3-7-12-8-17-3-7-1-13 3-13 10 0 4 1 6-2 7Z" fill="#FFFFFF" stroke="#57948F" stroke-width="2.1"/>
      <path class="drift" d="M9 43c9-3 16 3 25 0s14-3 21 0" stroke="#7DBBB5" stroke-width="2.4" stroke-linecap="round" fill="none"/>
      <path class="drift slow" d="M11 51c7-2 14 2 22 0s15-3 22 1" stroke="#A7D6D1" stroke-width="2.3" stroke-linecap="round" fill="none"/>
    `,
  },
  fog: {
    label: "Fog",
    sky: ["#CFD7DF", "#F7F4EF"],
    accent: "#8D99A6",
    body: `
      <circle cx="20" cy="28" r="6" fill="#FFE6A6" opacity=".65"/>
      <path d="M17 32h31c5 0 8-3 8-7s-4-7-8-7c-3-6-11-8-17-4-7-1-13 3-13 10 0 4 1 6-1 8Z" fill="#EEF3F6" stroke="#6F8190" stroke-width="2"/>
      <path class="drift" d="M8 42h45M13 49h39M9 56h34" stroke="#7C8A98" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M45 56c3-2 6-2 9 0" stroke="#BAC3CC" stroke-width="2" stroke-linecap="round"/>
    `,
  },
  haze: {
    label: "Haze",
    sky: ["#FFD89C", "#F5E5C8"],
    accent: "#D49353",
    body: `
      <circle class="pulse" cx="32" cy="25" r="11" fill="#FFD260" stroke="#A95F24" stroke-width="2"/>
      <path class="drift" d="M12 41c7-3 13 3 20 0s13-3 20 0" stroke="#B78158" stroke-width="2.4" stroke-linecap="round" fill="none"/>
      <path class="drift slow" d="M9 49c8-2 15 2 23 0s15-2 23 1" stroke="#D7A87A" stroke-width="2.4" stroke-linecap="round" fill="none"/>
      <path d="M16 56h32" stroke="#B78158" stroke-width="2.2" stroke-linecap="round" opacity=".75"/>
    `,
  },
  smoke: {
    label: "Smoke",
    sky: ["#D3D0C9", "#F2EEE6"],
    accent: "#6F6B68",
    body: `
      <path class="drift" d="M27 52c-8-8 5-11-1-18-4-5-1-10 6-13" stroke="#6E6C6B" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path class="drift slow" d="M38 52c-6-7 7-10 1-17-5-6 1-11 8-15" stroke="#8B8984" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M16 49c7 5 25 7 36 0" stroke="#B0AAA3" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M22 56h20" stroke="#6E6C6B" stroke-width="2.2" stroke-linecap="round"/>
    `,
  },
  dust: {
    label: "Dust",
    sky: ["#EFCB8B", "#FFF1CF"],
    accent: "#B97836",
    body: `
      <path class="spin" d="M16 35c6-10 23-13 34-4 6 5 4 14-5 17-11 4-25 0-30-8" stroke="#B97836" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M20 44c8-5 22-5 31 1" stroke="#D79B50" stroke-width="2.4" stroke-linecap="round" fill="none"/>
      <circle cx="19" cy="24" r="2.2" fill="#9D602D"/>
      <circle cx="46" cy="21" r="1.8" fill="#C9873F"/>
      <circle cx="36" cy="52" r="1.7" fill="#9D602D"/>
      <path d="M11 53c9 2 24 1 40-2" stroke="#9D602D" stroke-width="2" stroke-linecap="round"/>
    `,
  },
  patchy_rain: {
    label: "Patchy rain",
    sky: ["#CAE9F7", "#F6FBFF"],
    accent: "#4386C6",
    body: `
      <circle class="float" cx="45" cy="18" r="7" fill="#FFD763" stroke="#B56A1E" stroke-width="1.8"/>
      <path d="M11 35h24c5 0 8-3 8-7s-3-7-8-7c-3-6-11-7-16-2-6-1-11 3-11 9 0 4 1 6 3 7Z" fill="#FFFFFF" stroke="#3F789D" stroke-width="2.2"/>
      <path class="fall" d="M18 42l-5 8M29 42l-4 7" stroke="#2D87D2" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M36 48c6-3 12-3 18 1" stroke="#E6B75C" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M13 55c7 2 14 2 22 0" stroke="#9ACDEB" stroke-width="2.1" stroke-linecap="round"/>
    `,
  },
  light_rain: {
    label: "Light rain",
    sky: ["#BBDFF5", "#F4FAFF"],
    accent: "#2E83C5",
    body: `
      <path d="M14 30h32c6 0 10-4 10-9 0-6-5-9-10-9-4-7-15-8-21-2-7-1-13 4-13 11 0 5 2 8 2 9Z" fill="#FFFFFF" stroke="#39759A" stroke-width="2.2"/>
      <path d="M22 42c5-5 15-5 20 0" stroke="#6DB6DE" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M32 42v9" stroke="#6DB6DE" stroke-width="2.2" stroke-linecap="round"/>
      <path class="fall slow" d="M19 38l-2 5M29 37l-2 5M40 37l-2 5M50 36l-2 5" stroke="#408FD1" stroke-width="2" stroke-linecap="round"/>
      <path d="M19 55c9 2 18 2 27 0" stroke="#99CBE9" stroke-width="2" stroke-linecap="round"/>
    `,
  },
  moderate_rain: {
    label: "Moderate rain",
    sky: ["#A7CBE3", "#E9F6FF"],
    accent: "#166DB0",
    body: `
      <path d="M11 30h37c6 0 11-4 11-10 0-7-6-10-12-9-5-8-17-9-24-1-8-1-14 4-14 12 0 5 2 8 2 8Z" fill="#F8FCFF" stroke="#2E668C" stroke-width="2.3"/>
      <g class="fall" stroke="#166DB0" stroke-width="2.8" stroke-linecap="round">
        <path d="M15 37v13"/><path d="M25 36v15"/><path d="M35 36v15"/><path d="M45 36v14"/><path d="M54 35v11"/>
      </g>
      <path d="M16 54c5-3 10-3 15 0s10 3 15 0 8-2 11 0" stroke="#5EA6D7" stroke-width="2.3" stroke-linecap="round" fill="none"/>
    `,
  },
  heavy_rain: {
    label: "Heavy rain",
    sky: ["#7499B9", "#D7ECFA"],
    accent: "#075A9A",
    body: `
      <path d="M9 29h40c7 0 12-5 12-11s-6-11-13-10c-5-8-18-9-25-1-8-1-15 5-15 13 0 5 2 8 1 9Z" fill="#ECF7FF" stroke="#245577" stroke-width="2.5"/>
      <g class="fall" stroke="#075A9A" stroke-width="3.5" stroke-linecap="round">
        <path d="M15 36l-7 14"/><path d="M28 35l-7 16"/><path d="M41 35l-7 16"/><path d="M54 34l-7 14"/>
      </g>
      <path d="M10 55c4 4 10 4 15 0M27 56c5 3 11 3 17-1M46 55c4 2 8 2 12-1" stroke="#2B86C5" stroke-width="3" stroke-linecap="round" fill="none"/>
      <circle cx="18" cy="51" r="1.8" fill="#2B86C5"/><circle cx="42" cy="52" r="1.6" fill="#2B86C5"/>
    `,
  },
  rain_shower: {
    label: "Rain shower",
    sky: ["#B8E9FF", "#FFF4C7"],
    accent: "#2B8ED8",
    body: `
      <path class="float" d="M15 19c9-8 25-8 34 1" stroke="#F6B742" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      <path d="M18 18c7-5 21-5 28 0" stroke="#62C98D" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".8"/>
      <path d="M17 34h30c6 0 10-3 10-8s-5-9-11-8c-4-6-14-7-19-2-7-1-13 4-13 10 0 5 2 8 3 8Z" fill="#FFFFFF" stroke="#347899" stroke-width="2.3"/>
      <path class="fall" d="M31 41l-5 8M43 40l-5 8M52 39l-4 7" stroke="#2B8ED8" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M17 53c6 3 14 3 22 0" stroke="#7DCAF0" stroke-width="2.2" stroke-linecap="round"/>
    `,
  },
  torrential_rain: {
    label: "Torrential rain",
    sky: ["#526C90", "#C4DCEF"],
    accent: "#043D78",
    body: `
      <path d="M8 28h42c7 0 12-5 12-12S56 5 49 6C43-2 28-1 22 8 13 7 6 13 6 21c0 4 1 6 2 7Z" fill="#E8F4FF" stroke="#1E4569" stroke-width="2.6"/>
      <g class="fall" stroke="#043D78" stroke-width="4.2" stroke-linecap="round">
        <path d="M11 34L4 55"/><path d="M23 33l-7 23"/><path d="M35 33l-7 23"/><path d="M47 32l-7 22"/><path d="M59 31l-6 18"/>
      </g>
      <path d="M6 58c7-5 14 4 22 0s14-4 22 0c3 1 6 1 9-1" stroke="#155F9E" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      <path d="M18 52h28" stroke="#9EC8E3" stroke-width="2" stroke-linecap="round" opacity=".8"/>
    `,
  },
  drizzle: {
    label: "Drizzle",
    sky: ["#D7EEF9", "#FAFDFF"],
    accent: "#6BAED8",
    body: `
      <path d="M16 32h30c5 0 9-3 9-8s-4-8-9-8c-3-6-12-8-17-3-7-1-13 3-13 10 0 4 1 6 0 9Z" fill="#FFFFFF" stroke="#6096B5" stroke-width="2.1"/>
      <g class="fall slow" fill="#65ADD8">
        <circle cx="20" cy="41" r="1.3"/><circle cx="30" cy="43" r="1.2"/><circle cx="40" cy="41" r="1.2"/><circle cx="50" cy="43" r="1.1"/>
        <circle cx="24" cy="50" r="1.4"/><circle cx="36" cy="51" r="1.1"/><circle cx="47" cy="50" r="1.3"/>
      </g>
      <path d="M18 56c8 1 18 1 28 0" stroke="#B6DFEF" stroke-width="2" stroke-linecap="round"/>
    `,
  },
  freezing_drizzle: {
    label: "Freezing drizzle",
    sky: ["#D7F7FF", "#F9FEFF"],
    accent: "#5FB6D6",
    body: `
      <path d="M15 31h31c5 0 9-3 9-8s-4-8-9-8c-4-7-13-8-18-2-7-1-13 3-13 10 0 4 1 6 0 8Z" fill="#FFFFFF" stroke="#5C91AA" stroke-width="2.1"/>
      <g class="fall slow" fill="#79C9E3">
        <circle cx="22" cy="40" r="1.2"/><circle cx="34" cy="42" r="1.1"/><circle cx="46" cy="40" r="1.2"/>
      </g>
      <path d="M18 51c8-2 18-2 29 0" stroke="#BDEDF6" stroke-width="2.1" stroke-linecap="round"/>
      <path d="M20 54l4 4M24 54l-4 4M34 51v8M30.5 55h7M48 53l4 4M52 53l-4 4" stroke="#8BD7EC" stroke-width="1.8" stroke-linecap="round"/>
    `,
  },
  freezing_rain: {
    label: "Freezing rain",
    sky: ["#C3EFFF", "#F2FCFF"],
    accent: "#2E90C5",
    body: `
      <path d="M12 30h37c6 0 10-4 10-10s-5-10-11-9c-5-8-17-8-23-1-8-1-14 4-14 12 0 5 2 8 1 8Z" fill="#FFFFFF" stroke="#477B99" stroke-width="2.3"/>
      <path class="fall" d="M18 38l-5 10M31 38l-5 10M44 37l-5 10" stroke="#2E90C5" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M15 52h37" stroke="#9BE3F7" stroke-width="3" stroke-linecap="round"/>
      <path d="M22 50l-3 8M35 50l-3 8M48 50l-3 8" stroke="#66BFD9" stroke-width="2" stroke-linecap="round"/>
      <path d="M19 57c8 2 20 2 31 0" stroke="#D9FAFF" stroke-width="1.8" stroke-linecap="round"/>
    `,
  },
  thunder_possible: {
    label: "Thunder possible",
    sky: ["#A7B2D6", "#F0EEFF"],
    accent: "#F6C945",
    body: `
      <path d="M12 31h35c6 0 10-4 10-10s-5-10-11-9c-4-8-17-9-23-1-7-1-13 4-13 11 0 5 2 8 2 9Z" fill="#F8FAFF" stroke="#4B5D87" stroke-width="2.4"/>
      <path class="flash" d="M34 32l-9 16h9l-4 10 14-18h-9l5-8Z" fill="#FFD957" stroke="#7E4A15" stroke-width="2" stroke-linejoin="round"/>
      <path d="M15 48c5-2 10-2 15 0" stroke="#8998C8" stroke-width="2" stroke-linecap="round" fill="none"/>
    `,
  },
  rain_with_thunder: {
    label: "Rain with thunder",
    sky: ["#6F7FA9", "#DDE8FF"],
    accent: "#FFD34F",
    body: `
      <path d="M9 29h40c7 0 12-4 12-11s-6-11-13-10c-5-8-18-9-25-1C14 6 7 12 7 20c0 5 2 8 2 9Z" fill="#EEF5FF" stroke="#33486F" stroke-width="2.5"/>
      <path class="flash" d="M35 29l-10 17h9l-4 11 15-19h-9l5-9Z" fill="#FFD957" stroke="#6A3F16" stroke-width="2" stroke-linejoin="round"/>
      <path class="fall" d="M14 37l-5 12M21 39l-4 9M51 35l-6 13M57 36l-4 9" stroke="#0A5EA8" stroke-width="3" stroke-linecap="round"/>
      <path d="M13 56c5-3 10-3 15 0s10 3 15 0 8-2 11 0" stroke="#3B8ECB" stroke-width="2.6" stroke-linecap="round" fill="none"/>
      <circle cx="48" cy="51" r="1.8" fill="#FFD957"/>
    `,
  },
  snow: {
    label: "Snow",
    sky: ["#D7F3FF", "#FFFFFF"],
    accent: "#79BDE2",
    body: `
      <path d="M14 29h34c6 0 10-4 10-9 0-6-5-9-11-9-4-8-16-9-22-1-8-1-14 4-14 11 0 5 2 8 3 8Z" fill="#FFFFFF" stroke="#5B91B1" stroke-width="2.2"/>
      <g class="fall slow" stroke="#7BC8E8" stroke-width="2" stroke-linecap="round">
        <path d="M20 39v9M15.5 43.5h9M17 40.5l6 6M23 40.5l-6 6"/>
        <path d="M39 41v9M34.5 45.5h9M36 42.5l6 6M42 42.5l-6 6"/>
      </g>
      <path d="M15 56c10 2 24 2 36 0" stroke="#BCE8F5" stroke-width="2.3" stroke-linecap="round"/>
    `,
  },
  sleet: {
    label: "Sleet",
    sky: ["#CDEBFA", "#F8FDFF"],
    accent: "#6AA6C8",
    body: `
      <path d="M13 30h35c6 0 10-4 10-9s-5-9-10-9c-4-8-16-9-23-1-8-1-14 4-14 11 0 5 2 8 2 8Z" fill="#FFFFFF" stroke="#527F9A" stroke-width="2.3"/>
      <path class="fall" d="M18 38l-4 8M42 38l-4 8" stroke="#2F86BD" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M29 39v8M25 43h8M26 40l6 6M32 40l-6 6" stroke="#92D7EA" stroke-width="1.8" stroke-linecap="round"/>
      <polygon points="48,47 52,50 51,55 46,55 45,50" fill="#B6EFF8" stroke="#5AA7C4" stroke-width="1.5"/>
      <path d="M16 55c8 2 20 2 31 0" stroke="#BCE8F5" stroke-width="2" stroke-linecap="round"/>
    `,
  },
  ice_pellets: {
    label: "Ice pellets",
    sky: ["#CFF4FF", "#F9FEFF"],
    accent: "#5DAFD3",
    body: `
      <path d="M14 29h34c6 0 10-4 10-9 0-6-5-9-11-9-4-8-16-9-22-1-8-1-14 4-14 11 0 5 2 8 3 8Z" fill="#FFFFFF" stroke="#527F9A" stroke-width="2.2"/>
      <g class="fall slow" fill="#A7E8F7" stroke="#428DB3" stroke-width="1.5">
        <polygon points="19,40 23,43 22,48 17,48 16,43"/>
        <polygon points="34,38 39,41 38,47 32,47 31,41"/>
        <polygon points="48,41 53,44 52,50 46,50 45,44"/>
      </g>
      <path d="M14 56c11 2 27 2 39-1" stroke="#B7E9F5" stroke-width="2.2" stroke-linecap="round"/>
    `,
  },
  wind: {
    label: "Wind",
    sky: ["#D7F4F3", "#FFF7DF"],
    accent: "#39A69B",
    body: `
      <path class="drift" d="M8 25h30c7 0 7-10 0-10-4 0-6 3-6 6" stroke="#168A83" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path class="drift slow" d="M13 38h37c8 0 8-12 0-12-5 0-7 4-7 7" stroke="#42AFA7" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M11 50h26c6 0 6 8 0 8-4 0-5-2-5-5" stroke="#74C9C1" stroke-width="2.6" stroke-linecap="round" fill="none"/>
      <path d="M48 48c4-4 7-8 8-13" stroke="#E1B753" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    `,
  },
  heat: {
    label: "Heat",
    sky: ["#FFB36B", "#FFE7B3"],
    accent: "#E45D2B",
    body: `
      <circle class="pulse" cx="32" cy="24" r="12" fill="#FFD04D" stroke="#923F16" stroke-width="2.4"/>
      <path class="drift" d="M19 43c-5-6 5-9 0-15M32 46c-5-6 5-10 0-16M45 43c-5-6 5-9 0-15" stroke="#C64C25" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      <path d="M13 54c10 3 27 3 38 0" stroke="#E9914C" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M22 50c6-2 13-2 20 0" stroke="#8E4A22" stroke-width="2" stroke-linecap="round" opacity=".65"/>
    `,
  },
  official_alert: {
    label: "Official weather alert",
    sky: ["#FFD7D0", "#FFF4D9"],
    accent: "#D9362B",
    body: `
      <path class="pulse" d="M32 8l25 44H7L32 8Z" fill="#FFE07A" stroke="#82261E" stroke-width="2.7" stroke-linejoin="round"/>
      <path d="M32 23v15" stroke="#82261E" stroke-width="4" stroke-linecap="round"/>
      <circle cx="32" cy="45" r="2.6" fill="#82261E"/>
      <path d="M15 53c8 3 26 3 34 0" stroke="#D9362B" stroke-width="2.2" stroke-linecap="round"/>
    `,
  },
  unknown: {
    label: "Weather unknown",
    sky: ["#D8D9FF", "#FFF7E9"],
    accent: "#7B63C7",
    body: `
      <path d="M18 28c1-9 8-15 17-14 8 1 13 6 13 13 0 9-9 10-13 16" stroke="#5E4AA3" stroke-width="3.4" stroke-linecap="round" fill="none"/>
      <circle cx="32" cy="51" r="2.7" fill="#5E4AA3"/>
      <path class="drift" d="M13 45c6-3 13-3 19 0s12 3 19 0" stroke="#BAA7F1" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      <path d="M21 19l3-5M43 18l4-4" stroke="#F7C65F" stroke-width="2" stroke-linecap="round"/>
    `,
  },
};

function sparkle() {
  return `
    <g class="sparkle" stroke="#FFF6B8" stroke-width="1.8" stroke-linecap="round">
      <path d="M54 12v5M51.5 14.5h5"/>
      <path d="M11 17v4M9 19h4"/>
      <path d="M53 55v4M51 57h4"/>
    </g>
  `;
}

function svgFor([key, spec]) {
  const [start, end] = spec.sky;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${spec.label}">
  <title>${spec.label}</title>
  <desc>After the Parks storybook weather icon for ${spec.label.toLowerCase()}.</desc>
  <defs>
    <linearGradient id="sky" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${start}"/>
      <stop offset="1" stop-color="${end}"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="1.2" flood-color="#17324D" flood-opacity=".18"/>
    </filter>
    <style>
      @media (prefers-reduced-motion:no-preference) {
        .float { animation: float-${key} 4.8s ease-in-out infinite; transform-origin: 32px 32px; }
        .drift { animation: drift-${key} 5.6s ease-in-out infinite; }
        .fall { animation: fall-${key} 1.9s ease-in-out infinite; }
        .slow { animation-duration: 3.2s; }
        .pulse { animation: pulse-${key} 3.4s ease-in-out infinite; transform-origin: 32px 32px; }
        .flash { animation: flash-${key} 2.6s ease-in-out infinite; transform-origin: 34px 40px; }
        .sparkle { animation: sparkle-${key} 3.8s ease-in-out infinite; transform-origin: 52px 14px; }
        .spin { animation: spin-${key} 5.5s ease-in-out infinite; transform-origin: 32px 39px; }
      }
      @keyframes float-${key} { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1.6px); } }
      @keyframes drift-${key} { 0%,100% { transform: translateX(0); opacity: .95; } 50% { transform: translateX(2px); opacity: .72; } }
      @keyframes fall-${key} { 0%,100% { transform: translateY(0); opacity: .95; } 50% { transform: translateY(2.2px); opacity: .65; } }
      @keyframes pulse-${key} { 0%,100% { transform: scale(1); } 50% { transform: scale(1.045); } }
      @keyframes flash-${key} { 0%,100% { opacity: .88; transform: scale(1); } 52% { opacity: 1; transform: scale(1.08); } }
      @keyframes sparkle-${key} { 0%,100% { opacity: .45; transform: scale(.92); } 50% { opacity: 1; transform: scale(1.08); } }
      @keyframes spin-${key} { 0%,100% { transform: rotate(-2deg); } 50% { transform: rotate(3deg); } }
    </style>
  </defs>
  <rect width="64" height="64" rx="18" fill="url(#sky)"/>
  <circle cx="50" cy="14" r="7" fill="${spec.accent}" opacity=".16"/>
  <g filter="url(#softShadow)" stroke-linecap="round" stroke-linejoin="round">
    ${spec.body}
  </g>
  ${sparkle()}
</svg>
`;
}

mkdirSync(OUT_DIR, { recursive: true });

const manifest = [];
for (const entry of Object.entries(iconSpecs)) {
  const [key, spec] = entry;
  const svg = svgFor(entry);
  writeFileSync(join(OUT_DIR, `${key}.svg`), svg);
  manifest.push({
    key,
    label: spec.label,
    svg,
  });
}

mkdirSync("data/weather", { recursive: true });
writeFileSync(
  "data/weather/after-the-parks-weather-icons.json",
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(`Generated ${manifest.length} weather icons.`);
