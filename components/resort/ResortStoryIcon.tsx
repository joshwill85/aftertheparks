import React from "react";
import { cn } from "@/lib/utils";

const RESORTS_WITH_STORY_ICONS = new Set([
  "all-star-movies-resort",
  "all-star-music-resort",
  "all-star-sports-resort",
  "animal-kingdom-lodge",
  "animal-kingdom-villas-jambo-house",
  "animal-kingdom-villas-kidani-village",
  "art-of-animation-resort",
  "bay-lake-tower-at-contemporary-resort",
  "beach-club-resort",
  "beach-club-villas",
  "boardwalk-inn",
  "boardwalk-villas",
  "boulder-ridge-villas-at-wilderness-lodge",
  "cabins-at-fort-wilderness-resort",
  "campsites-at-fort-wilderness-resort",
  "caribbean-beach-resort",
  "contemporary-resort",
  "copper-creek-villas-and-cabins-at-wilderness-lodge",
  "coronado-springs-resort",
  "grand-floridian-resort-and-spa",
  "old-key-west-resort",
  "polynesian-village-resort",
  "polynesian-villas-and-bungalows",
  "pop-century-resort",
  "port-orleans-resort-french-quarter",
  "port-orleans-resort-riverside",
  "riviera-resort",
  "saratoga-springs-resort-and-spa",
  "villas-at-grand-floridian-resort-and-spa",
  "wilderness-lodge",
  "yacht-club-resort",
]);

export function hasResortStoryIcon(slug: string): boolean {
  return RESORTS_WITH_STORY_ICONS.has(slug);
}

export function ResortStoryIcon({
  slug,
  isDarkBanner = false,
}: {
  slug: string;
  isDarkBanner?: boolean;
}) {
  if (slug === "all-star-movies-resort") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--all-star-movies-resort",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="All-Star Movies Resort icon: larger-than-life Disney film sets, Fantasia Pool, Sorcerer Mickey fountain, Cinema Hall, film reel, Duck Pond Pool, Mighty Ducks hockey rink, and movie-night sparkle"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="allStarMoviesIconSky" x1="44" y1="28" x2="217" y2="231">
              <stop offset="0" stopColor="#fff6c7" />
              <stop offset="0.45" stopColor="#ffd166" />
              <stop offset="1" stopColor="#55c7d3" />
            </linearGradient>
            <linearGradient id="allStarMoviesIconWater" x1="43" y1="172" x2="225" y2="226">
              <stop offset="0" stopColor="#39c9d3" />
              <stop offset="1" stopColor="#126c86" />
            </linearGradient>
            <linearGradient id="allStarMoviesIconHat" x1="94" y1="60" x2="175" y2="155">
              <stop offset="0" stopColor="#224a92" />
              <stop offset="1" stopColor="#14245f" />
            </linearGradient>
            <linearGradient id="allStarMoviesIconFilm" x1="54" y1="88" x2="143" y2="175">
              <stop offset="0" stopColor="#fdf6d6" />
              <stop offset="1" stopColor="#f1b54e" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#allStarMoviesIconSky)" />
          <path
            className="resort-card__story-icon-water"
            d="M43 180c35-24 77-24 111-9 27 12 54 10 71-6 2 26-14 48-40 59-43 18-103 10-136-14-12-9-16-20-6-30Z"
            fill="url(#allStarMoviesIconWater)"
          />
          <g className="resort-card__story-icon-marquee">
            <path
              d="M68 154h122l12 29H55l13-29Z"
              fill="#fff5d5"
              stroke="#153844"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M75 131h107l12 25H63l12-25Z"
              fill="#e94f4f"
              stroke="#153844"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M84 137h16v18H84v-18Zm30 0h16v18h-16v-18Zm30 0h16v18h-16v-18Zm30 0h14v18h-14v-18Z"
              fill="#fff0a6"
            />
            <circle cx="76" cy="188" r="4" fill="#ffd75c" />
            <circle cx="101" cy="188" r="4" fill="#ffd75c" />
            <circle cx="126" cy="188" r="4" fill="#ffd75c" />
            <circle cx="151" cy="188" r="4" fill="#ffd75c" />
            <circle cx="176" cy="188" r="4" fill="#ffd75c" />
          </g>
          <g className="resort-card__story-icon-film">
            <circle
              cx="69"
              cy="99"
              r="28"
              fill="url(#allStarMoviesIconFilm)"
              stroke="#153844"
              strokeWidth="6"
            />
            <circle cx="69" cy="99" r="7" fill="#153844" />
            <circle cx="69" cy="81" r="6" fill="#fff7d5" />
            <circle cx="87" cy="99" r="6" fill="#fff7d5" />
            <circle cx="69" cy="117" r="6" fill="#fff7d5" />
            <circle cx="51" cy="99" r="6" fill="#fff7d5" />
            <path
              d="M92 80h70l9 32H85l7-32Z"
              fill="#fff8de"
              stroke="#153844"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M98 80 86 104m34-24-12 24m35-24-13 24m36-21-12 21"
              stroke="#153844"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M86 112h88v23H86Z"
              fill="#ffd45d"
              stroke="#153844"
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </g>
          <g className="resort-card__story-icon-hat">
            <path
              d="M126 151c10-32 17-61 32-88 9 27 27 44 39 63-26-9-49-2-71 25Z"
              fill="url(#allStarMoviesIconHat)"
              stroke="#153844"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M151 85c4 15 13 27 28 37"
              stroke="#7acfe0"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path d="m155 101 6 13 13 5-13 5-6 13-5-13-13-5 13-5 5-13Z" fill="#ffe36f" />
            <path
              d="M134 149c22-18 45-23 72-15"
              stroke="#fff7d7"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
            <path
              className="resort-card__story-icon-falls"
              d="M151 153c-11 15-13 30-5 47"
              stroke="#7fe7e0"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
          </g>
          <g className="resort-card__story-icon-rink">
            <path
              d="M66 205c31-13 64-13 94-2 22 8 40 6 56-4-10 18-40 29-82 31-40 1-68-8-68-25Z"
              fill="#e9f9f5"
              opacity="0.78"
            />
            <path
              d="M83 208c26-7 55-7 86 2"
              stroke="#36b8c5"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M185 199c14-9 29-10 43-3"
              stroke="#153844"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="211" cy="201" r="6" fill="#153844" />
          </g>
          <g className="resort-card__story-icon-spark">
            <path d="m217 58 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#ffe36f" />
            <path d="m44 150 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#ffe36f" />
            <circle cx="213" cy="114" r="4" fill="#e94f4f" />
            <circle cx="57" cy="67" r="4" fill="#fff5a4" />
          </g>
        </svg>
      </span>
    );
  }

  if (slug === "all-star-music-resort") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--all-star-music-resort",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="All-Star Music Resort icon: Calypso Pool guitar-shaped pool, Three Caballeros fountain, Piano Pool keyboard, Melody Hall rhythm, maracas, and movie-night sparkle"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="allStarMusicIconSky" x1="42" y1="28" x2="218" y2="231">
              <stop offset="0" stopColor="#fff5be" />
              <stop offset="0.44" stopColor="#ffbe58" />
              <stop offset="1" stopColor="#4cc6ce" />
            </linearGradient>
            <linearGradient id="allStarMusicIconPool" x1="40" y1="171" x2="222" y2="226">
              <stop offset="0" stopColor="#38d6d0" />
              <stop offset="1" stopColor="#116f86" />
            </linearGradient>
            <linearGradient id="allStarMusicIconGuitar" x1="52" y1="102" x2="186" y2="201">
              <stop offset="0" stopColor="#ffe36b" />
              <stop offset="1" stopColor="#f28a45" />
            </linearGradient>
            <linearGradient id="allStarMusicIconKeys" x1="79" y1="76" x2="196" y2="153">
              <stop offset="0" stopColor="#fffbe4" />
              <stop offset="1" stopColor="#c9f1e9" />
            </linearGradient>
            <linearGradient id="allStarMusicIconNote" x1="52" y1="44" x2="99" y2="130">
              <stop offset="0" stopColor="#244d9a" />
              <stop offset="1" stopColor="#10275e" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#allStarMusicIconSky)" />
          <path
            className="resort-card__story-icon-water"
            d="M40 179c35-24 78-24 112-9 28 13 54 11 72-7 2 27-14 50-42 61-43 17-104 9-137-15-12-9-16-21-5-30Z"
            fill="url(#allStarMusicIconPool)"
          />
          <g className="resort-card__story-icon-note">
            <path d="M71 49v62" stroke="#153844" strokeWidth="7" strokeLinecap="round" />
            <path
              d="M71 52c21-10 42-9 58 3v18c-17-11-37-12-58-3V52Z"
              fill="#f65b64"
              stroke="#153844"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <circle
              cx="58"
              cy="115"
              r="18"
              fill="url(#allStarMusicIconNote)"
              stroke="#153844"
              strokeWidth="6"
            />
            <path
              d="M58 103c8 4 13 10 15 20"
              stroke="#7be1df"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-keys">
            <path
              d="M98 78c39-11 81 2 98 32 10 18 4 38-16 45-29 11-76 4-101-14-27-20-16-52 19-63Z"
              fill="url(#allStarMusicIconKeys)"
              stroke="#153844"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M103 89c22-6 54-2 75 13"
              stroke="#153844"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M107 102l-8 33m27-39-9 42m29-40-7 43m29-35-5 34"
              stroke="#153844"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M110 104l-4 19m27-22-4 22m28-18-3 21"
              stroke="#f65b64"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-guitar">
            <path
              d="M78 143c7-24 37-31 56-14 20-15 52-7 57 17 5 24-18 44-52 44-37 0-68-19-61-47Z"
              fill="url(#allStarMusicIconGuitar)"
              stroke="#153844"
              strokeWidth="7"
              strokeLinejoin="round"
            />
            <circle cx="134" cy="156" r="17" fill="#fff5c8" stroke="#153844" strokeWidth="6" />
            <circle cx="134" cy="156" r="6" fill="#153844" />
            <path d="M179 141l42-30" stroke="#153844" strokeWidth="12" strokeLinecap="round" />
            <path d="M184 139l38-27" stroke="#ffe36b" strokeWidth="5" strokeLinecap="round" />
            <path
              d="M90 174c26-10 59-9 94 3"
              stroke="#fff8d7"
              strokeWidth="7"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-caballeros">
            <path
              d="M128 121c-10-21 4-38 17-45 0 18 8 31 24 39-16 1-29 3-41 6Z"
              fill="#2450a4"
              stroke="#153844"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M121 126c-17-11-17-31-7-43 7 15 19 24 36 25-12 7-21 12-29 18Z"
              fill="#ffdd5d"
              stroke="#153844"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M139 126c2-19 18-29 33-28-6 14-5 28 5 41-15-8-26-11-38-13Z"
              fill="#42b96a"
              stroke="#153844"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path d="M117 140c13-13 33-13 47 0" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
            <path
              className="resort-card__story-icon-falls"
              d="M121 144c-10 13-12 26-5 41m47-41c10 12 12 25 5 39"
              stroke="#72e6e0"
              strokeWidth="7"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-rhythm">
            <path
              d="M50 161c9-12 26-11 34 2l-16 23c-15-5-22-14-18-25Z"
              fill="#f65b64"
              stroke="#153844"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path d="M58 166c7 4 13 8 18 14" stroke="#fff1a6" strokeWidth="4" strokeLinecap="round" />
            <path
              d="M207 79c9 8 12 21 6 34l-25-7c-1-16 7-27 19-27Z"
              fill="#ffd95d"
              stroke="#153844"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path d="M203 91c-2 7-5 13-10 18" stroke="#f65b64" strokeWidth="4" strokeLinecap="round" />
          </g>
          <g className="resort-card__story-icon-spark">
            <path d="m213 54 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#fff07a" />
            <path d="m45 72 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#fff07a" />
            <circle cx="219" cy="151" r="4" fill="#f65b64" />
            <circle cx="67" cy="204" r="4" fill="#fff5a4" />
          </g>
          <path d="M77 210c28-8 57-7 86 4" stroke="#153844" strokeWidth="5" strokeLinecap="round" />
          <path d="M101 224c25-7 50-6 76 2" stroke="#c9f8ef" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  if (slug === "all-star-sports-resort") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--all-star-sports-resort",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="All-Star Sports Resort icon: Surfboard Bay Pool, giant surfboards, Grand Slam Pool baseball diamond, Goofy pitcher fountain, Stadium Hall, baseball bats, and poolside activity energy"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="allStarSportsIconSky" x1="42" y1="26" x2="218" y2="231">
              <stop offset="0" stopColor="#fff8c8" />
              <stop offset="0.45" stopColor="#7ed6de" />
              <stop offset="1" stopColor="#2a8bb6" />
            </linearGradient>
            <linearGradient id="allStarSportsIconWater" x1="41" y1="170" x2="224" y2="226">
              <stop offset="0" stopColor="#38d6d0" />
              <stop offset="1" stopColor="#116f86" />
            </linearGradient>
            <linearGradient id="allStarSportsIconDiamond" x1="72" y1="119" x2="194" y2="218">
              <stop offset="0" stopColor="#ffe69a" />
              <stop offset="1" stopColor="#d99742" />
            </linearGradient>
            <linearGradient id="allStarSportsIconBoard" x1="47" y1="50" x2="113" y2="169">
              <stop offset="0" stopColor="#ffe45d" />
              <stop offset="1" stopColor="#f05a61" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#allStarSportsIconSky)" />
          <path
            className="resort-card__story-icon-water"
            d="M41 179c34-24 78-25 113-9 28 13 55 11 70-7 3 27-14 50-42 61-43 17-104 8-137-16-12-9-15-20-4-29Z"
            fill="url(#allStarSportsIconWater)"
          />
          <g className="resort-card__story-icon-surfboard">
            <path
              d="M71 53c23 31 27 79 7 119-24-29-29-83-7-119Z"
              fill="url(#allStarSportsIconBoard)"
              stroke="#153844"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M95 61c18 31 18 73-1 107-18-29-18-75 1-107Z"
              fill="#fff7d0"
              stroke="#153844"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path d="M78 73c9 22 9 51 0 75" stroke="#2a8bb6" strokeWidth="5" strokeLinecap="round" />
            <path d="M99 83c6 20 5 42-2 64" stroke="#f05a61" strokeWidth="5" strokeLinecap="round" />
            <path d="M53 167c18-9 38-9 61 1" stroke="#fff9d7" strokeWidth="7" strokeLinecap="round" />
          </g>
          <g className="resort-card__story-icon-diamond">
            <path
              d="M130 111 196 169 132 228 66 169 130 111Z"
              fill="url(#allStarSportsIconDiamond)"
              stroke="#153844"
              strokeWidth="7"
              strokeLinejoin="round"
            />
            <path
              d="M130 132 174 170 131 209 88 170 130 132Z"
              fill="#eaf9f3"
              stroke="#153844"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path d="M130 132v77M88 170h86" stroke="#79d8d4" strokeWidth="5" strokeLinecap="round" />
            <circle cx="130" cy="169" r="22" fill="#fff8d7" stroke="#153844" strokeWidth="6" />
            <circle cx="130" cy="169" r="7" fill="#153844" />
            <path d="M112 151c12-13 27-13 39 0" stroke="#f05a61" strokeWidth="5" strokeLinecap="round" />
            <path d="M113 181c13 12 28 12 41 0" stroke="#f05a61" strokeWidth="5" strokeLinecap="round" />
          </g>
          <g className="resort-card__story-icon-goofy">
            <path
              d="M152 109c5-24 22-41 42-47 0 20 10 34 27 44-26-3-48-1-69 3Z"
              fill="#2b55a2"
              stroke="#153844"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path d="M164 93c12 6 24 9 39 9" stroke="#7be1df" strokeWidth="5" strokeLinecap="round" />
            <path d="M151 121c20-13 43-16 68-8" stroke="#fff8d7" strokeWidth="8" strokeLinecap="round" />
            <path
              className="resort-card__story-icon-falls"
              d="M158 125c-10 17-12 34-5 50"
              stroke="#72e6e0"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              className="resort-card__story-icon-falls"
              d="M192 122c12 13 16 29 10 48"
              stroke="#72e6e0"
              strokeWidth="7"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-bats">
            <path d="M43 137 87 91" stroke="#153844" strokeWidth="10" strokeLinecap="round" />
            <path d="M48 134 88 94" stroke="#f9c85d" strokeWidth="5" strokeLinecap="round" />
            <circle cx="40" cy="140" r="9" fill="#f05a61" stroke="#153844" strokeWidth="5" />
            <path d="M207 158 231 134" stroke="#153844" strokeWidth="10" strokeLinecap="round" />
            <path d="M210 156 230 136" stroke="#f9c85d" strokeWidth="5" strokeLinecap="round" />
            <circle cx="233" cy="132" r="8" fill="#fff7d0" stroke="#153844" strokeWidth="5" />
          </g>
          <g className="resort-card__story-icon-spark">
            <path d="m213 52 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#fff07a" />
            <path d="m46 83 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#fff07a" />
            <circle cx="219" cy="189" r="4" fill="#f05a61" />
            <circle cx="72" cy="213" r="4" fill="#fff5a4" />
          </g>
          <path d="M83 216c30-8 60-7 91 4" stroke="#153844" strokeWidth="5" strokeLinecap="round" />
          <path d="M105 230c24-7 50-6 77 2" stroke="#c9f8ef" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  if (slug === "animal-kingdom-lodge") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--animal-kingdom-lodge",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Animal Kingdom Lodge icon: Jambo House kraal-inspired lodge, living savanna, giraffe and zebra, African art medallion, Uzima Springs Pool water, and warm lobby glow"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="animalKingdomLodgeIconSky" x1="44" y1="24" x2="210" y2="232">
              <stop offset="0" stopColor="#fff0aa" />
              <stop offset="0.44" stopColor="#d9923a" />
              <stop offset="1" stopColor="#198c87" />
            </linearGradient>
            <linearGradient id="animalKingdomLodgeIconWater" x1="44" y1="170" x2="221" y2="225">
              <stop offset="0" stopColor="#45d4cb" />
              <stop offset="1" stopColor="#0d6874" />
            </linearGradient>
            <linearGradient id="animalKingdomLodgeIconLodge" x1="64" y1="62" x2="196" y2="166">
              <stop offset="0" stopColor="#7c431e" />
              <stop offset="1" stopColor="#351f18" />
            </linearGradient>
            <linearGradient id="animalKingdomLodgeIconMedallion" x1="78" y1="102" x2="169" y2="201">
              <stop offset="0" stopColor="#ffe18a" />
              <stop offset="0.56" stopColor="#f27a3d" />
              <stop offset="1" stopColor="#553024" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#animalKingdomLodgeIconSky)" />
          <path
            className="resort-card__story-icon-water"
            d="M43 178c30-21 68-23 99-10 26 11 55 9 77-11 6 27-9 51-38 64-40 18-100 10-131-14-13-10-17-21-7-29Z"
            fill="url(#animalKingdomLodgeIconWater)"
          />
          <g className="resort-card__story-icon-savanna-tree">
            <path
              d="M70 81c7 21 5 49-3 77"
              stroke="#37251b"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M49 88c9-15 28-20 45-12-15 3-28 9-37 20"
              fill="#24452f"
            />
            <path
              d="M68 74c14-18 43-17 58-1-22-2-40 3-52 16"
              fill="#315b37"
            />
            <path
              d="M89 83c20-9 43-3 55 12-23-4-41-2-57 8"
              fill="#24452f"
            />
            <path
              d="M68 112c-11-1-20 4-26 14M72 104c11-1 21 3 29 13"
              stroke="#37251b"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-kraal-lodge">
            <path
              d="M65 151c13-47 37-76 65-87 28 13 52 41 64 87-38-12-89-12-129 0Z"
              fill="url(#animalKingdomLodgeIconLodge)"
              stroke="#153844"
              strokeWidth="7"
              strokeLinejoin="round"
            />
            <path
              d="M84 136c10-30 25-49 46-60 21 12 36 31 45 60"
              stroke="#f3c46b"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M84 153c28-11 64-11 92 0"
              stroke="#f7dc9a"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M110 134h40v31h-40v-31Z"
              fill="#f0b957"
              stroke="#153844"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path d="M130 134v31" stroke="#153844" strokeWidth="5" strokeLinecap="round" />
            <path
              d="M73 147c18-25 37-41 57-49 21 9 40 25 57 49"
              stroke="#c96b34"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
          <g className="resort-card__story-icon-savanna-animals">
            <path d="M189 83v60" stroke="#5d3a21" strokeWidth="9" strokeLinecap="round" />
            <path
              d="M185 83c9-11 21-11 29-1-7 0-15 4-20 12"
              fill="#f5b75f"
              stroke="#153844"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <circle cx="203" cy="82" r="3" fill="#153844" />
            <path
              d="M190 101h13M190 120h14"
              stroke="#6d4327"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M179 152c11-9 28-9 41 2-14 5-29 5-41-2Z"
              fill="#f4f1dc"
              stroke="#153844"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="m190 147-7 9m19-10-8 13m20-9-7 8"
              stroke="#153844"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-medallion">
            <path
              d="m92 178 36-38 36 38-36 38-36-38Z"
              fill="url(#animalKingdomLodgeIconMedallion)"
              stroke="#153844"
              strokeWidth="7"
              strokeLinejoin="round"
            />
            <circle cx="128" cy="178" r="18" fill="#fff2bf" stroke="#153844" strokeWidth="6" />
            <circle cx="128" cy="178" r="6" fill="#153844" />
            <path
              d="M104 178H87m82 0h-17m-24-24v-17m0 83v-17"
              stroke="#f9e7a6"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M108 158c13-8 29-8 41 0M107 199c13 8 30 8 43 0"
              stroke="#45d4cb"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
          <g className="resort-card__story-icon-overlook">
            <path d="M54 204c22-8 43-8 65 0" stroke="#fff4c4" strokeWidth="8" strokeLinecap="round" />
            <path d="M153 203c23-8 46-8 68 1" stroke="#8ceee4" strokeWidth="7" strokeLinecap="round" />
            <path d="M41 211c24 8 51 9 78 2" stroke="#1b6f74" strokeWidth="5" strokeLinecap="round" />
          </g>
          <g className="resort-card__story-icon-spark">
            <path d="m218 58 5 11 11 5-11 5-5 12-5-12-11-5 11-5 5-11Z" fill="#ffe36f" />
            <path d="m47 134 4 8 8 4-8 4-4 8-4-8-8-4 8-4 4-8Z" fill="#ffe36f" />
            <circle cx="68" cy="218" r="5" fill="#ffe36f" />
            <circle cx="221" cy="182" r="5" fill="#ff6f61" />
          </g>
        </svg>
      </span>
    );
  }

  if (slug === "animal-kingdom-villas-jambo-house") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--animal-kingdom-villas-jambo-house",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Animal Kingdom Villas - Jambo House icon: villa home base inside Jambo House, balcony windows, savanna overlook, String of Memories beads, African art heart, Uzima water, and quiet animal-life cues"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="animalKingdomVillasJamboIconSky" x1="38" y1="27" x2="216" y2="232">
              <stop offset="0" stopColor="#fff1aa" />
              <stop offset="0.48" stopColor="#bd7b3a" />
              <stop offset="1" stopColor="#13777a" />
            </linearGradient>
            <linearGradient id="animalKingdomVillasJamboIconWater" x1="42" y1="174" x2="224" y2="225">
              <stop offset="0" stopColor="#49ddd0" />
              <stop offset="1" stopColor="#0e6671" />
            </linearGradient>
            <linearGradient id="animalKingdomVillasJamboIconVilla" x1="55" y1="55" x2="201" y2="172">
              <stop offset="0" stopColor="#8f4d24" />
              <stop offset="1" stopColor="#2f1d18" />
            </linearGradient>
            <linearGradient id="animalKingdomVillasJamboIconBead" x1="73" y1="115" x2="165" y2="217">
              <stop offset="0" stopColor="#ffe18a" />
              <stop offset="0.55" stopColor="#ea7040" />
              <stop offset="1" stopColor="#45291f" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#animalKingdomVillasJamboIconSky)" />
          <path
            className="resort-card__story-icon-water"
            d="M42 180c33-22 71-22 100-10 27 11 55 7 81-12 5 27-12 52-42 64-41 16-99 9-131-15-12-9-17-19-8-27Z"
            fill="url(#animalKingdomVillasJamboIconWater)"
          />
          <g className="resort-card__story-icon-villa-overlook">
            <path
              d="M37 151c26-16 58-16 86-3 21 10 46 8 67-5"
              stroke="#f6d38d"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M46 161c29-10 59-8 87 4 21 9 46 6 71-9"
              stroke="#153844"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M61 149v27M96 145v32M134 160v27M174 155v26"
              stroke="#153844"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-jambo-villa-house">
            <path
              d="M55 155c14-52 43-85 75-97 32 15 57 46 71 97-44-13-98-13-146 0Z"
              fill="url(#animalKingdomVillasJamboIconVilla)"
              stroke="#153844"
              strokeWidth="7"
              strokeLinejoin="round"
            />
            <path
              d="M75 139c13-36 31-58 55-70 23 14 41 36 54 70"
              stroke="#f0bc69"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M80 156c31-13 68-13 101 0"
              stroke="#fff0b4"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M87 127h87v38H87v-38Z"
              fill="#f0b45d"
              stroke="#153844"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M98 139h17v16H98v-16Zm24-2h17v18h-17v-18Zm24 2h17v16h-17v-16Z"
              fill="#fff1b9"
              stroke="#153844"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M91 166c21-9 58-9 81 0"
              stroke="#6fd6cb"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M73 150c19-26 38-42 57-49 21 8 41 25 58 49"
              stroke="#c55f34"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
          <g className="resort-card__story-icon-villa-home-glow">
            <path d="M52 93c8-15 26-19 42-12-14 2-27 9-36 20Z" fill="#24452f" />
            <path d="M69 78c14-17 39-15 53 0-19-1-36 4-47 16Z" fill="#315b37" />
            <path d="M67 90c2 21-1 38-6 57" stroke="#3c271b" strokeWidth="7" strokeLinecap="round" />
          </g>
          <g className="resort-card__story-icon-string-of-memories">
            <path
              d="M82 189c19 21 49 30 84 17"
              stroke="#153844"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="91" cy="195" r="9" fill="#ffe18a" stroke="#153844" strokeWidth="5" />
            <circle cx="116" cy="207" r="9" fill="#45d4cb" stroke="#153844" strokeWidth="5" />
            <circle cx="143" cy="211" r="9" fill="#f27040" stroke="#153844" strokeWidth="5" />
            <circle cx="166" cy="205" r="8" fill="#fff2bf" stroke="#153844" strokeWidth="5" />
            <path
              d="M91 190c5 4 7 9 6 14m19-2c3 6 3 10 0 14m27-11c-1 7-4 11-9 14"
              stroke="#fff6c9"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-jambo-art-heart">
            <path
              d="m104 183 26-28 26 28-26 28-26-28Z"
              fill="url(#animalKingdomVillasJamboIconBead)"
              stroke="#153844"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <circle cx="130" cy="183" r="14" fill="#fff2bf" stroke="#153844" strokeWidth="5" />
            <circle cx="130" cy="183" r="5" fill="#153844" />
            <path
              d="M113 183H97m65 0h-15m-17-17v-16m0 66v-14"
              stroke="#fff0b4"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-savanna-life">
            <path d="M195 83v52" stroke="#5d3a21" strokeWidth="8" strokeLinecap="round" />
            <path
              d="M191 84c7-10 18-10 25-1-7 1-14 5-18 12"
              fill="#f5b75f"
              stroke="#153844"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <circle cx="207" cy="84" r="3" fill="#153844" />
            <path d="M197 101h11M197 116h12" stroke="#6d4327" strokeWidth="4" strokeLinecap="round" />
            <path
              d="M180 142c11-9 27-8 39 2-14 5-28 5-39-2Z"
              fill="#f4f1dc"
              stroke="#153844"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="m190 138-7 8m19-10-7 13m19-9-7 8"
              stroke="#153844"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-villa-spark">
            <path d="m218 56 5 11 11 5-11 5-5 11-5-11-11-5 11-5 5-11Z" fill="#ffe36f" />
            <path d="m47 123 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#ffe36f" />
            <circle cx="65" cy="218" r="5" fill="#ffe36f" />
            <circle cx="221" cy="183" r="5" fill="#ff6f61" />
          </g>
          <path d="M44 214c23 8 50 9 76 2" stroke="#153844" strokeWidth="5" strokeLinecap="round" />
          <path d="M150 216c24-9 49-8 72 2" stroke="#c9f8ef" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  if (slug === "animal-kingdom-villas-kidani-village") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--animal-kingdom-villas-kidani-village",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Animal Kingdom Villas - Kidani Village icon: Kidani Village home arch, Pembe Savanna Overlook, Samawati Springs and Uwanja water-play energy, Community Hall games, String of Memories beads, and Survival of the Fittest wellness rhythm"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="animalKingdomVillasKidaniIconSky" x1="43" y1="22" x2="218" y2="232">
              <stop offset="0" stopColor="#ffe584" />
              <stop offset="0.45" stopColor="#d8a25c" />
              <stop offset="1" stopColor="#2aa6ad" />
            </linearGradient>
            <linearGradient id="animalKingdomVillasKidaniIconWater" x1="38" y1="174" x2="223" y2="226">
              <stop offset="0" stopColor="#57ded6" />
              <stop offset="1" stopColor="#157080" />
            </linearGradient>
            <linearGradient id="animalKingdomVillasKidaniIconLodge" x1="65" y1="64" x2="197" y2="170">
              <stop offset="0" stopColor="#ee9e58" />
              <stop offset="1" stopColor="#8b4c2e" />
            </linearGradient>
            <linearGradient id="animalKingdomVillasKidaniIconBead" x1="69" y1="168" x2="174" y2="218">
              <stop offset="0" stopColor="#fff5a8" />
              <stop offset="0.55" stopColor="#e7b547" />
              <stop offset="1" stopColor="#4bb8a5" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#animalKingdomVillasKidaniIconSky)" />
          <path
            className="resort-card__story-icon-water"
            d="M39 177c34-24 76-24 111-9 29 13 56 10 74-8 3 28-13 53-42 64-43 17-106 9-137-16-13-10-16-21-6-31Z"
            fill="url(#animalKingdomVillasKidaniIconWater)"
          />
          <g className="resort-card__story-icon-kidani-overlook">
            <path
              d="M52 165c32-20 69-23 103-11 29 10 50 4 70-11"
              stroke="#15434a"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M62 164h138"
              stroke="#fff4cd"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M77 160v21m28-24v24m28-24v30m28-29v23m28-26v22"
              stroke="#15434a"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-kidani-village-arch">
            <path
              d="M58 147c19-35 41-63 70-85 30 22 52 50 71 85H58Z"
              fill="#6b3929"
              stroke="#153844"
              strokeWidth="7"
              strokeLinejoin="round"
            />
            <path
              d="M77 146c13-31 31-54 51-70 20 16 38 39 51 70H77Z"
              fill="url(#animalKingdomVillasKidaniIconLodge)"
              stroke="#153844"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M90 146c10-24 23-41 38-52 15 11 28 28 38 52"
              stroke="#ffd174"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M102 146c7-19 15-30 26-39 11 9 19 20 26 39h-52Z"
              fill="#1f4e56"
              stroke="#153844"
              strokeWidth="5"
            />
            <path d="M121 145v-24h14v24" fill="#fff2bd" stroke="#153844" strokeWidth="4" />
            <rect x="73" y="126" width="16" height="16" rx="3" fill="#c4f4e9" stroke="#153844" strokeWidth="4" />
            <rect x="167" y="126" width="16" height="16" rx="3" fill="#c4f4e9" stroke="#153844" strokeWidth="4" />
          </g>
          <g className="resort-card__story-icon-kidani-savanna-palms">
            <path d="M77 95c-3 15-6 24-11 34" stroke="#153844" strokeWidth="5" strokeLinecap="round" />
            <path d="M179 95c3 15 6 24 11 34" stroke="#153844" strokeWidth="5" strokeLinecap="round" />
            <path
              d="M69 96c12-7 21-8 32-4m54 0c11-4 21-3 33 4"
              stroke="#153844"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M79 95c9 4 14 11 15 21m83-21c-9 4-14 11-15 21"
              stroke="#4f7a35"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-kidani-community-play">
            <path
              d="M55 183c0-9 6-16 15-16h26c9 0 15 7 15 16"
              stroke="#fff0a6"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="72" cy="182" r="8" fill="#153844" />
            <circle cx="93" cy="182" r="8" fill="#153844" />
            <path d="M70 182h25" stroke="#f4d55c" strokeWidth="4" strokeLinecap="round" />
            <path
              d="m173 173 10-9 10 9-10 9-10-9Z"
              fill="#f5c84d"
              stroke="#153844"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          </g>
          <g className="resort-card__story-icon-kidani-string-of-memories">
            <path
              d="M70 196c21-14 43-19 67-14 17 3 32-1 47-11"
              stroke="#153844"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="76" cy="194" r="9" fill="url(#animalKingdomVillasKidaniIconBead)" stroke="#153844" strokeWidth="4" />
            <circle cx="100" cy="184" r="8" fill="#f39b4a" stroke="#153844" strokeWidth="4" />
            <circle cx="126" cy="181" r="9" fill="#fff4a8" stroke="#153844" strokeWidth="4" />
            <circle cx="153" cy="184" r="8" fill="#47b6a8" stroke="#153844" strokeWidth="4" />
          </g>
          <g className="resort-card__story-icon-kidani-savanna-life">
            <path d="M197 178c10-5 20-4 29 3" stroke="#153844" strokeWidth="5" strokeLinecap="round" />
            <path
              d="M209 160c2 13 10 21 22 25-13 3-22 11-25 24-3-13-10-21-23-25 13-3 22-11 26-24Z"
              fill="#fff1a6"
            />
            <circle cx="212" cy="184" r="5" fill="#153844" />
          </g>
          <g className="resort-card__story-icon-kidani-wellness">
            <path d="M42 70c8-16 20-23 36-24" stroke="#fff0a6" strokeWidth="7" strokeLinecap="round" />
            <path d="M46 69c12-7 25-7 37 0" stroke="#153844" strokeWidth="5" strokeLinecap="round" />
          </g>
          <g className="resort-card__story-icon-kidani-spark">
            <path d="m206 54 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#fff0a6" />
            <path d="m52 137 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#fff0a6" />
          </g>
        </svg>
      </span>
    );
  }

  if (slug === "art-of-animation-resort") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--art-of-animation-resort",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Art of Animation Resort icon: animation paper logo energy, Big Blue Pool and Finding Nemo water, Cars, Lion King and Little Mermaid story worlds, Animation Hall and Pixel Play arcade, Pride Rock movie lawn, and Skyliner movement"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="artOfAnimationIconSky" x1="38" y1="24" x2="224" y2="232">
              <stop offset="0" stopColor="#fff06c" />
              <stop offset="0.35" stopColor="#9bd742" />
              <stop offset="0.7" stopColor="#26b6dd" />
              <stop offset="1" stopColor="#7d4bc1" />
            </linearGradient>
            <linearGradient id="artOfAnimationIconWater" x1="33" y1="160" x2="224" y2="225">
              <stop offset="0" stopColor="#54e4ef" />
              <stop offset="1" stopColor="#1477b4" />
            </linearGradient>
            <linearGradient id="artOfAnimationIconPaper" x1="57" y1="55" x2="180" y2="164">
              <stop offset="0" stopColor="#fffdf4" />
              <stop offset="1" stopColor="#edf6ff" />
            </linearGradient>
            <linearGradient id="artOfAnimationIconBrush" x1="64" y1="88" x2="191" y2="143">
              <stop offset="0" stopColor="#f05563" />
              <stop offset="0.28" stopColor="#ffbf37" />
              <stop offset="0.55" stopColor="#38c77a" />
              <stop offset="0.78" stopColor="#2ca7df" />
              <stop offset="1" stopColor="#844dcc" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#artOfAnimationIconSky)" />
          <path
            className="resort-card__story-icon-water"
            d="M34 172c33-21 71-22 105-7 31 14 60 9 84-11 4 29-11 56-42 69-42 17-104 9-136-15-13-10-19-24-11-36Z"
            fill="url(#artOfAnimationIconWater)"
          />
          <g className="resort-card__story-icon-art-blue-pool">
            <path
              d="M45 194c29-13 64-15 96-4 27 9 56 4 81-11"
              stroke="#e7fbff"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M36 209c28 8 58 8 89-1"
              stroke="#55dce9"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-animation-paper">
            <path
              d="M58 78c23-22 55-26 81-11 21 12 43 8 64-9-7 24-10 47-1 76-25-16-49-18-73-5-24 13-50 7-74-12 13-13 13-26 3-39Z"
              fill="url(#artOfAnimationIconPaper)"
              stroke="#153844"
              strokeWidth="7"
              strokeLinejoin="round"
            />
            <path
              d="M73 107c23-14 53-16 80-4 16 7 33 6 46-4"
              stroke="url(#artOfAnimationIconBrush)"
              strokeWidth="13"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M79 86 89 76l11 12m64-3 10-10 11 12"
              stroke="#7f4cc1"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M92 128 106 116l14 12-14 12-14-12Z"
              fill="#ffcf3b"
              stroke="#153844"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M133 129c9-15 21-18 35-10-10 2-17 9-20 20-5-7-9-10-15-10Z"
              fill="#f05a68"
              stroke="#153844"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          </g>
          <g className="resort-card__story-icon-art-worlds">
            <path
              d="M60 152c12-17 32-20 50-7-20 3-32 13-38 29"
              fill="#f4a33d"
              stroke="#153844"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path d="M70 154c10-5 20-5 29 1" stroke="#fff4a6" strokeWidth="4" strokeLinecap="round" />
            <path
              d="M99 178c14-15 31-19 50-10-16 4-27 15-32 31"
              fill="#92d74d"
              stroke="#153844"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path d="M111 177c8-4 19-3 26 2" stroke="#fff4a6" strokeWidth="4" strokeLinecap="round" />
            <path
              d="M161 173c15-10 33-9 46 5-17-1-29 7-37 21"
              fill="#d9539f"
              stroke="#153844"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path d="M174 175c9-2 18 0 24 6" stroke="#fff4a6" strokeWidth="4" strokeLinecap="round" />
            <circle cx="183" cy="141" r="13" fill="#f47735" stroke="#153844" strokeWidth="5" />
            <path d="m174 132-12-9m29 7 11-11" stroke="#153844" strokeWidth="4" strokeLinecap="round" />
          </g>
          <g className="resort-card__story-icon-animation-hall">
            <path d="M49 62c14-14 32-18 53-12" stroke="#153844" strokeWidth="6" strokeLinecap="round" />
            <path d="M49 62c16-5 31-4 45 4" stroke="#fff7b9" strokeWidth="5" strokeLinecap="round" />
            <path
              d="m118 53 8-14 8 14"
              stroke="#153844"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="126" cy="55" r="6" fill="#ffcf3b" stroke="#153844" strokeWidth="4" />
          </g>
          <g className="resort-card__story-icon-art-skyliner">
            <path d="M197 54c15-6 28-3 38 9" stroke="#153844" strokeWidth="5" strokeLinecap="round" />
            <rect x="198" y="48" width="30" height="20" rx="8" fill="#53d6e5" stroke="#153844" strokeWidth="4" />
            <path d="M207 58h12" stroke="#fffdf4" strokeWidth="4" strokeLinecap="round" />
          </g>
          <g className="resort-card__story-icon-art-spark">
            <path d="m201 153 6 12 13 4-12 6-5 13-6-12-13-4 12-6 5-13Z" fill="#fff4a6" />
            <path d="m45 127 5 10 11 4-10 5-4 11-5-10-11-4 10-5 4-11Z" fill="#fff4a6" />
          </g>
        </svg>
      </span>
    );
  }

  if (slug === "yacht-club-resort") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--yacht-club-resort",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Yacht Club Resort icon: formal New England yacht club, lighthouse and red burgee, compass and anchor crest, Crescent Lake marina, Admiral Pool garden calm, Stormalong Bay, and Shipwreck Beach"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="yachtClubIconSky" x1="38" y1="28" x2="219" y2="230">
              <stop offset="0" stopColor="#fff3a5" />
              <stop offset="0.48" stopColor="#c8f1df" />
              <stop offset="1" stopColor="#5fc1d0" />
            </linearGradient>
            <linearGradient id="yachtClubIconWater" x1="37" y1="164" x2="221" y2="221">
              <stop offset="0" stopColor="#1f8fa7" />
              <stop offset="1" stopColor="#0b4d68" />
            </linearGradient>
            <linearGradient id="yachtClubIconFacade" x1="73" y1="86" x2="183" y2="173">
              <stop offset="0" stopColor="#fffdf1" />
              <stop offset="1" stopColor="#dfece7" />
            </linearGradient>
            <linearGradient id="yachtClubIconPool" x1="60" y1="180" x2="199" y2="213">
              <stop offset="0" stopColor="#b9f4e3" />
              <stop offset="1" stopColor="#49c4c4" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#yachtClubIconSky)" />
          <path
            className="resort-card__story-icon-water"
            d="M36 174c33-20 70-20 105-5 30 13 58 9 82-9 3 28-13 51-42 62-43 16-104 9-136-14-13-9-18-22-9-34Z"
            fill="url(#yachtClubIconWater)"
          />
          <g className="resort-card__story-icon-yacht-pool">
            <path
              d="M58 196c25-16 62-16 91-4 20 8 37 6 50-5 1 17-10 27-31 32-33 8-78 2-103-9-8-4-10-9-7-14Z"
              fill="url(#yachtClubIconPool)"
              stroke="#fff9d6"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M82 197c28-7 57-6 88 3"
              stroke="#f9fff0"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
          <g className="resort-card__story-icon-yacht-clubhouse">
            <path
              d="M70 104h116v61H70Z"
              fill="url(#yachtClubIconFacade)"
              stroke="#123c56"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M60 104 128 75l69 29H60Z"
              fill="#123c56"
              stroke="#123c56"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path d="M83 119h14v22H83Zm38 0h14v22h-14Zm38 0h14v22h-14Z" fill="#ffcf58" />
            <path d="M116 128h24v37h-24Z" fill="#123c56" />
            <path d="M62 154h132" stroke="#e9f2e7" strokeWidth="10" strokeLinecap="round" />
            <path d="M62 154h132" stroke="#123c56" strokeWidth="4" strokeLinecap="round" />
          </g>
          <g className="resort-card__story-icon-yacht-lighthouse">
            <path
              d="M105 66h47v77c0 9-7 16-16 16h-15c-9 0-16-7-16-16V66Z"
              fill="#f9fff0"
              stroke="#123c56"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path d="M105 111h47v12h-47Z" fill="#123c56" />
            <path d="M108 82h41v11h-41Z" fill="#123c56" />
            <rect x="96" y="54" width="64" height="24" rx="7" fill="#277997" stroke="#123c56" strokeWidth="6" />
            <path
              d="M103 54 128 36l25 18H103Z"
              fill="#123c56"
              stroke="#123c56"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path d="M128 30v20" stroke="#123c56" strokeWidth="4" strokeLinecap="round" />
            <path
              className="resort-card__story-icon-yacht-burgee"
              d="M130 31h28l-20 14-8-14Z"
              fill="#d83b43"
              stroke="#123c56"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path d="M95 67 63 55m98 12 33-12" stroke="#f9d667" strokeWidth="5" strokeLinecap="round" />
          </g>
          <g className="resort-card__story-icon-yacht-compass">
            <circle cx="193" cy="107" r="25" fill="#f9fff0" stroke="#123c56" strokeWidth="6" />
            <path
              d="m193 88 9 25-9-4-9 4 9-25Z"
              fill="#ffd052"
              stroke="#123c56"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d="m193 126-8-22 8 4 9-4-9 22Z"
              fill="#52c4c8"
              stroke="#123c56"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </g>
          <g className="resort-card__story-icon-yacht-anchor">
            <circle cx="63" cy="118" r="15" fill="#f9fff0" stroke="#123c56" strokeWidth="6" />
            <path d="M63 134v39m-14-27h28" stroke="#123c56" strokeWidth="7" strokeLinecap="round" />
            <path
              d="M63 173c-10-1-18-6-23-14m23 14c10-1 18-6 23-14"
              stroke="#123c56"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
          </g>
          <g className="resort-card__story-icon-yacht-shipwreck">
            <path d="M124 214h84" stroke="#e7bd70" strokeWidth="16" strokeLinecap="round" />
            <path d="M177 160 185 209m-25-37 43-9" stroke="#7a4726" strokeWidth="6" strokeLinecap="round" />
            <path
              d="M157 169 189 159l-13 35-19-25Z"
              fill="#fff0bd"
              stroke="#7a4726"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          </g>
          <g className="resort-card__story-icon-yacht-spark">
            <path d="m217 60 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#ffd052" />
            <path d="m46 80 4 8 8 4-8 4-4 8-4-8-8-4 8-4 4-8Z" fill="#52c4c8" />
            <circle cx="221" cy="139" r="4" fill="#ffd052" />
          </g>
        </svg>
      </span>
    );
  }

  if (slug === "wilderness-lodge") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--wilderness-lodge",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Wilderness Lodge icon: National Park lodge badge energy, pine forest, mountain and bear, timber lobby fireplace, Copper Creek Springs Pool rock waterslide, geyser, Bay Lake, and campfire glow"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="wildernessLodgeIconSky" x1="37" y1="28" x2="219" y2="231">
              <stop offset="0" stopColor="#ffe28a" />
              <stop offset="0.48" stopColor="#e8c07a" />
              <stop offset="1" stopColor="#15818b" />
            </linearGradient>
            <linearGradient id="wildernessLodgeIconWater" x1="34" y1="172" x2="221" y2="222">
              <stop offset="0" stopColor="#1c9ca0" />
              <stop offset="1" stopColor="#075664" />
            </linearGradient>
            <linearGradient id="wildernessLodgeIconTimber" x1="68" y1="81" x2="187" y2="171">
              <stop offset="0" stopColor="#8c4d25" />
              <stop offset="1" stopColor="#4b2817" />
            </linearGradient>
            <linearGradient id="wildernessLodgeIconFire" x1="118" y1="131" x2="137" y2="161">
              <stop offset="0" stopColor="#ffe45e" />
              <stop offset="1" stopColor="#e64b1f" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#wildernessLodgeIconSky)" />
          <path
            className="resort-card__story-icon-water"
            d="M35 174c33-19 70-20 106-6 31 13 58 8 81-11 4 29-13 53-42 64-43 16-104 9-136-14-13-10-17-22-9-33Z"
            fill="url(#wildernessLodgeIconWater)"
          />
          <g className="resort-card__story-icon-wilderness-mountains">
            <path
              d="M49 125 88 66l36 59H49Z"
              fill="#aab5ad"
              stroke="#432313"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M96 128 149 54l58 74H96Z"
              fill="#87949a"
              stroke="#432313"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path d="m79 79 11 18 9-10 13 38H67l12-46Z" fill="#fff1cf" />
            <path d="m139 69 15 21 10-12 23 50h-70l22-59Z" fill="#fff1cf" />
            <path
              d="M52 119h15l-8-28 23 46H43l18-46-9 28Zm32 7h15l-8-28 22 46H75l18-46-9 28Z"
              fill="#0f6d4e"
              stroke="#432313"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </g>
          <g className="resort-card__story-icon-wilderness-lodge">
            <path
              d="M69 107h118v60H69Z"
              fill="url(#wildernessLodgeIconTimber)"
              stroke="#432313"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M58 106 128 76l70 30H58Z"
              fill="#4b2817"
              stroke="#432313"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <rect x="110" y="124" width="35" height="43" rx="5" fill="#51534b" stroke="#432313" strokeWidth="4" />
            <path
              d="M128 132c7 9 11 18 9 29h-18c-2-12 2-21 9-29Z"
              fill="url(#wildernessLodgeIconFire)"
              stroke="#432313"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path d="M79 121h98m-98 21h98" stroke="#d2994c" strokeWidth="5" strokeLinecap="round" />
            <path d="M100 72h56v29h-56Z" fill="#6c3a1e" stroke="#432313" strokeWidth="5" strokeLinejoin="round" />
            <path d="M96 70h64" stroke="#432313" strokeWidth="6" strokeLinecap="round" />
          </g>
          <g className="resort-card__story-icon-wilderness-bear">
            <ellipse cx="177" cy="105" rx="23" ry="12" fill="#7a3f1f" stroke="#432313" strokeWidth="4" />
            <circle cx="200" cy="98" r="10" fill="#7a3f1f" stroke="#432313" strokeWidth="4" />
            <circle cx="207" cy="88" r="4" fill="#7a3f1f" stroke="#432313" strokeWidth="3" />
            <path d="M163 115v12m24-12v12" stroke="#432313" strokeWidth="5" strokeLinecap="round" />
          </g>
          <g className="resort-card__story-icon-wilderness-springs">
            <path
              d="M145 140 193 198h-76l28-58Z"
              fill="#715c45"
              stroke="#432313"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M153 161c13 8 27 17 42 30"
              stroke="#d89c4d"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M56 177c25 1 50 6 74 17"
              stroke="#7be2d0"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
            <path d="M202 135v-37m0 38-18-28m19 28 17-29" stroke="#d9fff4" strokeWidth="6" strokeLinecap="round" />
            <ellipse cx="202" cy="136" rx="16" ry="7" fill="#d9fff4" opacity="0.72" />
          </g>
          <g className="resort-card__story-icon-wilderness-water">
            <path d="M55 198c37-9 84-7 142 5" stroke="#b7f6e1" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M64 214c25 6 52 6 82 0" stroke="#53c9bf" strokeWidth="5" strokeLinecap="round" />
          </g>
          <g className="resort-card__story-icon-wilderness-spark">
            <path d="m218 61 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#ffe05b" />
            <path d="m46 82 4 8 8 4-8 4-4 8-4-8-8-4 8-4 4-8Z" fill="#58cfaa" />
            <circle cx="221" cy="169" r="4" fill="#ffe05b" />
          </g>
        </svg>
      </span>
    );
  }

  if (slug === "boulder-ridge-villas-at-wilderness-lodge") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--boulder-ridge-villas-at-wilderness-lodge",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Boulder Ridge Villas icon: American West railroad hotel inspiration, rustic villa home base, Boulder Ridge Cove Pool, zero-depth entry, whirlpool, shaded seating, pine shade, boulders, and Wilderness Lodge hearth warmth"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="boulderRidgeIconDusk" x1="38" y1="28" x2="218" y2="230">
              <stop offset="0" stopColor="#efc36d" />
              <stop offset="0.46" stopColor="#3f7765" />
              <stop offset="1" stopColor="#173f3a" />
            </linearGradient>
            <linearGradient id="boulderRidgeIconVilla" x1="74" y1="70" x2="167" y2="167">
              <stop offset="0" stopColor="#9a5d2d" />
              <stop offset="1" stopColor="#63361c" />
            </linearGradient>
            <linearGradient id="boulderRidgeIconPool" x1="47" y1="162" x2="190" y2="212">
              <stop offset="0" stopColor="#78ddd9" />
              <stop offset="1" stopColor="#1492a3" />
            </linearGradient>
            <linearGradient id="boulderRidgeIconLantern" x1="111" y1="48" x2="128" y2="80">
              <stop offset="0" stopColor="#ffe46d" />
              <stop offset="1" stopColor="#f47431" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#boulderRidgeIconDusk)" />
          <circle cx="126" cy="110" r="90" fill="#3f7765" opacity="0.7" />
          <g className="resort-card__story-icon-boulder-pines">
            <path
              d="M38 128 56 88l18 40H38Z"
              fill="#1b6a43"
              stroke="#382313"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M31 154 56 103l25 51H31Z"
              fill="#175c3b"
              stroke="#382313"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path d="M52 153v43" stroke="#65411f" strokeWidth="6" strokeLinecap="round" />
            <path
              d="M177 129 198 83l21 46h-42Z"
              fill="#1b6a43"
              stroke="#382313"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M168 158 198 104l30 54h-60Z"
              fill="#175c3b"
              stroke="#382313"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path d="M194 157v45" stroke="#65411f" strokeWidth="6" strokeLinecap="round" />
          </g>
          <g className="resort-card__story-icon-boulder-villa">
            <path
              d="M65 118 104 78l39 40H65Z"
              fill="#7b4826"
              stroke="#382313"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M100 119 140 75l48 44H100Z"
              fill="#6f3f21"
              stroke="#382313"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M82 117h101v60H82Z"
              fill="url(#boulderRidgeIconVilla)"
              stroke="#382313"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <rect x="98" y="132" width="17" height="24" rx="4" fill="#ffc765" />
            <rect x="146" y="132" width="18" height="24" rx="4" fill="#ffc765" />
            <path
              d="M92 169h82"
              stroke="#3b2314"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M98 168v13m20-13v13m20-13v13m20-13v13"
              stroke="#d99c53"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-boulder-lantern">
            <rect
              x="112"
              y="47"
              width="20"
              height="31"
              rx="7"
              fill="#2c1b12"
              stroke="#d59f4c"
              strokeWidth="4"
            />
            <ellipse cx="122" cy="61" rx="7" ry="10" fill="url(#boulderRidgeIconLantern)" />
            <path
              d="M116 47c2-7 10-7 12 0"
              stroke="#2c1b12"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </g>
          <g className="resort-card__story-icon-boulder-rails">
            <path
              d="M48 187h148"
              stroke="#3b2314"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M60 176v24m24-24v24m24-24v24m24-24v24m24-24v24m24-24v24"
              stroke="#875a2d"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-boulder-cove">
            <ellipse
              cx="117"
              cy="189"
              rx="75"
              ry="31"
              fill="url(#boulderRidgeIconPool)"
              stroke="#ecd8a3"
              strokeWidth="5"
            />
            <path
              d="M68 187c27-12 64-12 99 2"
              stroke="#c8fbef"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <circle
              cx="163"
              cy="183"
              r="15"
              fill="#238a91"
              stroke="#d7f4e8"
              strokeWidth="4"
            />
          </g>
          <g className="resort-card__story-icon-boulder-rocks">
            <ellipse cx="66" cy="171" rx="14" ry="9" fill="#806f56" stroke="#3b3025" strokeWidth="3" />
            <ellipse cx="44" cy="193" rx="10" ry="7" fill="#9a8667" stroke="#3b3025" strokeWidth="3" />
            <ellipse cx="88" cy="218" rx="11" ry="7" fill="#8d7a5b" stroke="#3b3025" strokeWidth="3" />
            <ellipse cx="194" cy="190" rx="12" ry="9" fill="#8d7a5b" stroke="#3b3025" strokeWidth="3" />
            <ellipse cx="209" cy="205" rx="8" ry="6" fill="#9a8667" stroke="#3b3025" strokeWidth="3" />
          </g>
          <g className="resort-card__story-icon-boulder-spark">
            <circle cx="79" cy="49" r="4" fill="#ffd766" />
            <circle cx="208" cy="134" r="4" fill="#ffd766" />
            <path d="m203 50 4 8 8 4-8 4-4 8-4-8-8-4 8-4 4-8Z" fill="#ffd766" />
          </g>
        </svg>
      </span>
    );
  }

  if (slug === "copper-creek-villas-and-cabins-at-wilderness-lodge") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--copper-creek-villas-and-cabins-at-wilderness-lodge",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Copper Creek Villas & Cabins icon: Pacific Northwest rustic-elegant waterfront cabins, Bay Lake, wraparound porch, hidden trails, railway-past details, Copper Creek Springs Pool, rock waterslide, whirlpool spas, and Geyser Point glow"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="copperCreekIconDusk" x1="36" y1="29" x2="220" y2="231">
              <stop offset="0" stopColor="#eabf70" />
              <stop offset="0.5" stopColor="#487868" />
              <stop offset="1" stopColor="#123936" />
            </linearGradient>
            <linearGradient id="copperCreekIconCabin" x1="70" y1="78" x2="169" y2="169">
              <stop offset="0" stopColor="#96582a" />
              <stop offset="1" stopColor="#583017" />
            </linearGradient>
            <linearGradient id="copperCreekIconWater" x1="35" y1="176" x2="205" y2="222">
              <stop offset="0" stopColor="#79ddd7" />
              <stop offset="1" stopColor="#0b7d91" />
            </linearGradient>
            <linearGradient id="copperCreekIconFire" x1="169" y1="130" x2="186" y2="163">
              <stop offset="0" stopColor="#ffe16f" />
              <stop offset="1" stopColor="#f47a31" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#copperCreekIconDusk)" />
          <circle cx="128" cy="111" r="90" fill="#477c69" opacity="0.68" />
          <g className="resort-card__story-icon-copper-trails">
            <path
              d="M36 128 58 78l22 50H36Z"
              fill="#1a6b42"
              stroke="#342012"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M27 158 58 99l31 59H27Z"
              fill="#12583a"
              stroke="#342012"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path d="M54 155v42" stroke="#66401f" strokeWidth="6" strokeLinecap="round" />
            <path
              d="M174 128 198 76l24 52h-48Z"
              fill="#1a6b42"
              stroke="#342012"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M164 160 198 100l34 60h-68Z"
              fill="#12583a"
              stroke="#342012"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path d="M194 158v43" stroke="#66401f" strokeWidth="6" strokeLinecap="round" />
          </g>
          <g className="resort-card__story-icon-copper-cabin">
            <path
              d="M57 119 116 66l61 53H57Z"
              fill="#543017"
              stroke="#342012"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M73 114h101v56H73Z"
              fill="url(#copperCreekIconCabin)"
              stroke="#342012"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <rect x="91" y="130" width="20" height="25" rx="5" fill="#ffc765" />
            <rect x="125" y="127" width="21" height="43" rx="5" fill="#321d11" />
            <ellipse cx="160" cy="134" rx="7" ry="12" fill="url(#copperCreekIconFire)" stroke="#342012" strokeWidth="3" />
            <path
              d="M64 166h119"
              stroke="#362014"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path
              d="M78 164v17m22-17v17m22-17v17m22-17v17m22-17v17"
              stroke="#d69a4d"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-copper-rails">
            <path
              d="M48 190h149"
              stroke="#342012"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M60 179v24m24-24v24m24-24v24m24-24v24m24-24v24m24-24v24"
              stroke="#855229"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-copper-water">
            <ellipse
              cx="116"
              cy="197"
              rx="82"
              ry="29"
              fill="url(#copperCreekIconWater)"
              stroke="#d9bd73"
              strokeWidth="5"
            />
            <path
              d="M65 193c28-13 63-13 99 1"
              stroke="#d3fff0"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path
              d="M114 151c8 17 7 33-4 48"
              stroke="#9cf3dd"
              strokeWidth="15"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M117 151c7 15 6 29-3 44"
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.72"
              fill="none"
            />
          </g>
          <g className="resort-card__story-icon-copper-slide">
            <path
              d="M143 139 190 200h-72l25-61Z"
              fill="#82725a"
              stroke="#342012"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M151 161c15 9 29 21 42 35"
              stroke="#d99645"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
            <circle
              cx="170"
              cy="189"
              r="15"
              fill="#1a8190"
              stroke="#d3fff0"
              strokeWidth="4"
            />
          </g>
          <g className="resort-card__story-icon-copper-boulders">
            <ellipse cx="57" cy="177" rx="13" ry="9" fill="#83765d" stroke="#342012" strokeWidth="3" />
            <ellipse cx="42" cy="217" rx="9" ry="6" fill="#958568" stroke="#342012" strokeWidth="3" />
            <ellipse cx="101" cy="225" rx="11" ry="7" fill="#83765d" stroke="#342012" strokeWidth="3" />
            <ellipse cx="197" cy="208" rx="13" ry="9" fill="#958568" stroke="#342012" strokeWidth="3" />
          </g>
          <g className="resort-card__story-icon-copper-geyser">
            <ellipse cx="207" cy="164" rx="7" ry="13" fill="url(#copperCreekIconFire)" stroke="#342012" strokeWidth="3" />
            <path
              d="M207 149v-24m0 25-10-18m11 18 10-18"
              stroke="#d9fff3"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </g>
          <g className="resort-card__story-icon-copper-spark">
            <circle cx="82" cy="51" r="4" fill="#ffd766" />
            <circle cx="218" cy="136" r="4" fill="#ffd766" />
            <path d="m208 48 4 8 8 4-8 4-4 8-4-8-8-4 8-4 4-8Z" fill="#ffd766" />
          </g>
        </svg>
      </span>
    );
  }

  if (slug === "cabins-at-fort-wilderness-resort") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--cabins-at-fort-wilderness-resort",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="The Cabins at Disney's Fort Wilderness Resort icon: Rustic American Frontier cabin base camp, Fort Wilderness pine and cypress trails, Reception Outpost golf cart movement, Wilderness Swimmin' Pool and Meadow Swimmin' Pool water, Campground Theater campfire and movies with Chip 'n' Dale, Bike Barn adventure, and a small Tri-Circle-D Ranch horseshoe"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="fortCabinsIconDusk" x1="40" y1="30" x2="220" y2="228">
              <stop offset="0" stopColor="#ffe8a5" />
              <stop offset="0.48" stopColor="#bc7a43" />
              <stop offset="1" stopColor="#163f3a" />
            </linearGradient>
            <linearGradient id="fortCabinsIconTrail" x1="50" y1="169" x2="213" y2="230">
              <stop offset="0" stopColor="#c98f5e" />
              <stop offset="1" stopColor="#6b3e25" />
            </linearGradient>
            <linearGradient id="fortCabinsIconPool" x1="54" y1="179" x2="205" y2="220">
              <stop offset="0" stopColor="#65d7ce" />
              <stop offset="1" stopColor="#16798a" />
            </linearGradient>
            <linearGradient id="fortCabinsIconFire" x1="181" y1="154" x2="204" y2="199">
              <stop offset="0" stopColor="#fff2a6" />
              <stop offset="0.48" stopColor="#ff9a3d" />
              <stop offset="1" stopColor="#cc442f" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#fortCabinsIconDusk)" />
          <path
            d="M32 175c24-21 56-34 91-38 35-5 73 2 101 20 2 35-26 64-78 72-53 8-102-6-119-31-7-11-5-18 5-23Z"
            fill="#275a40"
            opacity="0.9"
          />
          <g
            className="resort-card__story-icon-fort-cabins-pines"
            stroke="#143b34"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M55 162 75 94l19 68H55Z" fill="#244d37" />
            <path d="M32 169 57 78l28 91H32Z" fill="#1d4433" />
            <path d="M197 164 217 86l24 82h-44Z" fill="#1d4433" />
            <path d="M170 162 191 100l18 62h-39Z" fill="#2b6546" />
          </g>
          <path
            d="M48 194c38-28 82-35 151-18 14 4 23 16 17 28-16 29-126 35-164 10-9-6-11-14-4-20Z"
            fill="url(#fortCabinsIconTrail)"
          />
          <g className="resort-card__story-icon-fort-cabins-pool">
            <path
              d="M72 197c31-13 65-12 102 3 14 6 28 4 40-4-6 23-37 35-84 35-45 0-68-13-58-34Z"
              fill="url(#fortCabinsIconPool)"
              opacity="0.95"
            />
            <path
              d="M156 188c12-18 10-35-2-48h32c-12 18-13 34-4 49"
              stroke="#f8d867"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M173 137h24l-12-15-12 15Z"
              fill="#ffce4a"
              stroke="#143b34"
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </g>
          <g
            className="resort-card__story-icon-fort-cabins-cabin"
            stroke="#143b34"
            strokeWidth="6"
            strokeLinejoin="round"
          >
            <path d="M66 132h87l20 40H47l19-40Z" fill="#714526" />
            <path d="M82 92h57l40 42H42l40-42Z" fill="#4d2e20" />
            <path d="M80 121h64v51H80Z" fill="#a86535" />
            <path d="M93 138h18v34H93Z" fill="#5e3825" />
            <path d="M123 138h25v19h-25Z" fill="#ffdc87" />
            <path d="M61 151h19m69 0h16" fill="none" />
          </g>
          <g className="resort-card__story-icon-fort-cabins-golf-cart">
            <path
              d="M50 177h53c8 0 15 6 17 14l3 13H43l3-18c1-5 2-9 4-9Z"
              fill="#f1c34e"
              stroke="#143b34"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M61 158h43l14 19H54l7-19Z"
              fill="#f9df78"
              stroke="#143b34"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path d="M77 160v16m20-16v16" stroke="#143b34" strokeWidth="5" strokeLinecap="round" />
            <circle cx="62" cy="205" r="10" fill="#143b34" />
            <circle cx="102" cy="205" r="10" fill="#143b34" />
            <circle cx="62" cy="205" r="4" fill="#ffe9a7" />
            <circle cx="102" cy="205" r="4" fill="#ffe9a7" />
          </g>
          <g className="resort-card__story-icon-fort-cabins-movie">
            <path
              d="M178 140h46v31h-46Z"
              fill="#f8f0d3"
              stroke="#143b34"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path d="m194 148 18 8-18 8v-16Z" fill="#275a40" />
          </g>
          <g
            className="resort-card__story-icon-fort-cabins-campfire"
            stroke="#143b34"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M187 202h25" />
            <path d="M191 194c-7-13 1-23 6-31 7 10 14 21 5 31" fill="url(#fortCabinsIconFire)" />
            <path d="M184 207 213 194M214 207l-31-14" />
          </g>
          <g className="resort-card__story-icon-fort-cabins-horseshoe">
            <path
              d="M204 72c-11 8-13 25-5 35 7 9 24 9 31 0 8-10 6-27-5-35"
              stroke="#ffd46f"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M200 75c6 4 20 4 27 0"
              stroke="#143b34"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.8"
              fill="none"
            />
          </g>
          <g className="resort-card__story-icon-fort-cabins-spark">
            <path d="m222 51 5 11 11 5-11 5-5 11-5-11-11-5 11-5 5-11Z" fill="#ffe06b" />
            <path d="m42 86 4 8 8 4-8 4-4 8-4-8-8-4 8-4 4-8Z" fill="#ffe06b" />
          </g>
        </svg>
      </span>
    );
  }

  if (slug === "campsites-at-fort-wilderness-resort") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--campsites-at-fort-wilderness-resort",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="The Campsites at Disney's Fort Wilderness Resort icon: backcountry campground magic with Campsites tent and RV loops, pine and cypress groves, Meadow Recreation Area, Chip 'n' Dale campfire movies, Pioneer Hall wagon rides, Tri-Circle-D Ranch trails, Bike Barn movement, and Electrical Water Pageant shoreline sparkle"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="fortCampsitesIconDusk" x1="38" y1="28" x2="222" y2="231">
              <stop offset="0" stopColor="#ffe7a6" />
              <stop offset="0.42" stopColor="#c48145" />
              <stop offset="1" stopColor="#133c38" />
            </linearGradient>
            <linearGradient id="fortCampsitesIconGround" x1="34" y1="169" x2="224" y2="229">
              <stop offset="0" stopColor="#446d42" />
              <stop offset="1" stopColor="#163f36" />
            </linearGradient>
            <linearGradient id="fortCampsitesIconWater" x1="53" y1="197" x2="213" y2="226">
              <stop offset="0" stopColor="#65d6cf" />
              <stop offset="1" stopColor="#14798c" />
            </linearGradient>
            <linearGradient id="fortCampsitesIconCanvas" x1="60" y1="104" x2="146" y2="178">
              <stop offset="0" stopColor="#fff0b8" />
              <stop offset="1" stopColor="#e4a24b" />
            </linearGradient>
            <linearGradient id="fortCampsitesIconFire" x1="152" y1="151" x2="177" y2="202">
              <stop offset="0" stopColor="#fff6a6" />
              <stop offset="0.47" stopColor="#ff9a3d" />
              <stop offset="1" stopColor="#c8432e" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#fortCampsitesIconDusk)" />
          <path
            d="M31 174c28-24 60-37 99-39 43-3 79 10 99 31 4 32-25 60-80 66-58 6-106-10-123-35-6-9-4-16 5-23Z"
            fill="url(#fortCampsitesIconGround)"
          />
          <g
            className="resort-card__story-icon-fort-campsites-pines"
            stroke="#123b34"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M39 160 61 82l25 78H39Z" fill="#1c5138" />
            <path d="M21 177 54 105l35 72H21Z" fill="#174432" />
            <path d="M200 157 219 87l22 72h-41Z" fill="#1c5138" />
            <path d="M181 178 210 112l32 66h-61Z" fill="#174432" />
          </g>
          <g className="resort-card__story-icon-fort-campsites-water">
            <path
              d="M70 203c34-12 69-10 105 5 15 6 29 3 43-8-8 21-42 32-90 31-43-1-67-12-58-28Z"
              fill="url(#fortCampsitesIconWater)"
              opacity="0.92"
            />
            <circle cx="207" cy="202" r="4" fill="#fff1a0" />
            <circle cx="219" cy="194" r="3" fill="#7ee0d8" />
            <circle cx="225" cy="207" r="3" fill="#fff1a0" />
          </g>
          <g
            className="resort-card__story-icon-fort-campsites-tent"
            stroke="#123b34"
            strokeWidth="6"
            strokeLinejoin="round"
          >
            <path d="M61 169 101 91l45 78H61Z" fill="url(#fortCampsitesIconCanvas)" />
            <path d="M101 91v78" strokeLinecap="round" />
            <path d="M76 169h86l-30-50-31 50H76Z" fill="#b86332" />
            <path d="M101 169h31l-31-50v50Z" fill="#653721" opacity="0.88" />
          </g>
          <g
            className="resort-card__story-icon-fort-campsites-rv"
            stroke="#123b34"
            strokeWidth="5"
            strokeLinejoin="round"
          >
            <path d="M33 157h44c12 0 22 8 24 20l4 22H29l4-42Z" fill="#f3f0d0" />
            <path d="M42 137h39c13 0 25 8 30 20H33l9-20Z" fill="#d8e7dc" />
            <path d="M49 167h15v16H49Z" fill="#ffd966" />
            <path d="M72 167h17v16H72Z" fill="#ffd966" />
            <circle cx="47" cy="200" r="9" fill="#123b34" />
            <circle cx="86" cy="200" r="9" fill="#123b34" />
          </g>
          <g
            className="resort-card__story-icon-fort-campsites-campfire"
            stroke="#123b34"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M150 202h30" />
            <path d="M157 194c-8-14 1-26 8-35 8 11 17 23 7 35" fill="url(#fortCampsitesIconFire)" />
            <path d="M151 207 181 194M182 207l-32-14" />
          </g>
          <g
            className="resort-card__story-icon-fort-campsites-movie"
            stroke="#123b34"
            strokeWidth="5"
            strokeLinejoin="round"
          >
            <path d="M176 134h49v31h-49Z" fill="#f7efd2" />
            <path d="m194 142 18 8-18 8v-16Z" fill="#275a40" strokeWidth="0" />
          </g>
          <g
            className="resort-card__story-icon-fort-campsites-wagon"
            stroke="#123b34"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M177 103h37l9 25h-55l9-25Z" fill="#b56c32" />
            <path d="M183 102c6-14 25-14 31 0" fill="none" />
            <circle cx="182" cy="130" r="6" fill="#f5d279" />
            <circle cx="213" cy="130" r="6" fill="#f5d279" />
            <path d="M170 119c-11-4-18-3-27 5" fill="none" />
          </g>
          <g
            className="resort-card__story-icon-fort-campsites-wildlife"
            stroke="#123b34"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M130 73c5 5 6 13 2 20-4-6-5-13-2-20Z" fill="#d5b36c" />
            <path d="M127 92c-6 4-11 3-15-2" fill="none" />
            <path d="M136 91c6 3 11 2 15-3" fill="none" />
          </g>
          <g className="resort-card__story-icon-fort-campsites-spark">
            <path d="m220 48 5 11 11 5-11 5-5 11-5-11-11-5 11-5 5-11Z" fill="#ffe56f" />
            <path d="m38 86 4 8 8 4-8 4-4 8-4-8-8-4 8-4 4-8Z" fill="#ffe56f" />
          </g>
        </svg>
      </span>
    );
  }

  if (slug === "old-key-west-resort") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--old-key-west-resort",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Disney's Old Key West Resort icon: Conch Flats Florida Keys village, Sandcastle Pool with 125-foot waterslide, lighthouse sauna, dolphin fountain, swaying palms, shimmering canal, Lake Buena Vista Golf Course fairways, surrey bikes from Hank's Rent 'N Return, Conch Flats Community Hall, and Electric Eel Gameroom sparkle"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="oldKeyWestIconSky" x1="37" y1="28" x2="222" y2="229">
              <stop offset="0" stopColor="#fff0b8" />
              <stop offset="0.43" stopColor="#f6a66d" />
              <stop offset="1" stopColor="#36b7c5" />
            </linearGradient>
            <linearGradient id="oldKeyWestIconWater" x1="40" y1="178" x2="226" y2="229">
              <stop offset="0" stopColor="#5addd3" />
              <stop offset="1" stopColor="#14798a" />
            </linearGradient>
            <linearGradient id="oldKeyWestIconSand" x1="78" y1="139" x2="179" y2="207">
              <stop offset="0" stopColor="#fff2b6" />
              <stop offset="1" stopColor="#d99b55" />
            </linearGradient>
            <linearGradient id="oldKeyWestIconVilla" x1="58" y1="78" x2="163" y2="168">
              <stop offset="0" stopColor="#ffe6d8" />
              <stop offset="1" stopColor="#e77b74" />
            </linearGradient>
            <linearGradient id="oldKeyWestIconLighthouse" x1="173" y1="73" x2="210" y2="158">
              <stop offset="0" stopColor="#fffbe2" />
              <stop offset="1" stopColor="#f6c16c" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#oldKeyWestIconSky)" />
          <path
            d="M35 178c26-20 61-27 94-20 28 6 49 23 91 6 3 30-18 56-61 65-53 11-111-8-127-31-6-8-5-14 3-20Z"
            fill="#76be73"
          />
          <path
            className="resort-card__story-icon-old-key-west-water"
            d="M45 194c33-15 67-16 103-2 23 9 49 6 73-9-3 24-30 42-71 45-46 4-87-8-105-25-4-4-4-6 0-9Z"
            fill="url(#oldKeyWestIconWater)"
            opacity="0.95"
          />
          <path
            d="M70 205c31-11 65-10 104 4"
            stroke="#fdf2c1"
            strokeWidth="7"
            strokeLinecap="round"
            opacity="0.78"
            fill="none"
          />
          <path
            className="resort-card__story-icon-old-key-west-fairway"
            d="M46 166c33-25 83-27 132-6"
            stroke="#2e6d4b"
            strokeWidth="9"
            strokeLinecap="round"
            opacity="0.5"
            fill="none"
          />
          <g
            className="resort-card__story-icon-old-key-west-palms"
            stroke="#163f39"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M48 172c8-35 13-69 12-103" fill="none" />
            <path d="M61 74c-17-4-27 3-34 17 18-4 30-8 34-17Z" fill="#2e8b5e" />
            <path d="M61 73c10-15 24-17 40-9-16 9-28 13-40 9Z" fill="#35a66b" />
            <path d="M61 74c9 8 14 20 14 36-11-9-16-21-14-36Z" fill="#2d8e61" />
            <path d="M61 74c-11-17-23-20-37-11 15 8 27 12 37 11Z" fill="#3aae70" />
            <path d="M210 165c-5-29-7-57-3-83" fill="none" />
            <path d="M207 84c-15-8-26-4-35 7 16 0 28-2 35-7Z" fill="#32965e" />
            <path d="M207 83c12-13 25-12 38-3-16 7-28 9-38 3Z" fill="#39ad70" />
            <path d="M207 84c8 10 10 22 6 36-8-11-10-22-6-36Z" fill="#2e8f61" />
          </g>
          <g
            className="resort-card__story-icon-old-key-west-villa"
            stroke="#153b45"
            strokeWidth="5"
            strokeLinejoin="round"
          >
            <path d="M58 132h97v44H58v-44Z" fill="url(#oldKeyWestIconVilla)" />
            <path d="m50 132 28-34h61l25 34H50Z" fill="#6fc7c8" />
            <path d="m82 100 22-25 26 25H82Z" fill="#ffe8d5" />
            <path d="M96 95h17v37H96V95Z" fill="#f6a76e" />
            <path d="M72 147h19v29H72v-29Z" fill="#fff4cb" />
            <path d="M107 145h25v19h-25v-19Z" fill="#fff4cb" />
            <path d="M58 176h102" fill="none" />
            <path d="M64 184h87" strokeWidth="7" strokeLinecap="round" fill="none" />
          </g>
          <g
            className="resort-card__story-icon-old-key-west-sandcastle"
            stroke="#153b45"
            strokeWidth="5"
            strokeLinejoin="round"
          >
            <path d="M89 161h83v43H89v-43Z" fill="url(#oldKeyWestIconSand)" />
            <path d="M102 142h22v19h-22v-19Z" fill="#f7d37c" />
            <path d="M139 136h24v25h-24v-25Z" fill="#f7d37c" />
            <path d="M94 161v-12h14v12m11 0v-13h14v13m11 0v-13h14v13" fill="#ffe7a3" />
            <path d="M103 204c17-15 39-18 62-1" fill="#d68a48" />
          </g>
          <g
            className="resort-card__story-icon-old-key-west-lighthouse"
            stroke="#153b45"
            strokeWidth="5"
            strokeLinejoin="round"
          >
            <path d="M176 126h31l-5 70h-21l-5-70Z" fill="url(#oldKeyWestIconLighthouse)" />
            <path d="m173 126 18-28 19 28h-37Z" fill="#e35f5f" />
            <path d="M184 82h15v21h-15V82Z" fill="#fff4cb" />
            <path d="M178 140h27m-25 18h24m-23 18h21" strokeWidth="4" fill="none" />
          </g>
          <g
            className="resort-card__story-icon-old-key-west-dolphin"
            stroke="#153b45"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M170 185c13-14 27-14 38-4-14-2-23 3-29 14Z" fill="#75c8d0" />
            <path d="M197 174c10-8 21-5 27 6" fill="none" />
            <path d="M194 172c-3-8 0-15 8-19" fill="none" />
          </g>
          <g
            className="resort-card__story-icon-old-key-west-surrey"
            stroke="#153b45"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="57" cy="207" r="9" fill="#fff0ac" />
            <circle cx="91" cy="207" r="9" fill="#fff0ac" />
            <path d="m57 207 13-19h14l7 19m-21-19 8 19m-14-26h27" fill="none" />
            <path d="M63 178h29l-5-10H68l-5 10Z" fill="#f4c45b" />
          </g>
          <g className="resort-card__story-icon-old-key-west-spark">
            <path d="m221 49 6 13 14 6-14 6-6 14-6-14-14-6 14-6 6-13Z" fill="#ffe76e" />
            <path d="m37 89 4 9 10 4-10 4-4 10-4-10-10-4 10-4 4-9Z" fill="#ffe76e" />
            <path
              d="M222 51c-11 3-14 8-5 14 10 6 9 11-1 17"
              stroke="#153b45"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        </svg>
      </span>
    );
  }

  if (slug === "polynesian-village-resort") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--polynesian-village-resort",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Disney's Polynesian Village Resort icon: South Pacific arrival fantasy with Great Ceremonial House roofline, tiki torch and lei welcome, Lava Pool volcano with 142 foot-long waterslide, Moana canoe and splash-area spirit, Seven Seas Lagoon beach, monorail glide, Seven Seas Marina, and Electrical Water Pageant sparkle"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="polynesianVillageIconSky" x1="35" y1="28" x2="222" y2="230">
              <stop offset="0" stopColor="#ffeca6" />
              <stop offset="0.45" stopColor="#f08a4b" />
              <stop offset="1" stopColor="#1399a4" />
            </linearGradient>
            <linearGradient id="polynesianVillageIconLagoon" x1="37" y1="173" x2="226" y2="229">
              <stop offset="0" stopColor="#57e1d3" />
              <stop offset="1" stopColor="#0b7184" />
            </linearGradient>
            <linearGradient id="polynesianVillageIconVolcano" x1="82" y1="82" x2="158" y2="190">
              <stop offset="0" stopColor="#6d4d35" />
              <stop offset="1" stopColor="#2f5d4c" />
            </linearGradient>
            <linearGradient id="polynesianVillageIconHouse" x1="50" y1="96" x2="143" y2="166">
              <stop offset="0" stopColor="#ffd68c" />
              <stop offset="1" stopColor="#b86935" />
            </linearGradient>
            <linearGradient id="polynesianVillageIconFire" x1="45" y1="132" x2="65" y2="179">
              <stop offset="0" stopColor="#fff39a" />
              <stop offset="0.5" stopColor="#ff9a3a" />
              <stop offset="1" stopColor="#c6412f" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#polynesianVillageIconSky)" />
          <path
            d="M32 175c29-22 70-26 106-15 29 9 53 12 87-4 4 32-19 63-68 73-55 12-110-7-127-32-6-9-5-16 2-22Z"
            fill="#79b760"
          />
          <path
            className="resort-card__story-icon-polynesian-lagoon"
            d="M40 194c36-18 71-18 109-3 25 10 51 6 75-11-3 25-30 46-75 50-50 4-92-10-109-28-4-4-4-6 0-8Z"
            fill="url(#polynesianVillageIconLagoon)"
          />
          <path
            d="M64 207c33-13 69-12 111 3"
            stroke="#fff0b3"
            strokeWidth="7"
            strokeLinecap="round"
            opacity="0.8"
            fill="none"
          />
          <g
            className="resort-card__story-icon-polynesian-palms"
            stroke="#123d37"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M39 177c10-42 15-76 13-108" fill="none" />
            <path d="M52 72c-16-4-27 3-34 18 18-3 30-8 34-18Z" fill="#25895d" />
            <path d="M53 71c12-14 27-14 42-5-17 8-30 11-42 5Z" fill="#3aae71" />
            <path d="M52 72c10 11 15 24 13 40-10-11-15-24-13-40Z" fill="#2e965f" />
            <path d="M53 72c-10-16-22-20-36-12 15 10 26 14 36 12Z" fill="#41b875" />
            <path d="M214 166c-5-29-7-55-3-81" fill="none" />
            <path d="M211 86c-16-6-27-1-35 12 15-2 28-5 35-12Z" fill="#2f965e" />
            <path d="M211 86c13-12 26-9 38 1-16 5-28 6-38-1Z" fill="#43b977" />
            <path d="M211 86c8 11 10 23 5 37-8-11-9-23-5-37Z" fill="#2f945f" />
          </g>
          <g
            className="resort-card__story-icon-polynesian-house"
            stroke="#133b43"
            strokeWidth="5"
            strokeLinejoin="round"
          >
            <path d="m50 139 28-33h56l28 33H50Z" fill="#6d3f2d" />
            <path d="M59 139h92v42H59v-42Z" fill="url(#polynesianVillageIconHouse)" />
            <path d="M70 155h22v26H70v-26Z" fill="#ffeec4" />
            <path d="M106 151h30v17h-30v-17Z" fill="#ffeec4" />
            <path d="m61 139 23-22h44l23 22" stroke="#ffe49d" strokeWidth="4" fill="none" />
            <path d="M58 187h96" strokeWidth="7" strokeLinecap="round" fill="none" />
            <path d="m85 101 19-22 20 22H85Z" fill="#f6c267" />
          </g>
          <g
            className="resort-card__story-icon-polynesian-volcano"
            stroke="#133b43"
            strokeWidth="5"
            strokeLinejoin="round"
          >
            <path d="M95 185c6-38 18-75 40-108 19 31 32 69 38 108H95Z" fill="url(#polynesianVillageIconVolcano)" />
            <path
              d="M126 96c8 15 12 29 9 49 12-12 16-27 9-45"
              stroke="#ffb04c"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              className="resort-card__story-icon-polynesian-slide"
              d="M117 184c13-25 34-29 52-9"
              stroke="#72d7d1"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M109 188c20-12 42-12 65 2"
              stroke="#fff1aa"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.9"
              fill="none"
            />
            <path
              d="M124 80c6-11 16-10 22 0"
              stroke="#ffdf74"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
          </g>
          <g
            className="resort-card__story-icon-polynesian-canoe"
            stroke="#133b43"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M163 201c15-8 33-8 48 1-13 7-33 7-48-1Z" fill="#b96534" />
            <path d="M184 193v-34" fill="none" />
            <path d="M184 160c14 6 23 16 27 29-13-3-21-12-27-29Z" fill="#f7df82" />
            <path d="M176 171c-8 7-11 15-8 24" fill="none" />
          </g>
          <g
            className="resort-card__story-icon-polynesian-monorail"
            stroke="#133b43"
            strokeWidth="4"
            strokeLinejoin="round"
          >
            <path
              d="M142 61c25-10 51-10 76 0"
              stroke="#fff3c3"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
            <path d="M149 58h56c8 0 14 5 16 12h-82c2-7 6-12 10-12Z" fill="#f6f2e5" />
            <path d="M163 64h17m7 0h16" stroke="#2998a3" strokeWidth="4" strokeLinecap="round" />
            <path d="M138 73h85" stroke="#e24e4f" strokeWidth="4" strokeLinecap="round" />
          </g>
          <g
            className="resort-card__story-icon-polynesian-torch"
            stroke="#133b43"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M53 201v-43" fill="none" />
            <path d="M45 160c-4-11 3-21 9-28 7 10 12 19 4 29" fill="url(#polynesianVillageIconFire)" />
            <path d="M76 76c8 7 21 8 32 1" fill="none" />
            <circle cx="78" cy="76" r="4" fill="#f6d962" />
            <circle cx="89" cy="82" r="4" fill="#ff8da1" />
            <circle cx="101" cy="80" r="4" fill="#f6d962" />
          </g>
          <g className="resort-card__story-icon-polynesian-pageant">
            <path d="m220 42 6 14 14 6-14 6-6 14-6-14-14-6 14-6 6-14Z" fill="#ffe66b" />
            <path d="m36 97 4 9 10 4-10 4-4 10-4-10-10-4 10-4 4-9Z" fill="#ffe66b" />
            <path
              d="M210 205c11-8 22-7 30 2"
              stroke="#ffe66b"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="224" cy="202" r="4" fill="#67f0de" />
          </g>
        </svg>
      </span>
    );
  }

  if (slug === "polynesian-villas-and-bungalows") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--polynesian-villas-and-bungalows",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Disney's Polynesian Villas & Bungalows icon: overwater bungalow and villa-home feeling, Island Tower, Cove Pool zero-entry water, Moana canoe, Oasis Patio, Pineapple Lanai, Seven Seas Lagoon aquatic red carpet, and lagoon pageant sparkle"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <radialGradient
              id="polynesianVillasIconSky"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(128 97) rotate(90) scale(108)"
            >
              <stop offset="0" stopColor="#fff0b8" />
              <stop offset="0.48" stopColor="#f7b86a" />
              <stop offset="1" stopColor="#4fb6b4" />
            </radialGradient>
            <linearGradient id="polynesianVillasIconLagoon" x1="45" y1="158" x2="219" y2="223">
              <stop stopColor="#1f8fa0" />
              <stop offset="0.58" stopColor="#4fd2c2" />
              <stop offset="1" stopColor="#b7f0df" />
            </linearGradient>
            <linearGradient id="polynesianVillasIconThatch" x1="75" y1="84" x2="168" y2="120">
              <stop stopColor="#7d4b26" />
              <stop offset="0.45" stopColor="#d99a48" />
              <stop offset="1" stopColor="#5b351e" />
            </linearGradient>
            <linearGradient id="polynesianVillasIconTower" x1="154" y1="66" x2="198" y2="156">
              <stop stopColor="#ffe1a3" />
              <stop offset="0.52" stopColor="#d26f4b" />
              <stop offset="1" stopColor="#7d493b" />
            </linearGradient>
            <clipPath id="polynesianVillasIconClip">
              <circle cx="128" cy="128" r="112" />
            </clipPath>
          </defs>
          <circle cx="128" cy="128" r="115" fill="#184b5b" />
          <circle cx="128" cy="128" r="112" fill="url(#polynesianVillasIconSky)" />
          <g clipPath="url(#polynesianVillasIconClip)">
            <circle cx="74" cy="72" r="32" fill="#ffd66e" opacity="0.78" />
            <path
              className="resort-card__story-icon-poly-villas-lagoon"
              d="M38 170c21-11 46-16 71-9 30 7 48 26 77 24 16-1 29-8 43-15v70H30v-62c2-2 5-5 8-8Z"
              fill="url(#polynesianVillasIconLagoon)"
            />
            <path
              className="resort-card__story-icon-poly-villas-cove"
              d="M66 191c18-5 43-5 68 3 23 7 47 9 68 1-11 22-33 35-74 34-32 0-52-14-62-38Z"
              fill="#66d1c4"
              opacity="0.72"
            />
            <path
              d="M45 190c26-9 52-8 78 1 26 10 54 12 88-4"
              stroke="#dafff1"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.85"
              fill="none"
            />
            <path
              d="M58 211c26-6 52-5 77 2 22 6 47 5 72-5"
              stroke="#0a6d7a"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.62"
              fill="none"
            />
            <g className="resort-card__story-icon-poly-villas-tower">
              <path d="M156 82c5-11 15-17 26-19 13 2 21 12 22 28v65h-48V82Z" fill="url(#polynesianVillasIconTower)" />
              <path d="M164 85h31M166 105h31M168 124h29" stroke="#ffe6b0" strokeWidth="4" strokeLinecap="round" opacity="0.86" />
              <circle cx="182" cy="72" r="4" fill="#fff4c8" />
            </g>
            <g
              className="resort-card__story-icon-poly-villas-bungalow"
              stroke="#153b45"
              strokeWidth="4"
              strokeLinejoin="round"
            >
              <path d="m47 154 38-56h77l43 56H47Z" fill="#5a321f" />
              <path d="m63 149 30-43h61l35 43H63Z" fill="url(#polynesianVillasIconThatch)" />
              <path d="M71 146h107v33H71v-33Z" fill="#f6c881" />
              <path d="M84 156h21v23H84v-23Z" fill="#5a402d" />
              <path d="M120 155h24v16h-24v-16ZM153 155h16v16h-16v-16Z" fill="#2c8087" />
              <path d="M79 185h97" stroke="#714a2b" strokeWidth="7" strokeLinecap="round" fill="none" />
              <path d="M85 179v42M109 179v42M151 179v42M170 179v42" stroke="#5a321f" strokeWidth="5" strokeLinecap="round" fill="none" />
            </g>
            <g className="resort-card__story-icon-poly-villas-canoe" stroke="#5a321f" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M106 136c10-10 23-15 35-12-12 7-21 15-29 28-3-5-5-10-6-16Z" fill="#ff4f6c" />
              <path d="M114 152c13-5 24-8 35-6M116 130l22 14" fill="none" />
              <path d="M184 173c11-7 20-7 29 0-9 7-19 8-29 0Z" fill="#7f4a24" />
              <path d="M197 149v23M197 150l22 19h-22V150Z" fill="#fff4c8" />
            </g>
            <g
              className="resort-card__story-icon-poly-villas-patio"
              stroke="#73492d"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M38 160h38M50 157v27M69 157v25" strokeWidth="6" />
              <path d="M55 196h28" stroke="#e95f45" strokeWidth="5" />
              <path d="m64 189 10 7M64 181h23M78 176l15-14" stroke="#ffd66e" />
              <path d="M94 162c-9-3-17-1-24 6 11-1 18-1 24-6Z" fill="#44b56f" stroke="none" />
              <circle cx="105" cy="195" r="9" fill="#ffd45a" stroke="none" />
              <path d="m101 190 8 10m1-10-10 10" stroke="#8f5f2c" strokeWidth="2" />
            </g>
            <g className="resort-card__story-icon-poly-villas-palm" stroke="#714a2b" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M63 118c-6 13-12 27-17 43" fill="none" />
              <path d="M39 121c16-15 34-19 54-7" stroke="#2a7d65" strokeWidth="7" fill="none" />
              <path d="M39 118c10-1 19 2 26 10M61 109c10 2 18 6 25 14" stroke="#42a46a" strokeWidth="5" fill="none" />
            </g>
            <g className="resort-card__story-icon-poly-villas-spark">
              <path d="M39 75c8-9 19-15 31-15" stroke="#fff3c3" strokeWidth="4" strokeLinecap="round" fill="none" />
              <path d="M211 93h.5M221 106h.5M204 120h.5" stroke="#fff7d6" strokeWidth="7" strokeLinecap="round" opacity="0.9" />
              <path
                d="M219 209c10-7 21-6 30 2"
                stroke="#ffe66b"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          </g>
          <circle cx="128" cy="128" r="112" stroke="#ffeec8" strokeWidth="5" opacity="0.86" fill="none" />
        </svg>
      </span>
    );
  }

  if (slug === "pop-century-resort") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--pop-century-resort",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Disney's Pop Century Resort icon: Pop Century walk through the 1950s, 1960s, 1970s, 1980s and 1990s with Hippy Dippy flower-shaped pool, Bowling Pool, Computer Pool, Rubik cube, yo-yo, Generation Gap and Hourglass Lake, Skyliner, Everything Pop, and Fast Forward Arcade energy"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <radialGradient
              id="popCenturyIconSky"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(123 94) rotate(90) scale(122)"
            >
              <stop offset="0" stopColor="#fff0a8" />
              <stop offset="0.45" stopColor="#ffb35b" />
              <stop offset="1" stopColor="#33b9c8" />
            </radialGradient>
            <linearGradient id="popCenturyIconLake" x1="36" y1="169" x2="223" y2="229">
              <stop stopColor="#2ed2d5" />
              <stop offset="1" stopColor="#116e85" />
            </linearGradient>
            <linearGradient id="popCenturyIconPool" x1="52" y1="139" x2="169" y2="220">
              <stop stopColor="#8af4e1" />
              <stop offset="1" stopColor="#10a0bb" />
            </linearGradient>
            <linearGradient id="popCenturyIconGondola" x1="155" y1="55" x2="220" y2="101">
              <stop stopColor="#fff7d6" />
              <stop offset="1" stopColor="#f04d6a" />
            </linearGradient>
            <clipPath id="popCenturyIconClip">
              <circle cx="128" cy="128" r="112" />
            </clipPath>
          </defs>
          <circle cx="128" cy="128" r="115" fill="#174b5a" />
          <circle cx="128" cy="128" r="112" fill="url(#popCenturyIconSky)" />
          <g clipPath="url(#popCenturyIconClip)">
            <circle cx="64" cy="60" r="28" fill="#ffe267" opacity="0.82" />
            <path
              className="resort-card__story-icon-pop-century-lake"
              d="M32 176c28-18 59-21 93-8 29 11 63 10 104-10v82H28v-58c1-2 2-4 4-6Z"
              fill="url(#popCenturyIconLake)"
            />
            <path
              d="M49 197c27-8 56-6 84 4 27 10 57 7 85-7"
              stroke="#e7fff4"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.86"
              fill="none"
            />
            <path
              className="resort-card__story-icon-pop-century-hippy-pool"
              d="M71 158c16-12 43-12 72-2 24 8 48 7 72-4-12 31-41 48-84 47-37-1-62-18-60-41Z"
              fill="url(#popCenturyIconPool)"
              opacity="0.88"
            />
            <path
              d="M87 167c18 8 37 10 59 6"
              stroke="#f6fff4"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            <g
              className="resort-card__story-icon-pop-century-generation-gap"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M31 144h55" stroke="#ffdf62" strokeWidth="5" />
              <path d="M44 140v35M68 140v34" stroke="#7c4a25" strokeWidth="5" />
              <path d="M45 140c-8-9-17-12-25-7 11 3 19 6 25 7Z" fill="#36a66a" />
              <path d="M45 140c9-13 20-15 33-7-15 4-25 7-33 7Z" fill="#45c378" />
            </g>
            <g
              className="resort-card__story-icon-pop-century-flower"
              transform="translate(91 79) rotate(-8)"
            >
              <circle cx="32" cy="32" r="20" fill="#ff5ba5" stroke="#153b45" strokeWidth="5" />
              <circle cx="32" cy="32" r="8" fill="#ffe86b" />
              <path
                d="M32 9v46M9 32h46M16 16l33 33M49 16 16 49"
                stroke="#fff2b4"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </g>
            <g
              className="resort-card__story-icon-pop-century-bowling"
              transform="translate(59 106)"
            >
              <path
                d="M10 12C20 2 38 2 48 12c-6 11-13 21-20 36-6-15-13-25-18-36Z"
                fill="#fff5c6"
                stroke="#153b45"
                strokeWidth="5"
                strokeLinejoin="round"
              />
              <circle cx="29" cy="13" r="7" fill="#e94e5f" />
              <path d="M18 33h21" stroke="#e94e5f" strokeWidth="5" strokeLinecap="round" />
            </g>
            <g
              className="resort-card__story-icon-pop-century-computer"
              transform="translate(156 119) rotate(4)"
            >
              <path
                d="M8 16h52c5 0 9 4 9 9v28c0 6-5 10-11 10H15C9 63 4 59 4 53V24c0-4 2-7 4-8Z"
                fill="#d9f3ef"
                stroke="#153b45"
                strokeWidth="5"
              />
              <path d="M18 28h33M18 41h43M18 53h26" stroke="#3ea7b3" strokeWidth="4" strokeLinecap="round" />
              <path d="M49 15V5h11v12" stroke="#153b45" strokeWidth="4" strokeLinecap="round" fill="none" />
              <circle cx="57" cy="52" r="5" fill="#ffca3a" />
            </g>
            <g
              className="resort-card__story-icon-pop-century-skyliner"
              transform="translate(169 64)"
            >
              <path d="M-16-6c17-11 42-11 65-1" stroke="#fff6c9" strokeWidth="5" strokeLinecap="round" fill="none" />
              <path
                d="M-2 0h53c7 0 12 6 12 13v17c0 7-6 13-13 13H0c-7 0-12-6-12-13V13c0-7 4-12 10-13Z"
                fill="url(#popCenturyIconGondola)"
                stroke="#153b45"
                strokeWidth="5"
              />
              <path d="M5 13h15m8 0h18" stroke="#1d7892" strokeWidth="5" strokeLinecap="round" />
              <path d="M-5 30h57" stroke="#fff2b4" strokeWidth="4" strokeLinecap="round" />
            </g>
            <g
              className="resort-card__story-icon-pop-century-cube"
              transform="translate(33 71) rotate(-8)"
            >
              <path d="M7 7h43v43H7V7Z" fill="#ffcb38" stroke="#153b45" strokeWidth="5" strokeLinejoin="round" />
              <path d="M22 7v43M36 7v43M7 22h43M7 36h43" stroke="#153b45" strokeWidth="3" />
              <path d="M9 9h12v12H9V9Zm15 15h12v12H24V24Zm15 15h9v9h-9v-9Z" fill="#f45e6d" />
              <path d="M24 9h12v12H24V9ZM9 39h12v9H9v-9Z" fill="#42b56b" />
              <path d="M39 9h9v12h-9V9ZM9 24h12v12H9V24Z" fill="#4aa7e8" />
            </g>
            <g
              className="resort-card__story-icon-pop-century-yoyo"
              transform="translate(172 170)"
            >
              <circle cx="21" cy="21" r="15" fill="#ffe86b" stroke="#153b45" strokeWidth="5" />
              <circle cx="21" cy="21" r="5" fill="#f04d6a" />
              <path d="M35 21c17-4 26 0 31 13" stroke="#153b45" strokeWidth="4" strokeLinecap="round" fill="none" />
            </g>
            <path
              d="M35 218c30-8 59-6 91 4"
              stroke="#fff5b8"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.8"
              fill="none"
            />
            <g className="resort-card__story-icon-pop-century-spark">
              <path d="M40 58c9-10 20-15 33-15" stroke="#fff6c7" strokeWidth="4" strokeLinecap="round" opacity="0.92" fill="none" />
              <path d="M218 115h.5M229 129h.5M212 143h.5" stroke="#fff7d6" strokeWidth="7" strokeLinecap="round" opacity="0.9" />
            </g>
          </g>
          <circle cx="128" cy="128" r="112" stroke="#fff0c6" strokeWidth="5" opacity="0.86" fill="none" />
        </svg>
      </span>
    );
  }

  if (slug === "port-orleans-resort-french-quarter") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--port-orleans-resort-french-quarter",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Disney's Port Orleans Resort - French Quarter icon: New Orleans French Quarter cobblestone courtyard with gas lamps, wrought-iron balcony, magnolia bloom, Mardi Gras beads, Doubloon Lagoon, Scales 51-foot sea serpent slide, King Neptune, alligator jazz band, Sassagoula River, South Quarter Games, and surrey bikes"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="portFqIconSky" x1="44" y1="20" x2="218" y2="231">
              <stop offset="0" stopColor="#fff4b8" />
              <stop offset="0.42" stopColor="#f6b65f" />
              <stop offset="1" stopColor="#31537d" />
            </linearGradient>
            <linearGradient id="portFqIconWater" x1="38" y1="174" x2="223" y2="226">
              <stop offset="0" stopColor="#46d5ca" />
              <stop offset="1" stopColor="#0f7187" />
            </linearGradient>
            <linearGradient id="portFqIconCourtyard" x1="54" y1="74" x2="160" y2="172">
              <stop offset="0" stopColor="#fff0ca" />
              <stop offset="1" stopColor="#e88f72" />
            </linearGradient>
            <linearGradient id="portFqIconScales" x1="122" y1="58" x2="215" y2="183">
              <stop offset="0" stopColor="#75e4df" />
              <stop offset="0.48" stopColor="#27a7b5" />
              <stop offset="1" stopColor="#145f90" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#portFqIconSky)" />
          <path
            className="resort-card__story-icon-port-fq-lagoon"
            d="M42 185c32-22 73-24 111-8 29 12 54 9 72-9 4 28-12 49-39 59-43 17-105 9-138-16-13-10-17-20-6-26Z"
            fill="url(#portFqIconWater)"
          />
          <g
            className="resort-card__story-icon-port-fq-courtyard"
            stroke="#143746"
            strokeWidth="6"
            strokeLinejoin="round"
          >
            <path d="M58 166V92c0-10 7-18 17-18h69c9 0 16 8 16 18v83H58Z" fill="url(#portFqIconCourtyard)" />
            <path d="M68 98h82" strokeLinecap="round" fill="none" />
            <path d="M73 84c12-13 26-15 38 0 13-15 28-14 40 0" stroke="#fff5d8" strokeWidth="7" strokeLinecap="round" fill="none" />
            <path d="M67 176c22-10 46-11 72-4" stroke="#fff3bc" strokeLinecap="round" fill="none" />
          </g>
          <g
            className="resort-card__story-icon-port-fq-balcony"
            stroke="#143746"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M72 115h74v34H72Z" fill="#50384d" />
            <path d="M80 122v23m13-23v23m13-23v23m13-23v23m13-23v23" stroke="#ffd260" strokeWidth="4" />
          </g>
          <g
            className="resort-card__story-icon-port-fq-scales"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M174 170c20-25 20-48 0-70-13-15-15-32 1-42 18-11 41 2 42 23 1 23-25 31-39 16"
              fill="none"
              stroke="#143746"
              strokeWidth="6"
            />
            <path
              d="M174 170c20-25 20-48 0-70-13-15-15-32 1-42 18-11 41 2 42 23 1 23-25 31-39 16"
              fill="none"
              stroke="url(#portFqIconScales)"
              strokeWidth="16"
            />
            <path
              d="M173 170c-10 10-23 14-38 10"
              fill="none"
              stroke="#7fe9df"
              strokeWidth="12"
            />
            <circle cx="200" cy="79" r="5" fill="#143746" />
            <path d="M214 82c10-1 17 2 22 10" stroke="#e94b6a" strokeWidth="5" fill="none" />
          </g>
          <g
            className="resort-card__story-icon-port-fq-neptune"
            stroke="#143746"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M187 55 196 40l9 15m-9-12v32" stroke="#ffd35f" fill="none" />
            <circle cx="196" cy="69" r="13" fill="#ffd35f" />
            <path d="M196 60v18m-8-9h16" strokeWidth="4" fill="none" />
          </g>
          <g className="resort-card__story-icon-port-fq-lamp">
            <path d="M45 71h12v55H45Z" fill="#182f3d" />
            <path d="M39 71h24" stroke="#182f3d" strokeWidth="5" strokeLinecap="round" />
            <circle cx="51" cy="62" r="10" fill="#ffe39a" stroke="#182f3d" strokeWidth="5" />
          </g>
          <g
            className="resort-card__story-icon-port-fq-magnolia"
            stroke="#143746"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M93 60c7-11 16-11 23 0-7-4-15-4-23 0Z" fill="#fff6df" />
            <path d="M105 51c-1-8 2-15 9-20" fill="none" stroke="#2d7f62" />
            <path d="M108 43c10-6 18-4 23 4-8 1-15 0-23-4Z" fill="#78bf74" />
          </g>
          <g className="resort-card__story-icon-port-fq-sassagoula">
            <path d="M44 172c31-11 66-11 101 1" stroke="#1e728c" strokeWidth="7" strokeLinecap="round" fill="none" />
            <path d="M172 198c19-7 39-8 57-3" stroke="#b5fbef" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M45 227c26-4 52-3 78 4" stroke="#0e6478" strokeWidth="5" strokeLinecap="round" opacity="0.5" fill="none" />
          </g>
          <g className="resort-card__story-icon-port-fq-beads" strokeLinecap="round" fill="none">
            <path d="M35 188c32 12 65 12 98 0" stroke="#ffd35f" strokeWidth="5" strokeDasharray="2 10" />
            <path d="M35 199c31 11 62 10 96-2" stroke="#28a36f" strokeWidth="5" strokeDasharray="2 10" />
            <path d="M36 210c34 8 66 7 94-4" stroke="#7350a4" strokeWidth="5" strokeDasharray="2 10" />
          </g>
          <g
            className="resort-card__story-icon-port-fq-jazz"
            transform="translate(71 201)"
            stroke="#143746"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 11c8-10 18-11 30-2 7 5 14 6 20 2" fill="none" />
            <circle cx="15" cy="14" r="5" fill="#143746" />
            <path d="M27 5c8-3 15-1 21 5" stroke="#ffd35f" strokeWidth="4" fill="none" />
          </g>
          <g
            className="resort-card__story-icon-port-fq-surrey"
            stroke="#143746"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="57" cy="219" r="6" fill="#fff0ac" />
            <circle cx="83" cy="219" r="6" fill="#fff0ac" />
            <path d="m57 219 11-16h11l4 16m-15-16 6 16m-12-22h23" fill="none" />
          </g>
          <g className="resort-card__story-icon-port-fq-spark">
            <path d="m214 38 5 11 11 5-11 5-5 11-5-11-11-5 11-5 5-11Z" fill="#fff5a1" />
            <path d="m34 139 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z" fill="#fff5a1" />
          </g>
          <circle cx="128" cy="128" r="112" stroke="#fff0c6" strokeWidth="5" opacity="0.86" fill="none" />
        </svg>
      </span>
    );
  }

  if (slug === "port-orleans-resort-riverside") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--port-orleans-resort-riverside",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Disney's Port Orleans Resort - Riverside icon: rural Louisiana along the Sassagoula River with Magnolia Bend mansions, Alligator Bayou cypress, Ol' Man Island 3.5-acre swimmin' hole and fishin' hole, abandoned sawmill, wooden bridges, 95 foot rustic waterslide, Muddy Rivers, Riverside Levee Marina carriage ride, cane pole fishing, and surrey bikes"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <radialGradient
              id="portRiversideIconSky"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(121 87) rotate(90) scale(119)"
            >
              <stop offset="0" stopColor="#fff1b7" />
              <stop offset="0.48" stopColor="#d99b5d" />
              <stop offset="1" stopColor="#476b60" />
            </radialGradient>
            <linearGradient id="portRiversideIconRiver" x1="35" y1="165" x2="224" y2="230">
              <stop offset="0" stopColor="#58d7c5" />
              <stop offset="1" stopColor="#146f79" />
            </linearGradient>
            <linearGradient id="portRiversideIconMill" x1="89" y1="87" x2="174" y2="180">
              <stop offset="0" stopColor="#d58b4d" />
              <stop offset="1" stopColor="#704429" />
            </linearGradient>
            <linearGradient id="portRiversideIconMansion" x1="50" y1="73" x2="120" y2="148">
              <stop offset="0" stopColor="#fff0ca" />
              <stop offset="1" stopColor="#d7b06c" />
            </linearGradient>
            <linearGradient id="portRiversideIconSlide" x1="137" y1="96" x2="213" y2="185">
              <stop offset="0" stopColor="#f0c06a" />
              <stop offset="1" stopColor="#a65b31" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="115" fill="#173d42" />
          <circle cx="128" cy="128" r="112" fill="url(#portRiversideIconSky)" />
          <path
            className="resort-card__story-icon-port-riverside-river"
            d="M32 173c29-20 66-24 107-8 32 13 61 10 90-9v84H30v-62c0-2 1-4 2-5Z"
            fill="url(#portRiversideIconRiver)"
          />
          <g className="resort-card__story-icon-port-riverside-sassagoula">
            <path d="M48 198c34-11 70-8 105 5 25 9 49 6 72-8" stroke="#e7fff1" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M37 220c27-7 56-5 86 5" stroke="#0d6872" strokeWidth="5" strokeLinecap="round" opacity="0.55" fill="none" />
          </g>
          <path
            className="resort-card__story-icon-port-riverside-island"
            d="M51 158c13-26 35-43 66-51"
            stroke="#7ca354"
            strokeWidth="23"
            strokeLinecap="round"
            opacity="0.9"
            fill="none"
          />
          <g
            className="resort-card__story-icon-port-riverside-cypress"
            stroke="#153b35"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M44 165c8-36 12-67 9-95" fill="none" />
            <path d="M52 75c-17-6-29 0-38 13 17 2 30-2 38-13Z" fill="#2f8b5c" />
            <path d="M52 74c12-15 26-16 43-7-17 9-30 12-43 7Z" fill="#4db36b" />
            <path d="M52 74c9 10 12 22 10 37-9-11-13-23-10-37Z" fill="#3b9b61" />
            <path d="M213 164c-4-30-6-56-1-81" fill="none" />
            <path d="M211 86c-15-8-27-4-35 8 16 0 27-2 35-8Z" fill="#2d8d58" />
            <path d="M211 85c13-11 26-9 38 1-16 5-28 5-38-1Z" fill="#48b46a" />
          </g>
          <g
            className="resort-card__story-icon-port-riverside-magnolia-bend"
            stroke="#153b42"
            strokeWidth="5"
            strokeLinejoin="round"
          >
            <path d="M58 128h61v40H58Z" fill="url(#portRiversideIconMansion)" />
            <path d="M48 128h81L116 99H62L48 128Z" fill="#fff1cc" />
            <path d="M70 99c9-16 27-16 36 0" fill="#f5d997" />
            <path d="M70 144h12v24H70Zm26-20h13v44H96Z" fill="#fbf1d3" />
            <path d="M61 136h55" stroke="#9a6d3f" strokeWidth="4" strokeLinecap="round" fill="none" />
          </g>
          <g
            className="resort-card__story-icon-port-riverside-sawmill"
            stroke="#153b42"
            strokeWidth="5"
            strokeLinejoin="round"
          >
            <path d="M95 144h78v52H95Z" fill="url(#portRiversideIconMill)" />
            <path d="m88 144 31-44h48l22 44H88Z" fill="#8b5a35" />
            <path d="M113 100h42l-18-27-24 27Z" fill="#d69b54" />
            <path d="M111 157h22v39h-22Z" fill="#513322" />
            <path d="M145 155h18v16h-18Z" fill="#ffe6a5" />
            <path d="M96 183h77" stroke="#f0cf86" strokeWidth="4" strokeLinecap="round" fill="none" />
          </g>
          <g
            className="resort-card__story-icon-port-riverside-slide"
            stroke="#153b42"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M163 162c15-30 35-45 58-42-11 24-26 44-57 62" stroke="url(#portRiversideIconSlide)" strokeWidth="12" fill="none" />
            <path d="M161 164c14-26 34-40 55-39" stroke="#fff3ba" strokeWidth="4" fill="none" />
          </g>
          <g
            className="resort-card__story-icon-port-riverside-bridges"
            stroke="#153b42"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M82 196c38-13 76-13 112 1" stroke="#d9b36b" strokeWidth="9" fill="none" />
            <path d="M86 189v22m25-25v29m25-29v29m25-25v22m25-18v18" stroke="#7c4a29" fill="none" />
          </g>
          <g
            className="resort-card__story-icon-port-riverside-fishing"
            stroke="#153b42"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M62 219c12-11 24-14 38-8" fill="none" />
            <path d="M85 210c7-20 17-31 31-34" fill="none" />
            <path d="m112 176-5 13 12-4" fill="#ffdd75" />
            <circle cx="63" cy="220" r="5" fill="#153b42" />
          </g>
          <g
            className="resort-card__story-icon-port-riverside-carriage"
            stroke="#153b42"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="177" cy="218" r="7" fill="#ffe7a4" />
            <circle cx="207" cy="218" r="7" fill="#ffe7a4" />
            <path d="M174 213h38l-7-16h-26l-5 16Z" fill="#8e5732" />
            <path d="M181 197c5-11 19-11 24 0" fill="none" />
            <path d="M169 207c-9-5-16-4-23 2" fill="none" />
          </g>
          <g className="resort-card__story-icon-port-riverside-spark">
            <path d="m220 48 5 11 11 5-11 5-5 11-5-11-11-5 11-5 5-11Z" fill="#fff4a4" />
            <path d="m38 124 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#fff4a4" />
          </g>
          <circle cx="128" cy="128" r="112" stroke="#fff0c6" strokeWidth="5" opacity="0.86" fill="none" />
        </svg>
      </span>
    );
  }

  if (slug === "riviera-resort") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--riviera-resort",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Disney's Riviera Resort icon: Europe imagined by Disney with European Riviera and Mediterranean tower architecture, mosaic art, Riviera Pool stately column waterslide, S'il Vous Play Fantasia fountain, Beau Soleil Pool calm, Disney Skyliner arrival, waterfront gardens, The Eventi Room art activities, Cote d'Azur Campfire, Movie Lawn, and Barefoot Bay nature walk"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <radialGradient
              id="rivieraIconSky"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(125 80) rotate(90) scale(132)"
            >
              <stop offset="0" stopColor="#fff3bc" />
              <stop offset="0.42" stopColor="#f0b76b" />
              <stop offset="0.76" stopColor="#5ab6c7" />
              <stop offset="1" stopColor="#195c74" />
            </radialGradient>
            <linearGradient id="rivieraIconWater" x1="35" y1="166" x2="229" y2="229">
              <stop offset="0" stopColor="#63d5d6" />
              <stop offset="1" stopColor="#136b88" />
            </linearGradient>
            <linearGradient id="rivieraIconTower" x1="86" y1="57" x2="166" y2="181">
              <stop offset="0" stopColor="#ffe9bd" />
              <stop offset="1" stopColor="#c7774c" />
            </linearGradient>
            <linearGradient id="rivieraIconSlide" x1="151" y1="95" x2="219" y2="177">
              <stop offset="0" stopColor="#fff0aa" />
              <stop offset="1" stopColor="#d8743f" />
            </linearGradient>
            <linearGradient id="rivieraIconMosaic" x1="54" y1="62" x2="107" y2="147">
              <stop offset="0" stopColor="#ffe788" />
              <stop offset="0.5" stopColor="#6ed2ce" />
              <stop offset="1" stopColor="#4761a8" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="115" fill="#163e51" />
          <circle cx="128" cy="128" r="112" fill="url(#rivieraIconSky)" />
          <path
            className="resort-card__story-icon-riviera-water"
            d="M31 178c29-17 62-20 98-8 38 13 72 8 99-15v84H31v-61Z"
            fill="url(#rivieraIconWater)"
          />
          <g className="resort-card__story-icon-riviera-waterfront">
            <path d="M44 206c28-8 58-6 91 5 28 9 56 6 83-10" stroke="#e8fff4" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M66 224c21-5 45-3 72 6" stroke="#0c5f7d" strokeWidth="5" strokeLinecap="round" opacity="0.55" fill="none" />
          </g>
          <g
            className="resort-card__story-icon-riviera-tower"
            stroke="#163e51"
            strokeWidth="5"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <path d="M73 152h92v48H73Z" fill="#f7d99d" />
            <path d="M62 152h115l-18-34H80l-18 34Z" fill="#ffe8b5" />
            <path d="M91 118c5-21 32-39 48-61 16 22 41 40 46 61H91Z" fill="url(#rivieraIconTower)" />
            <path d="M112 199v-47h28v47" fill="#9b5b43" />
            <path d="M88 164h13v19H88Zm53 0h13v19h-13Z" fill="#fbf3cf" />
            <path d="M98 128h67" stroke="#fff4c9" strokeWidth="4" />
            <path d="M128 73v-21" />
            <path d="M117 52h22" />
          </g>
          <g
            className="resort-card__story-icon-riviera-slide"
            stroke="#163e51"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M151 158c14-27 34-43 62-44-10 28-27 48-59 64" stroke="url(#rivieraIconSlide)" strokeWidth="12" fill="none" />
            <path d="M153 157c13-23 32-37 56-38" stroke="#fff7bf" strokeWidth="4" fill="none" />
          </g>
          <g
            className="resort-card__story-icon-riviera-mosaic"
            stroke="#163e51"
            strokeWidth="4"
            strokeLinejoin="round"
          >
            <path d="M51 73h58v75H51Z" fill="url(#rivieraIconMosaic)" />
            <path d="M51 98h58M51 123h58M73 73v75M91 73v75" stroke="#fff7d0" strokeWidth="3" fill="none" />
            <path d="M56 135c17-30 34-30 50 0" stroke="#f8d36e" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M66 94c8 9 18 10 29 0" stroke="#fff7d0" strokeWidth="4" strokeLinecap="round" fill="none" />
          </g>
          <g
            className="resort-card__story-icon-riviera-gardens"
            stroke="#163e51"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M52 178c12-16 29-22 50-18" stroke="#4fa75f" strokeWidth="8" fill="none" />
            <path d="M47 176c4-21 9-38 17-51" fill="none" />
            <path d="M63 129c-13-3-24 1-31 11 13 3 24-1 31-11Z" fill="#52b76c" />
            <path d="M66 128c14-12 29-11 43-1-16 5-30 6-43 1Z" fill="#78c875" />
            <path d="M61 129c8 8 11 20 8 33-8-10-11-21-8-33Z" fill="#4ba565" />
            <path d="M204 184c-4-21-2-39 7-55" fill="none" />
            <path d="M209 132c-13-4-24 0-32 11 14 1 24-3 32-11Z" fill="#59b96d" />
            <path d="M210 132c12-10 25-8 36 2-13 4-25 4-36-2Z" fill="#7ccc74" />
          </g>
          <g
            className="resort-card__story-icon-riviera-skyliner"
            stroke="#163e51"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M168 55c18-16 41-16 57 0" stroke="#fff1b4" strokeWidth="6" fill="none" />
            <path d="M172 55h50l-6 38h-38l-6-38Z" fill="#f4d090" />
            <path d="M182 55v-12h30v12" fill="#ffe7a8" />
            <path d="M183 86h28" />
            <path d="M189 73h16" />
          </g>
          <g
            className="resort-card__story-icon-riviera-fantasia"
            stroke="#163e51"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M178 210c0-16 10-28 22-28s22 12 22 28" fill="#5ec9d4" />
            <path d="M188 188c4 10 13 14 26 9" stroke="#fff4b8" fill="none" />
            <circle cx="200" cy="188" r="5" fill="#f7d86e" />
            <path d="M196 184c-7-8-9-16-4-25 9 4 13 12 12 25" fill="#8bd77b" />
          </g>
          <g
            className="resort-card__story-icon-riviera-art"
            stroke="#163e51"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M97 57c20-16 51-18 77-5" fill="none" />
            <path d="M111 47h17l7 10h-25l-7-10h8Z" fill="#ffe5a1" />
            <path d="M143 43h19l8 11h-29l-8-11h10Z" fill="#8ed7cf" />
            <path d="M174 52c11 2 19 8 24 17" stroke="#fff3b7" fill="none" />
          </g>
          <g className="resort-card__story-icon-riviera-spark">
            <path d="m219 44 5 11 11 5-11 5-5 11-5-11-11-5 11-5 5-11Z" fill="#fff4a4" />
            <path d="m34 143 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#fff4a4" />
          </g>
          <circle cx="128" cy="128" r="112" stroke="#fff0c6" strokeWidth="5" opacity="0.86" fill="none" />
        </svg>
      </span>
    );
  }

  if (slug === "saratoga-springs-resort-and-spa") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--saratoga-springs-resort-and-spa",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Disney's Saratoga Springs Resort & Spa icon: late-1800s Saratoga Springs Victorian spa and horse racing story with winner circle energy, spring water, Lake Buena Vista and Disney Springs waterfront, golf green, High Rock Spring Pool with 128-foot slide, Paddock Pool with 146-foot water tower slide, Donald Duck aquatic play, Community Hall, Horsing Around Rentals, Turf Club, and Congress Park"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <radialGradient
              id="saratogaIconSky"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(125 78) rotate(90) scale(130)"
            >
              <stop offset="0" stopColor="#fff0bc" />
              <stop offset="0.42" stopColor="#d99a72" />
              <stop offset="0.72" stopColor="#74b58b" />
              <stop offset="1" stopColor="#1e5968" />
            </radialGradient>
            <linearGradient id="saratogaIconWater" x1="36" y1="172" x2="229" y2="231">
              <stop offset="0" stopColor="#72d7cc" />
              <stop offset="1" stopColor="#176d83" />
            </linearGradient>
            <linearGradient id="saratogaIconFacade" x1="67" y1="72" x2="173" y2="197">
              <stop offset="0" stopColor="#fff1c8" />
              <stop offset="1" stopColor="#d68276" />
            </linearGradient>
            <linearGradient id="saratogaIconRoof" x1="69" y1="65" x2="182" y2="125">
              <stop offset="0" stopColor="#7d5d7f" />
              <stop offset="1" stopColor="#4d405f" />
            </linearGradient>
            <linearGradient id="saratogaIconSpring" x1="72" y1="158" x2="179" y2="219">
              <stop offset="0" stopColor="#ccfff0" />
              <stop offset="1" stopColor="#3db8ba" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="115" fill="#183c4a" />
          <circle cx="128" cy="128" r="112" fill="url(#saratogaIconSky)" />
          <path
            className="resort-card__story-icon-saratoga-water"
            d="M31 178c31-17 65-19 101-6 36 13 68 8 96-15v82H31v-61Z"
            fill="url(#saratogaIconWater)"
          />
          <g className="resort-card__story-icon-saratoga-waterfront">
            <path d="M48 205c28-8 59-5 91 6 28 9 55 5 80-10" stroke="#eaffef" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M70 226c22-5 47-3 75 6" stroke="#0f6077" strokeWidth="5" strokeLinecap="round" opacity="0.55" fill="none" />
          </g>
          <g
            className="resort-card__story-icon-saratoga-victorian"
            stroke="#173845"
            strokeWidth="5"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <path d="M67 132h96v68H67Z" fill="url(#saratogaIconFacade)" />
            <path d="M55 132h122l-16-38H72l-17 38Z" fill="#ffe8bd" />
            <path d="M75 94h82l14 38H61l14-38Z" fill="url(#saratogaIconRoof)" />
            <path d="M92 199v-48h28v48" fill="#8f514c" />
            <path d="M130 151h18v22h-18ZM77 151h16v22H77Z" fill="#fff6d3" />
            <path d="M86 119h58" stroke="#fff1c0" strokeWidth="4" />
            <path d="M103 94c2-22 28-35 42-58 13 23 36 36 39 58h-81Z" fill="#e0a47a" />
            <path d="M135 54v-19" />
            <path d="M123 35h24" />
          </g>
          <g
            className="resort-card__story-icon-saratoga-golf"
            stroke="#173845"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M73 174c16-15 39-22 69-18 25 3 47-4 66-22" stroke="#4ea763" strokeWidth="12" fill="none" />
            <path d="M74 170c20 10 45 13 75 7 23-5 42-14 58-29" stroke="#bde47f" strokeWidth="4" fill="none" />
            <circle cx="188" cy="148" r="8" fill="#f7e681" />
            <path d="M181 148c8-10 17-12 28-6" fill="none" />
          </g>
          <g
            className="resort-card__story-icon-saratoga-gardens"
            stroke="#173845"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M44 169c0-24 10-42 28-54" fill="none" />
            <path d="M71 116c-16-5-28 0-37 13 16 2 28-2 37-13Z" fill="#54ad68" />
            <path d="M74 116c17-10 34-8 49 3-18 5-35 4-49-3Z" fill="#7bc56d" />
            <path d="M70 119c8 8 11 21 8 36-9-11-11-23-8-36Z" fill="#4a9f62" />
            <path d="M204 186c-3-20 2-39 13-57" fill="none" />
            <path d="M215 131c-14-4-25 0-34 10 14 2 26-1 34-10Z" fill="#55ad68" />
            <path d="M216 131c12-9 25-7 37 2-14 4-26 4-37-2Z" fill="#80ca70" />
          </g>
          <g
            className="resort-card__story-icon-saratoga-community"
            stroke="#173845"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M49 62c18-18 45-17 62 0" stroke="#fff0b6" strokeWidth="6" fill="none" />
            <path d="M55 62h51l-7 37H62l-7-37Z" fill="#f6d091" />
            <path d="M66 62V48h28v14" fill="#ffe7a4" />
            <path d="M66 83h27" />
          </g>
          <g
            className="resort-card__story-icon-saratoga-paddock"
            stroke="#173845"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M156 170c13-28 33-45 60-44-9 29-27 50-59 65" stroke="#ffe28b" strokeWidth="12" fill="none" />
            <path d="M158 170c12-24 31-38 55-39" stroke="#fff7c7" strokeWidth="4" fill="none" />
            <path d="M197 119h28l-5 32h-18l-5-32Z" fill="#b37558" />
            <path d="M200 119v-16h22v16" fill="#e4b27b" />
          </g>
          <g
            className="resort-card__story-icon-saratoga-spring"
            stroke="#173845"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M86 211c0-17 12-31 29-31s29 14 29 31" fill="url(#saratogaIconSpring)" />
            <path d="M94 187c10 9 24 12 39 3" stroke="#fff7c6" fill="none" />
            <path d="M113 180c-8-11-9-22-3-33 12 6 17 17 14 33" fill="#8bd579" />
            <circle cx="118" cy="184" r="6" fill="#ffe36f" />
          </g>
          <g
            className="resort-card__story-icon-saratoga-horse"
            stroke="#173845"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M39 211c12-12 27-16 45-10" fill="none" />
            <path d="M55 200c8-21 22-33 40-36" fill="none" />
            <path d="M91 164c-12-12-18-24-16-38 17 5 28 15 33 31" fill="#8f5f43" />
            <path d="M77 132c-12 7-22 15-29 26 15 1 28-5 38-18" fill="#a86f48" />
            <path d="M97 159c-4-14 0-27 11-39 9 15 10 29 3 42" fill="#6c4b3f" />
          </g>
          <g className="resort-card__story-icon-saratoga-spark">
            <path d="m219 45 5 11 11 5-11 5-5 11-5-11-11-5 11-5 5-11Z" fill="#fff4a4" />
            <path d="m33 143 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#fff4a4" />
          </g>
          <circle cx="128" cy="128" r="112" stroke="#fff0c6" strokeWidth="5" opacity="0.86" fill="none" />
        </svg>
      </span>
    );
  }

  if (slug === "boardwalk-inn") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--boardwalk-inn",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="BoardWalk Inn icon: turn-of-the-century Atlantic City boardwalk, Luna Park Pool, Keister Coaster waterslide, Crescent Lake, and carnival lights"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="boardWalkInnIconSky" x1="42" y1="24" x2="219" y2="230">
              <stop offset="0" stopColor="#fff7cf" />
              <stop offset="0.52" stopColor="#ffe7a5" />
              <stop offset="1" stopColor="#9fe8dc" />
            </linearGradient>
            <linearGradient id="boardWalkInnIconWater" x1="47" y1="176" x2="225" y2="219">
              <stop offset="0" stopColor="#1bb6bd" />
              <stop offset="1" stopColor="#126b7a" />
            </linearGradient>
            <linearGradient id="boardWalkInnIconCoaster" x1="65" y1="159" x2="205" y2="194">
              <stop offset="0" stopColor="#ffe69b" />
              <stop offset="1" stopColor="#f4a638" />
            </linearGradient>
            <linearGradient id="boardWalkInnIconPlanks" x1="48" y1="201" x2="207" y2="231">
              <stop offset="0" stopColor="#e1aa57" />
              <stop offset="1" stopColor="#b87936" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#boardWalkInnIconSky)" />
          <path
            className="resort-card__story-icon-water"
            d="M47 177c35-19 75-20 107-5 24 12 53 12 72-2-2 20-16 39-38 49-43 19-103 11-136-13-10-8-12-19-5-29Z"
            fill="url(#boardWalkInnIconWater)"
          />
          <g className="resort-card__story-icon-boardwalk">
            <path
              d="M42 208c46-18 109-18 171-2-2 11-22 20-60 24-40 4-80-4-111-22Z"
              fill="url(#boardWalkInnIconPlanks)"
            />
            <path
              d="M57 207c34-9 82-9 144 4M77 216c38-9 74-9 110 2"
              stroke="#fff0be"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="m96 198-12 24m45-27-2 31m35-28 12 24"
              stroke="#754926"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-roofline">
            <path
              d="M76 146 88 84h84l13 62H76Z"
              fill="#fff5d5"
              stroke="#0b4650"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="m91 84 13-25h50l15 25H91Z"
              fill="#f9c55d"
              stroke="#0b4650"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M107 64h44v20h-49l5-20Z"
              fill="#8fd7da"
              stroke="#0b4650"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M82 104h99l12 22H68l14-22Z"
              fill="#0f5a6c"
              stroke="#0b4650"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M88 110h13v16H88v-16Zm28 0h13v16h-13v-16Zm28 0h13v16h-13v-16Zm28 0h12v16h-12v-16Z"
              fill="#ffe6a1"
            />
            <path
              d="M98 131v30m30-31v35m30-34v30"
              stroke="#e6b45b"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-marquee">
            <path
              d="M74 137c29-6 77-6 110 0v16c-33-5-79-5-110 0v-16Z"
              fill="#ffe9a8"
              stroke="#0b4650"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M88 135v16m20-19v17m20-18v17m20-16v17m20-14v16"
              stroke="#d9423c"
              strokeWidth="5"
            />
            <circle cx="86" cy="158" r="4" fill="#ffd35c" />
            <circle cx="106" cy="156" r="4" fill="#ffd35c" />
            <circle cx="128" cy="155" r="4" fill="#ffd35c" />
            <circle cx="150" cy="156" r="4" fill="#ffd35c" />
            <circle cx="171" cy="158" r="4" fill="#ffd35c" />
          </g>
          <g className="resort-card__story-icon-coaster">
            <path
              d="M64 174c27-23 67-25 93-8 17 11 30 25 48 24"
              stroke="url(#boardWalkInnIconCoaster)"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              d="M64 174c27-23 67-25 93-8 17 11 30 25 48 24"
              stroke="#fff4c8"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M74 166c22-15 50-17 74-8"
              stroke="#8a5932"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="7 7"
            />
          </g>
          <g className="resort-card__story-icon-elephant">
            <path
              d="M196 154c7-9 17-11 25-4 4 3 6 8 5 13"
              stroke="#0b4650"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M197 154c14 4 23 13 25 25"
              stroke="#9fe8e1"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M183 165c9-6 20-6 29 1"
              stroke="#fdf7d7"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle cx="202" cy="150" r="3" fill="#0b4650" />
          </g>
          <g className="resort-card__story-icon-lamp">
            <path d="M51 89v89" stroke="#704729" strokeWidth="6" strokeLinecap="round" />
            <path
              d="M39 91c3-11 21-11 24 0l-5 12H44l-5-12Z"
              fill="#ffd86b"
              stroke="#704729"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          </g>
          <g className="resort-card__story-icon-spark">
            <path d="m202 61 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#f8b94a" />
            <circle cx="52" cy="113" r="5" fill="#ffd86b" />
            <circle cx="218" cy="104" r="4" fill="#f8b94a" />
            <circle cx="39" cy="146" r="4" fill="#f8b94a" />
          </g>
          <path
            d="M47 190c28-14 64-16 98-3 24 9 54 9 76-4"
            stroke="#fdf7d7"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M72 202c28-8 55-7 82 3"
            stroke="#0b4650"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }

  if (slug === "caribbean-beach-resort") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--caribbean-beach-resort",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Caribbean Beach Resort icon: Barefoot Bay, Fuentes del Morro Spanish-fortress pirate pool, Skyliner, palm hammock, island villages, and waterslides"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="caribbeanBeachIconSky" x1="47" y1="32" x2="216" y2="230">
              <stop offset="0" stopColor="#fff6c7" />
              <stop offset="0.5" stopColor="#ffd76d" />
              <stop offset="1" stopColor="#8ee3d2" />
            </linearGradient>
            <linearGradient id="caribbeanBeachIconWater" x1="44" y1="165" x2="229" y2="222">
              <stop offset="0" stopColor="#2ac8c1" />
              <stop offset="1" stopColor="#0f7184" />
            </linearGradient>
            <linearGradient id="caribbeanBeachIconSand" x1="51" y1="198" x2="222" y2="232">
              <stop offset="0" stopColor="#f4c46b" />
              <stop offset="1" stopColor="#d99442" />
            </linearGradient>
            <linearGradient id="caribbeanBeachIconSlide" x1="82" y1="144" x2="213" y2="182">
              <stop offset="0" stopColor="#ffe69b" />
              <stop offset="1" stopColor="#f4a638" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#caribbeanBeachIconSky)" />
          <path
            className="resort-card__story-icon-water"
            d="M44 178c35-24 78-25 113-10 26 12 54 10 72-6 2 26-14 48-41 59-43 17-105 9-138-14-12-9-16-20-6-29Z"
            fill="url(#caribbeanBeachIconWater)"
          />
          <path
            className="resort-card__story-icon-beach"
            d="M51 201c36-18 78-18 112-4 20 8 41 7 59-4-12 23-43 36-87 38-42 2-76-10-84-30Z"
            fill="url(#caribbeanBeachIconSand)"
          />
          <g className="resort-card__story-icon-skyliner">
            <path
              d="M48 63c48-13 113-14 165 3"
              stroke="#0b4650"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.72"
            />
            <path d="M174 64v25" stroke="#0b4650" strokeWidth="4" strokeLinecap="round" />
            <path
              d="M154 89c0-10 40-10 40 0v16c0 8-40 8-40 0V89Z"
              fill="#fff7d4"
              stroke="#0b4650"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path d="M163 90h22v12h-22V90Z" fill="#7ed8d6" />
            <path
              d="M163 108c7 5 17 5 24 0"
              stroke="#f26d56"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-palm">
            <path
              d="M61 96c17-17 38-16 49 0-23-3-36 5-49 0Z"
              fill="#4a9e5b"
              stroke="#0b4650"
              strokeWidth="4"
            />
            <path
              d="M65 108c19-8 36-3 46 14-21-8-33-4-46-14Z"
              fill="#57b867"
              stroke="#0b4650"
              strokeWidth="4"
            />
            <path
              d="M72 91c0 41-8 68-17 97"
              stroke="#704729"
              strokeWidth="7"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-fortress">
            <path
              d="M76 151V98h19V86h16v12h34V86h16v12h20v53H76Z"
              fill="#f6c468"
              stroke="#0b4650"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M85 116h87"
              stroke="#b75742"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M92 132h16v19H92v-19Zm31-6h16v25h-16v-25Zm31 6h15v19h-15v-19Z"
              fill="#ffe8a8"
              stroke="#0b4650"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M72 151h114M91 98h8m27 0h8m24 0h8"
              stroke="#0b4650"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-slide">
            <path
              d="M88 164c23-21 57-21 82-3 15 11 26 23 43 20"
              stroke="url(#caribbeanBeachIconSlide)"
              strokeWidth="11"
              strokeLinecap="round"
            />
            <path
              d="M88 164c23-21 57-21 82-3 15 11 26 23 43 20"
              stroke="#fff5c8"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M82 176c24-12 50-12 72-1"
              stroke="#2cc6c4"
              strokeWidth="9"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-splash">
            <path
              d="M185 139c19-2 32 5 40 19"
              stroke="#9fe8e1"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M190 148c13 1 21 8 26 18"
              stroke="#fff8d6"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="181" cy="140" r="5" fill="#0b4650" />
          </g>
          <g className="resort-card__story-icon-hammock">
            <path
              d="M45 185c22-12 50-12 73 0"
              stroke="#704729"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M52 183c18 7 41 7 59 0"
              stroke="#ff7f57"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </g>
          <path
            d="M62 188c29-16 64-17 94-7 26 9 49 6 68-7"
            stroke="#fff6c9"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M80 209c29-11 62-10 91 1"
            stroke="#0b4650"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <g className="resort-card__story-icon-spark">
            <path d="m205 61 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#f8b94a" />
            <circle cx="223" cy="113" r="4" fill="#f26d56" />
            <circle cx="42" cy="145" r="4" fill="#f8b94a" />
            <circle cx="58" cy="118" r="4" fill="#fff3a6" />
            <circle cx="211" cy="163" r="4" fill="#fff3a6" />
          </g>
        </svg>
      </span>
    );
  }

  if (slug === "coronado-springs-resort") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--coronado-springs-resort",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Coronado Springs Resort icon: Lost City of Cibola pyramid, Lago Dorado, Jaguar waterslide, Gran Destino ribbon tower, and Casitas Ranchos Cabanas color tiles"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="coronadoSpringsIconSky" x1="45" y1="31" x2="215" y2="230">
              <stop offset="0" stopColor="#fff4b8" />
              <stop offset="0.52" stopColor="#f0a258" />
              <stop offset="1" stopColor="#24a7b8" />
            </linearGradient>
            <linearGradient id="coronadoSpringsIconWater" x1="43" y1="166" x2="225" y2="224">
              <stop offset="0" stopColor="#22beb8" />
              <stop offset="1" stopColor="#0f6f86" />
            </linearGradient>
            <linearGradient id="coronadoSpringsIconPyramid" x1="67" y1="73" x2="189" y2="166">
              <stop offset="0" stopColor="#efc06d" />
              <stop offset="1" stopColor="#b76539" />
            </linearGradient>
            <linearGradient id="coronadoSpringsIconSlide" x1="70" y1="154" x2="214" y2="181">
              <stop offset="0" stopColor="#ffe18a" />
              <stop offset="1" stopColor="#f0a642" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#coronadoSpringsIconSky)" />
          <path
            className="resort-card__story-icon-water"
            d="M43 178c34-23 76-24 111-9 26 11 55 9 73-7 1 25-15 47-41 58-43 18-103 10-136-14-12-9-16-19-7-28Z"
            fill="url(#coronadoSpringsIconWater)"
          />
          <path
            className="resort-card__story-icon-beach"
            d="M50 202c38-19 76-18 110-5 20 8 39 7 58-4-11 22-42 35-86 38-41 2-73-9-82-29Z"
            fill="#e9ad57"
          />
          <g className="resort-card__story-icon-tower">
            <path
              d="M166 58c13 1 25 5 36 12l-1 83-22 7-7-56-15 23 9-69Z"
              fill="#f6d18a"
              stroke="#153744"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M171 74c22 8 29 28 24 54-2 10-6 17-11 22"
              stroke="#b94d3b"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M183 82c3 19 6 40 7 63"
              stroke="#fff5d2"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-pyramid">
            <path
              d="M64 160 128 70l62 90H64Z"
              fill="url(#coronadoSpringsIconPyramid)"
              stroke="#153744"
              strokeWidth="7"
              strokeLinejoin="round"
            />
            <path d="M128 70 190 160h-62V70Z" fill="#e9af5a" opacity="0.88" />
            <path d="M64 160 128 70v90H64Z" fill="#b86a3a" opacity="0.58" />
            <path
              d="M87 131h82M77 146h102"
              stroke="#ffe0a0"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              className="resort-card__story-icon-falls"
              d="M128 91v63c0 15-15 27-31 43"
              stroke="#62d6d0"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M128 93c-12 20-16 35 0 56 6 7 12 11 15 13"
              stroke="#153744"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.68"
            />
          </g>
          <g className="resort-card__story-icon-slide">
            <path
              d="M72 169c29-20 61-18 91 0 20 12 34 14 50 5"
              stroke="url(#coronadoSpringsIconSlide)"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              d="M73 169c29-20 61-18 91 0 20 12 34 14 50 5"
              stroke="#fff6c8"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M75 181c22-9 52-9 78 2"
              stroke="#38c8c4"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-jaguar">
            <path
              d="M201 155c9-8 23-4 26 7-7 8-20 9-27 2"
              fill="#f6b44f"
              stroke="#153744"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <circle cx="211" cy="160" r="3" fill="#153744" />
            <path
              d="M207 148c11-9 22-11 31-5M211 154c10-1 18 4 23 12"
              stroke="#beece6"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-tile">
            <path
              d="m58 92 18-8 18 8-18 9-18-9Z"
              fill="#d65346"
              stroke="#153744"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d="m49 114 18-8 18 8-18 9-18-9Z"
              fill="#f2b84b"
              stroke="#153744"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d="m51 137 18-8 18 8-18 9-18-9Z"
              fill="#4cb6b6"
              stroke="#153744"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d="M55 158c10-8 20-10 29-4"
              stroke="#fff0b4"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <path
            d="M62 187c29-15 64-16 94-6 25 9 49 6 68-7"
            stroke="#fff4c5"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M79 209c29-11 61-10 92 1"
            stroke="#153744"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <g className="resort-card__story-icon-spark">
            <path d="m218 61 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#ffe071" />
            <path d="m44 156 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#ffe071" />
            <circle cx="211" cy="112" r="4" fill="#d65346" />
            <circle cx="56" cy="74" r="4" fill="#7fe4d8" />
          </g>
        </svg>
      </span>
    );
  }

  if (slug === "grand-floridian-resort-and-spa") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--grand-floridian-resort-and-spa",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Grand Floridian Resort & Spa icon: Victorian roofline and turret, Seven Seas Lagoon, monorail, Beach Pool bridge, cascading waterfalls, waterslide, palms, and fireworks"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="grandFloridianIconSky" x1="45" y1="26" x2="216" y2="230">
              <stop offset="0" stopColor="#fff7cf" />
              <stop offset="0.5" stopColor="#ffd9b8" />
              <stop offset="1" stopColor="#a6e7e0" />
            </linearGradient>
            <linearGradient id="grandFloridianIconWater" x1="43" y1="167" x2="226" y2="224">
              <stop offset="0" stopColor="#42c8d5" />
              <stop offset="1" stopColor="#167187" />
            </linearGradient>
            <linearGradient id="grandFloridianIconRoof" x1="69" y1="58" x2="188" y2="154">
              <stop offset="0" stopColor="#f7d38a" />
              <stop offset="1" stopColor="#d97361" />
            </linearGradient>
            <linearGradient id="grandFloridianIconPool" x1="66" y1="172" x2="213" y2="210">
              <stop offset="0" stopColor="#a7f2ef" />
              <stop offset="1" stopColor="#23a7bd" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#grandFloridianIconSky)" />
          <path
            className="resort-card__story-icon-water"
            d="M43 178c34-23 77-24 112-9 26 11 54 9 71-7 2 25-14 47-40 58-43 18-104 10-137-14-12-9-16-19-6-28Z"
            fill="url(#grandFloridianIconWater)"
          />
          <path
            className="resort-card__story-icon-beach"
            d="M51 202c37-18 78-18 111-4 21 8 41 7 59-4-11 23-43 36-87 38-42 2-75-10-83-30Z"
            fill="#f0c879"
          />
          <g className="resort-card__story-icon-monorail">
            <path
              d="M48 83c43-15 113-17 164 1"
              stroke="#163a49"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.62"
            />
            <path
              d="M73 74c26-8 70-9 110-1 11 2 19 11 18 22-43-12-90-11-138 2 0-10 4-19 10-23Z"
              fill="#fdf8df"
              stroke="#163a49"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path d="M88 79h72c8 0 15 3 20 8-35-5-69-5-102 2 2-5 5-8 10-10Z" fill="#82cdd6" />
            <path d="M165 80c10 3 16 8 17 14" stroke="#d94e45" strokeWidth="5" strokeLinecap="round" />
          </g>
          <g className="resort-card__story-icon-roofline">
            <path
              d="M72 153 86 94h82l15 59H72Z"
              fill="#fff6df"
              stroke="#163a49"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="m82 95 19-31h53l21 31H82Z"
              fill="url(#grandFloridianIconRoof)"
              stroke="#163a49"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M99 65h55v23H94l5-23Z"
              fill="#f7f1d8"
              stroke="#163a49"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M86 112h96l10 21H75l11-21Z"
              fill="#d94e45"
              stroke="#163a49"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M91 118h13v15H91v-15Zm28 0h13v15h-13v-15Zm28 0h13v15h-13v-15Zm27 0h11v15h-11v-15Z"
              fill="#fff0b2"
            />
            <path
              d="M99 138v28m29-29v33m30-32v29"
              stroke="#dfb96a"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-turret">
            <path
              d="M170 146V91c0-13 9-24 21-27 12 4 20 14 20 27v55h-41Z"
              fill="#fff7df"
              stroke="#163a49"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="m166 91 25-36 25 36h-50Z"
              fill="#d94e45"
              stroke="#163a49"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path d="M183 103h16v22h-16v-22Z" fill="#8ed7dd" />
            <path d="M190 55V42" stroke="#163a49" strokeWidth="5" strokeLinecap="round" />
            <path d="m190 42 13 6-13 6V42Z" fill="#f8c955" stroke="#163a49" strokeWidth="3" strokeLinejoin="round" />
          </g>
          <g className="resort-card__story-icon-palm">
            <path d="M58 120c7 25 5 52-8 80" stroke="#76543b" strokeWidth="7" strokeLinecap="round" />
            <path
              d="M59 119c-17-4-29 2-37 14 16 0 29-3 37-14Zm0 0c-6-15-3-29 8-42 7 17 4 31-8 42Zm0 0c14-11 29-13 45-4-14 9-29 10-45 4Zm0 0c-19 7-31 20-37 38 19-7 31-20 37-38Z"
              fill="#26895e"
              stroke="#163a49"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          </g>
          <g className="resort-card__story-icon-bridge">
            <path
              d="M61 180c24-21 59-22 82 0"
              fill="none"
              stroke="#fff6df"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              d="M61 181c24-21 59-22 82 0"
              fill="none"
              stroke="#163a49"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M72 176v17m20-25v22m21-22v22m20-15v17"
              stroke="#163a49"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-pool">
            <path
              d="M64 198c32-15 65-15 95-3 21 9 39 7 55-2-10 18-40 28-80 30-40 1-69-8-70-25Z"
              fill="url(#grandFloridianIconPool)"
            />
            <path
              d="M83 201c24-7 50-7 78 1"
              stroke="#fff8d6"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-falls">
            <path
              d="M147 154c11 15 12 31 2 47"
              stroke="#7be7e1"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path
              d="M155 158c8 12 8 26 0 41"
              stroke="#f9fff1"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-slide">
            <path
              d="M150 171c19-14 43-13 62 2 9 7 17 9 26 4"
              stroke="#f7b64e"
              strokeWidth="12"
              strokeLinecap="round"
            />
            <path
              d="M150 171c19-14 43-13 62 2 9 7 17 9 26 4"
              stroke="#fff4c4"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          <path
            d="M64 188c29-15 64-16 95-5 25 9 48 6 67-7"
            stroke="#fff5c8"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M78 210c30-10 62-10 93 1"
            stroke="#163a49"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <g className="resort-card__story-icon-spark">
            <path d="m219 61 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#ffe27a" />
            <path d="m43 151 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#ffe27a" />
            <circle cx="211" cy="113" r="4" fill="#d94e45" />
            <circle cx="55" cy="82" r="4" fill="#fff5a6" />
          </g>
        </svg>
      </span>
    );
  }

  if (slug === "villas-at-grand-floridian-resort-and-spa") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--villas-at-grand-floridian-resort-and-spa",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="The Villas at Disney's Grand Floridian Resort & Spa icon: Victorian-style villa home, comforts of home, balcony calm, Seven Seas Lagoon, monorail, walking path, Wedding Pavilion, Beach Pool, and fireworks"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="villasGrandFloridianIconSky" x1="45" y1="27" x2="216" y2="230">
              <stop offset="0" stopColor="#fff7d6" />
              <stop offset="0.52" stopColor="#f6d7c8" />
              <stop offset="1" stopColor="#9fe7df" />
            </linearGradient>
            <linearGradient id="villasGrandFloridianIconWater" x1="43" y1="169" x2="225" y2="224">
              <stop offset="0" stopColor="#50cbd5" />
              <stop offset="1" stopColor="#176d86" />
            </linearGradient>
            <linearGradient id="villasGrandFloridianIconRoof" x1="70" y1="61" x2="179" y2="151">
              <stop offset="0" stopColor="#f6d185" />
              <stop offset="1" stopColor="#cc675d" />
            </linearGradient>
            <linearGradient id="villasGrandFloridianIconPool" x1="71" y1="184" x2="214" y2="221">
              <stop offset="0" stopColor="#abf3ef" />
              <stop offset="1" stopColor="#25aabe" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#villasGrandFloridianIconSky)" />
          <path
            className="resort-card__story-icon-water"
            d="M43 179c35-23 77-24 112-9 26 11 54 9 70-7 2 25-14 47-40 58-43 18-103 10-136-14-12-9-16-19-6-28Z"
            fill="url(#villasGrandFloridianIconWater)"
          />
          <path
            className="resort-card__story-icon-beach"
            d="M51 203c37-18 78-18 111-4 21 8 41 7 59-4-11 23-43 36-87 38-42 2-75-10-83-30Z"
            fill="#efc676"
          />
          <g className="resort-card__story-icon-monorail">
            <path
              d="M49 78c42-15 112-17 163 0"
              stroke="#173947"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.55"
            />
            <path
              d="M79 69c25-7 66-8 102-1 10 2 18 10 17 20-40-10-85-10-130 2 0-9 4-18 11-21Z"
              fill="#fff9e6"
              stroke="#173947"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path d="M92 75h66c8 0 14 3 19 7-32-4-64-4-95 2 2-5 5-8 10-9Z" fill="#84cfd8" />
            <path
              d="M61 186c20-18 49-25 81-20 29 4 51 18 70 20"
              stroke="#fff8de"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
          </g>
          <g className="resort-card__story-icon-roofline">
            <path
              d="M72 153 84 101h88l13 52H72Z"
              fill="#fff7df"
              stroke="#173947"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M80 101 103 69h53l24 32H80Z"
              fill="url(#villasGrandFloridianIconRoof)"
              stroke="#173947"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M98 71h60v23H94l4-23Z"
              fill="#f9efd3"
              stroke="#173947"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M86 118h94l10 20H76l10-20Z"
              fill="#d65b55"
              stroke="#173947"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M92 124h13v14H92v-14Zm27 0h13v14h-13v-14Zm27 0h13v14h-13v-14Zm26 0h11v14h-11v-14Z"
              fill="#fff0b2"
            />
            <path
              d="M96 144v22m33-22v29m33-29v22"
              stroke="#d9b36a"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-villa-balconies">
            <path
              d="M92 157c24-7 54-7 84 0"
              stroke="#173947"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M73 163h119v20H73Z"
              fill="#fff6dc"
              stroke="#173947"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M86 164v18m21-18v18m21-18v18m21-18v18m21-18v18"
              stroke="#d4ad67"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path d="M105 160h18v16h-18v-16Zm31 0h18v16h-18v-16Z" fill="#8fd7dd" />
          </g>
          <g className="resort-card__story-icon-pool">
            <path
              d="M72 205c30-13 61-13 91-2 20 7 37 5 51-3-10 17-39 27-78 29-38 1-63-8-64-24Z"
              fill="url(#villasGrandFloridianIconPool)"
            />
            <path
              d="M89 207c23-6 48-6 75 1"
              stroke="#fff8d8"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
          <g className="resort-card__story-icon-pavilion">
            <path
              d="M206 152h23l-11-18-12 18Z"
              fill="#fff8df"
              stroke="#173947"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M209 153v22h17v-22"
              fill="#fff8df"
              stroke="#173947"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path d="M214 160h8v15h-8v-15Z" fill="#9fdde2" />
          </g>
          <g className="resort-card__story-icon-palm">
            <path d="M55 121c7 25 5 52-8 80" stroke="#76543b" strokeWidth="7" strokeLinecap="round" />
            <path
              d="M56 120c-17-4-29 2-37 14 16 0 29-3 37-14Zm0 0c-6-15-3-29 8-42 7 17 4 31-8 42Zm0 0c14-11 29-13 45-4-14 9-29 10-45 4Zm0 0c-19 7-31 20-37 38 19-7 31-20 37-38Z"
              fill="#298b61"
              stroke="#173947"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          </g>
          <path
            d="M63 187c33-8 73-8 109 0"
            stroke="#173947"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <g className="resort-card__story-icon-spark">
            <path d="m219 59 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#ffe27a" />
            <path d="m42 151 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#ffe27a" />
            <circle cx="211" cy="111" r="4" fill="#d95a51" />
            <circle cx="57" cy="82" r="4" fill="#fff4a8" />
          </g>
        </svg>
      </span>
    );
  }

  if (slug === "boardwalk-villas") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--boardwalk-villas",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="BoardWalk Villas icon: Rose Garden Courtyard leisure pool, Community Hall, villa balconies, Crescent Lake boardwalk, and Keister Coaster echo"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="boardWalkVillasIconSky" x1="45" y1="28" x2="216" y2="231">
              <stop offset="0" stopColor="#fff9d7" />
              <stop offset="0.52" stopColor="#ffe6a9" />
              <stop offset="1" stopColor="#a7e8dc" />
            </linearGradient>
            <linearGradient id="boardWalkVillasIconWater" x1="57" y1="170" x2="225" y2="220">
              <stop offset="0" stopColor="#36c3c4" />
              <stop offset="1" stopColor="#126b7a" />
            </linearGradient>
            <linearGradient id="boardWalkVillasIconCoaster" x1="82" y1="168" x2="209" y2="199">
              <stop offset="0" stopColor="#ffe69b" />
              <stop offset="1" stopColor="#f4a638" />
            </linearGradient>
            <linearGradient id="boardWalkVillasIconPlanks" x1="43" y1="202" x2="213" y2="231">
              <stop offset="0" stopColor="#e1aa57" />
              <stop offset="1" stopColor="#b87936" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#boardWalkVillasIconSky)" />
          <path
            className="resort-card__story-icon-water"
            d="M59 178c28-21 71-25 106-10 26 12 47 10 60-2 1 24-14 44-38 54-43 19-100 11-130-14-11-9-10-19 2-28Z"
            fill="url(#boardWalkVillasIconWater)"
          />
          <g className="resort-card__story-icon-courtyard">
            <path
              d="M71 188c23-16 58-18 87-8 22 8 44 7 61-3"
              stroke="#fdf7d7"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M56 172c10-10 22-14 36-12-12 9-24 15-36 12Zm141-6c10-7 21-8 30-2-10 7-20 9-30 2Z"
              fill="#8dbd68"
              stroke="#0b4650"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          </g>
          <g className="resort-card__story-icon-boardwalk">
            <path
              d="M43 213c48-19 110-19 170-2-4 11-23 18-59 21-42 4-82-4-111-19Z"
              fill="url(#boardWalkVillasIconPlanks)"
            />
            <path
              d="M59 211c34-9 81-9 140 3"
              stroke="#fff0be"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="m93 201-10 23m45-26-1 30m35-27 12 23"
              stroke="#754926"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-roofline">
            <path
              d="M69 146 84 93h90l16 53H69Z"
              fill="#ffefd1"
              stroke="#0b4650"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="m86 93 20-25h47l21 25H86Z"
              fill="#7abac7"
              stroke="#0b4650"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M104 72h47v22H98l6-22Z"
              fill="#f7d7a1"
              stroke="#0b4650"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M82 112h96l13 21H68l14-21Z"
              fill="#2f7e8a"
              stroke="#0b4650"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M90 136h91v45H90v-45Z"
              fill="#fff9e4"
              stroke="#0b4650"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M102 146h18v27h-18v-27Zm32 0h18v27h-18v-27Zm32 0h16v27h-16v-27Z"
              fill="#bce3df"
              stroke="#0b4650"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M92 135h90"
              stroke="#f6b45c"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-villa-balconies">
            <path
              d="M96 160h91M96 176h86"
              stroke="#0b4650"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.34"
            />
            <path
              d="M112 145v37M144 145v37M174 145v35"
              stroke="#5d9da3"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-community-hall">
            <path d="M64 104v80" stroke="#704729" strokeWidth="6" strokeLinecap="round" />
            <path
              d="m64 106 40 10-40 12v-22Z"
              fill="#f5c75f"
              stroke="#704729"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          </g>
          <g className="resort-card__story-icon-rose">
            <path
              d="M49 176c9-11 21-12 28-3-10 10-20 12-28 3Z"
              fill="#8dbd68"
              stroke="#0b4650"
              strokeWidth="4"
            />
            <circle cx="66" cy="170" r="6" fill="#ef6d70" stroke="#8b3b4d" strokeWidth="3" />
            <circle cx="58" cy="171" r="4" fill="#f7a1a3" />
          </g>
          <g className="resort-card__story-icon-coaster">
            <path
              d="M82 186c26-21 60-22 84-8 15 9 26 20 43 19"
              stroke="url(#boardWalkVillasIconCoaster)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M82 186c26-21 60-22 84-8 15 9 26 20 43 19"
              stroke="#fff4c8"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M92 178c20-12 45-13 65-5"
              stroke="#8a5932"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="6 7"
            />
          </g>
          <g className="resort-card__story-icon-spark">
            <path d="m204 61 4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#f8b94a" />
            <circle cx="219" cy="111" r="4" fill="#f8b94a" />
            <circle cx="49" cy="145" r="4" fill="#f8b94a" />
            <circle cx="53" cy="91" r="5" fill="#ffd86b" />
          </g>
          <path
            d="M82 205c28-10 60-9 86 2"
            stroke="#0b4650"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }

  if (slug === "beach-club-villas") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--beach-club-villas",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Beach Club Villas icon: Dunes Cove pool, villa dormer, balconies, Crescent Lake bridge, and shared Stormalong Bay shipwreck slide"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="beachClubVillasIconSky" x1="48" y1="25" x2="208" y2="230">
              <stop offset="0" stopColor="#f9fbf4" />
              <stop offset="0.52" stopColor="#fff0b7" />
              <stop offset="1" stopColor="#8bd4d3" />
            </linearGradient>
            <linearGradient id="beachClubVillasIconWater" x1="57" y1="189" x2="213" y2="222">
              <stop offset="0" stopColor="#67d1d5" />
              <stop offset="1" stopColor="#126b7a" />
            </linearGradient>
            <linearGradient id="beachClubVillasIconSlide" x1="78" y1="151" x2="157" y2="181">
              <stop offset="0" stopColor="#fff0ad" />
              <stop offset="1" stopColor="#f6b64a" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#beachClubVillasIconSky)" />
          <g className="resort-card__story-icon-roofline">
            <path
              d="m67 142 29-39h68l30 39H67Z"
              fill="#2e7586"
              stroke="#102d3a"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M83 142h96v38H83v-38Z"
              fill="#f8fbf9"
              stroke="#102d3a"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="m105 103 14-25h29l14 25h-57Z"
              fill="#71bcc9"
              stroke="#102d3a"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M122 84h23v19h-23V84Z"
              fill="#f8fbf9"
              stroke="#102d3a"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <path
              d="M90 132h97"
              stroke="#f7f0b5"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-villa-balconies">
            <path
              d="M96 130h64m-61 15h58m-55 15h52"
              stroke="#102d3a"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.28"
            />
            <path
              d="M110 129v33m18-33v33m18-33v33"
              stroke="#68a9ad"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.72"
            />
          </g>
          <g className="resort-card__story-icon-shipwreck">
            <path
              d="m63 172 21-76"
              stroke="#8e5f3f"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="m84 99 29 20-38 9 9-29Z"
              fill="#f7f0b5"
              stroke="#102d3a"
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </g>
          <g className="resort-card__story-icon-slide">
            <path
              d="M78 153c27-2 55 9 75 31"
              stroke="url(#beachClubVillasIconSlide)"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path
              d="M76 154c31-6 63 5 83 24"
              stroke="#fff0ad"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-pool">
            <path
              d="M81 189c25-15 66-14 93 2-24 16-67 18-93-2Z"
              fill="#67d1d5"
              stroke="#102d3a"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M54 190c22-14 48-15 70-2-22 9-47 11-70 2Z"
              fill="#ebcb86"
              stroke="#102d3a"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M57 184c16-6 34-5 50 3m-6 8c19 6 45 5 60-2"
              stroke="#f7f0b5"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-bridge">
            <path
              d="M161 176c18-16 38-16 54 0"
              stroke="#102d3a"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M163 176c17-10 34-10 50 0"
              stroke="#f8fbf9"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M177 170v15m17-19v20m15-13v14"
              stroke="#f8fbf9"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <path
            className="resort-card__story-icon-water"
            d="M57 199c24-18 62-21 90-6 24 12 47 11 66-2"
            stroke="url(#beachClubVillasIconWater)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M75 217c19-10 41-10 62 0 20 9 43 7 62-4"
            stroke="#e8fafa"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <g className="resort-card__story-icon-spark">
            <circle cx="195" cy="70" r="10" fill="#ffcf6b" />
            <path
              d="M192 70h6m-3-3v6"
              stroke="#102d3a"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.42"
            />
            <circle cx="55" cy="113" r="4" fill="#ffcf6b" />
          </g>
        </svg>
      </span>
    );
  }

  if (slug === "beach-club-resort") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--beach-club-resort",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Beach Club Resort icon: Stormalong Bay, shipwreck slide, sand-bottom pool, Crescent Lake, white bridges, and New England seaside roofline"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="beachClubIconSky" x1="55" y1="26" x2="211" y2="228">
              <stop offset="0" stopColor="#f8fbf7" />
              <stop offset="0.5" stopColor="#fff2b8" />
              <stop offset="1" stopColor="#69c8d0" />
            </linearGradient>
            <linearGradient id="beachClubIconWater" x1="48" y1="194" x2="210" y2="230">
              <stop offset="0" stopColor="#55c9d1" />
              <stop offset="1" stopColor="#126b7a" />
            </linearGradient>
            <linearGradient id="beachClubIconSlide" x1="76" y1="134" x2="184" y2="181">
              <stop offset="0" stopColor="#ffe188" />
              <stop offset="1" stopColor="#f6b64a" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#beachClubIconSky)" />
          <g className="resort-card__story-icon-roofline">
            <path
              d="M70 126 100 96h66l28 30H70Z"
              fill="#397d8c"
              stroke="#102d3a"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M86 126h94v40H86v-40Z"
              fill="#f8fbf9"
              stroke="#102d3a"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="m106 96 10-20h35l9 20h-54Z"
              fill="#6bb8c7"
              stroke="#102d3a"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M93 116h93"
              stroke="#f7f0b5"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M102 143h18m17 0h18m-49 16h44"
              stroke="#6aa6aa"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-shipwreck">
            <path
              d="M71 176 97 68"
              stroke="#8e5f3f"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="m97 71 38 26-48 13 10-39Z"
              fill="#f7f0b5"
              stroke="#102d3a"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M66 176h39M83 91h42"
              stroke="#8e5f3f"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-slide">
            <path
              d="M88 135c35-1 72 16 93 48"
              stroke="url(#beachClubIconSlide)"
              strokeWidth="11"
              strokeLinecap="round"
            />
            <path
              d="M84 136c38-7 81 8 104 41"
              stroke="#fff0ad"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-pool">
            <path
              d="M63 190c28-20 78-20 114-2-25 19-76 23-114 2Z"
              fill="#ebcb86"
              stroke="#102d3a"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <path
              d="M80 187c28-11 62-10 83 2"
              stroke="#5ccbd4"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M92 200c20 5 42 5 63-1"
              stroke="#f7f0b5"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g className="resort-card__story-icon-bridge">
            <path
              d="M152 164c19-19 41-20 59-1"
              stroke="#102d3a"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path
              d="M153 164c19-13 39-13 57 0"
              stroke="#f8fbf9"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M166 159v17m18-22v23m17-17v17"
              stroke="#f8fbf9"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <path
            className="resort-card__story-icon-water"
            d="M47 205c24-15 52-15 77-1 27 15 57 14 85-5"
            stroke="url(#beachClubIconWater)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M68 223c17-9 36-9 55 0 20 9 43 9 64-1"
            stroke="#e8fafa"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <g className="resort-card__story-icon-spark">
            <circle cx="196" cy="66" r="11" fill="#ffcf6b" />
            <path
              d="M193 66h6m-3-3v6"
              stroke="#102d3a"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.45"
            />
            <circle cx="55" cy="104" r="5" fill="#ffcf6b" />
          </g>
        </svg>
      </span>
    );
  }

  if (slug === "bay-lake-tower-at-contemporary-resort") {
    return (
      <span
        className={cn(
          "resort-card__story-icon",
          "resort-card__story-icon--bay-lake-tower-at-contemporary-resort",
          isDarkBanner && "resort-card__story-icon--light"
        )}
        aria-hidden
        title="Bay Lake Tower icon: curved villa tower, Sky Way Bridge, Bay Cove Pool, balcony views, and Bay Lake water"
      >
        <svg
          className="resort-card__story-svg"
          viewBox="0 0 256 256"
          role="img"
          focusable="false"
        >
          <defs>
            <linearGradient id="bayLakeIconSky" x1="47" y1="25" x2="213" y2="223">
              <stop offset="0" stopColor="#e7faf8" />
              <stop offset="0.58" stopColor="#fff4c9" />
              <stop offset="1" stopColor="#7acad0" />
            </linearGradient>
            <linearGradient id="bayLakeIconTower" x1="75" y1="35" x2="157" y2="203">
              <stop offset="0" stopColor="#f7efe1" />
              <stop offset="1" stopColor="#b8c3ba" />
            </linearGradient>
            <linearGradient id="bayLakeIconWater" x1="49" y1="187" x2="215" y2="229">
              <stop offset="0" stopColor="#7ed6de" />
              <stop offset="1" stopColor="#126b7a" />
            </linearGradient>
          </defs>
          <circle cx="128" cy="128" r="112" fill="url(#bayLakeIconSky)" />
          <path
            d="M76 200c17-136 65-166 99-142-29 18-43 64-39 141H76Z"
            fill="url(#bayLakeIconTower)"
            stroke="#23343b"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path
            d="M88 181c15-89 44-122 66-121"
            stroke="#ffffff"
            strokeWidth="7"
            strokeLinecap="round"
            opacity="0.7"
          />
          <g className="resort-card__story-icon-balconies">
            <path
              d="M97 84h19M93 106h19M90 128h19M88 150h19M87 172h19"
              stroke="#3a525a"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.86"
            />
            <path
              d="M121 83h18M119 108h20M119 133h21M121 160h22"
              stroke="#16a6b6"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.8"
            />
          </g>
          <g className="resort-card__story-icon-bridge">
            <path
              d="M137 102c21-6 37-13 56-25"
              stroke="#304955"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M142 102c19-1 35-9 53-20"
              stroke="#f8fbf9"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.92"
            />
            <path
              d="m178 71 26-20 7 17-22 15Z"
              fill="#304955"
              stroke="#102d3a"
              strokeWidth="4"
              strokeLinejoin="round"
              opacity="0.92"
            />
          </g>
          <path
            className="resort-card__story-icon-water"
            d="M51 204c27-17 60-14 79-2 24 15 55 14 81-3"
            stroke="url(#bayLakeIconWater)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M75 218c18-9 36-9 53 0 18 9 38 9 56 0"
            stroke="#e7faf8"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.9"
          />
          <g className="resort-card__story-icon-pool">
            <path
              d="M126 187c13-15 33-15 47 0-13 12-33 12-47 0Z"
              fill="#53c7d3"
              stroke="#102d3a"
              strokeWidth="4"
            />
            <path
              d="M152 185c7-6 16-12 24-24"
              stroke="#ffcf6b"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <circle cx="168" cy="151" r="5" fill="#ffcf6b" />
            <circle cx="185" cy="177" r="4" fill="#ffffff" opacity="0.85" />
            <circle cx="195" cy="166" r="3" fill="#ffffff" opacity="0.75" />
          </g>
          <g className="resort-card__story-icon-spark">
            <path
              d="M58 111c12-10 24-15 36-17"
              stroke="#ffcf6b"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.9"
            />
            <circle cx="62" cy="107" r="4" fill="#ffcf6b" />
          </g>
        </svg>
      </span>
    );
  }

  if (slug !== "contemporary-resort") return null;

  return (
    <span
      className={cn(
        "resort-card__story-icon",
        "resort-card__story-icon--contemporary-resort",
        isDarkBanner && "resort-card__story-icon--light"
      )}
      aria-hidden
      title="Contemporary Resort icon: A-frame tower, monorail, Mary-Blair-inspired concourse color, and Bay Lake reflection"
    >
      <svg
        className="resort-card__story-svg"
        viewBox="0 0 256 256"
        role="img"
        focusable="false"
      >
        <defs>
          <linearGradient id="contemporaryIconSky" x1="42" y1="18" x2="218" y2="228">
            <stop offset="0" stopColor="#d9f7f8" />
            <stop offset="0.5" stopColor="#fff7d9" />
            <stop offset="1" stopColor="#f4a55f" />
          </linearGradient>
          <linearGradient id="contemporaryIconTower" x1="64" y1="40" x2="195" y2="214">
            <stop offset="0" stopColor="#304955" />
            <stop offset="1" stopColor="#15242d" />
          </linearGradient>
          <linearGradient id="contemporaryIconWater" x1="58" y1="203" x2="203" y2="232">
            <stop offset="0" stopColor="#53c7d3" stopOpacity="0.95" />
            <stop offset="1" stopColor="#146b7a" stopOpacity="0.82" />
          </linearGradient>
        </defs>
        <circle cx="128" cy="128" r="112" fill="url(#contemporaryIconSky)" />
        <path
          d="M63 204 102 44c4-14 48-14 52 0l39 160h-28L143 84c-3-15-27-15-30 0L91 204H63Z"
          fill="url(#contemporaryIconTower)"
        />
        <path
          d="M96 61c16-10 48-10 64 0"
          stroke="#ffcf6b"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.85"
        />
        <g className="resort-card__story-icon-monorail">
          <path
            d="M72 142c16-16 96-16 112 0 6 6 3 20-6 22-33 7-67 7-100 0-9-2-12-16-6-22Z"
            fill="#f8fbf9"
            stroke="#102d3a"
            strokeWidth="5"
          />
          <path
            d="M85 145h86"
            stroke="#16a6b6"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="96" cy="153" r="5" fill="#ffcf6b" />
          <circle cx="116" cy="153" r="5" fill="#ffcf6b" />
          <circle cx="136" cy="153" r="5" fill="#ffcf6b" />
          <circle cx="156" cy="153" r="5" fill="#ffcf6b" />
        </g>
        <g className="resort-card__story-icon-concourse">
          <path d="M103 91h50v28h-50V91Z" fill="#ffcf6b" />
          <path d="M107 95h14v13h-14V95Z" fill="#ee6f4b" />
          <path d="M124 95h15v13h-15V95Z" fill="#16a6b6" />
          <path d="M142 95h11v24h-11V95Z" fill="#f7f0b5" />
          <path d="M108 112h14v7h-14v-7Z" fill="#a8d672" />
          <path d="M126 112h13v7h-13v-7Z" fill="#f299a5" />
        </g>
        <path
          className="resort-card__story-icon-water"
          d="M56 209c20-11 46-11 71 0 24 11 53 11 75 0"
          stroke="url(#contemporaryIconWater)"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d="M78 226c17-8 34-8 50 0 17 8 36 8 53 0"
          stroke="#d9f7f8"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.82"
        />
        <g className="resort-card__story-icon-spark">
          <circle cx="197" cy="59" r="13" fill="#ffcf6b" />
          <path
            d="M194 59h6m-3-3v6"
            stroke="#102d3a"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.42"
          />
        </g>
      </svg>
    </span>
  );
}
