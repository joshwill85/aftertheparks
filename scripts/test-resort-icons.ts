import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  hasResortStoryIcon,
  ResortStoryIcon,
} from "../components/resort/ResortStoryIcon";

const resortCard = readFileSync("components/resort/ResortCard.tsx", "utf8");
const resortIcon = readFileSync("components/resort/ResortStoryIcon.tsx", "utf8");
const polishCss = readFileSync("src/styles/polish.css", "utf8");

assert.match(
  resortIcon,
  /contemporary-resort/,
  "Contemporary Resort must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /bay-lake-tower-at-contemporary-resort/,
  "Bay Lake Tower must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /beach-club-resort/,
  "Beach Club Resort must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /beach-club-villas/,
  "Beach Club Villas must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /boardwalk-inn/,
  "BoardWalk Inn must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /boardwalk-villas/,
  "BoardWalk Villas must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /caribbean-beach-resort/,
  "Caribbean Beach Resort must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /coronado-springs-resort/,
  "Coronado Springs Resort must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /grand-floridian-resort-and-spa/,
  "Grand Floridian Resort & Spa must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /villas-at-grand-floridian-resort-and-spa/,
  "The Villas at Disney's Grand Floridian Resort & Spa must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /all-star-movies-resort/,
  "All-Star Movies Resort must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /all-star-music-resort/,
  "All-Star Music Resort must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /all-star-sports-resort/,
  "All-Star Sports Resort must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /animal-kingdom-lodge/,
  "Animal Kingdom Lodge must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /animal-kingdom-villas-jambo-house/,
  "Animal Kingdom Villas - Jambo House must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /animal-kingdom-villas-kidani-village/,
  "Animal Kingdom Villas - Kidani Village must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /art-of-animation-resort/,
  "Art of Animation Resort must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /yacht-club-resort/,
  "Yacht Club Resort must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /wilderness-lodge/,
  "Wilderness Lodge must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /boulder-ridge-villas-at-wilderness-lodge/,
  "Boulder Ridge Villas at Disney's Wilderness Lodge must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /copper-creek-villas-and-cabins-at-wilderness-lodge/,
  "Copper Creek Villas & Cabins at Disney's Wilderness Lodge must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /cabins-at-fort-wilderness-resort/,
  "The Cabins at Disney's Fort Wilderness Resort must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /campsites-at-fort-wilderness-resort/,
  "The Campsites at Disney's Fort Wilderness Resort must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /old-key-west-resort/,
  "Disney's Old Key West Resort must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /polynesian-village-resort/,
  "Disney's Polynesian Village Resort must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /polynesian-villas-and-bungalows/,
  "Disney's Polynesian Villas & Bungalows must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /pop-century-resort/,
  "Disney's Pop Century Resort must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /port-orleans-resort-french-quarter/,
  "Disney's Port Orleans Resort - French Quarter must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /port-orleans-resort-riverside/,
  "Disney's Port Orleans Resort - Riverside must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /riviera-resort/,
  "Disney's Riviera Resort must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /saratoga-springs-resort-and-spa/,
  "Disney's Saratoga Springs Resort & Spa must have a dedicated story icon entry"
);
assert.match(
  resortIcon,
  /A-frame|monorail|Mary-Blair|Bay Lake/i,
  "Contemporary Resort icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Sky Way Bridge|Bay Cove Pool|balcony views|Bay Lake/i,
  "Bay Lake Tower icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Stormalong Bay|shipwreck|sand-bottom|Crescent Lake/i,
  "Beach Club Resort icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Dunes Cove|villa dormer|balconies|Stormalong Bay/i,
  "Beach Club Villas icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Luna Park|Keister Coaster|Atlantic City|boardwalk/i,
  "BoardWalk Inn icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Rose Garden Courtyard|Community Hall|leisure pool|Keister Coaster/i,
  "BoardWalk Villas icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Fuentes del Morro|Barefoot Bay|Skyliner|Spanish-fortress/i,
  "Caribbean Beach Resort icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Lost City of Cibola|Lago Dorado|Jaguar|Gran Destino/i,
  "Coronado Springs Resort icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Victorian|Seven Seas Lagoon|Beach Pool|monorail|fireworks/i,
  "Grand Floridian Resort & Spa icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Victorian-style villa|comforts of home|Seven Seas Lagoon|Wedding Pavilion|Beach Pool/i,
  "The Villas at Disney's Grand Floridian Resort & Spa icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Fantasia Pool|Sorcerer Mickey|Duck Pond|Mighty Ducks|film reel|Cinema Hall/i,
  "All-Star Movies Resort icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Calypso Pool|Three Caballeros|Piano Pool|Melody Hall|guitar-shaped|maracas/i,
  "All-Star Music Resort icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Surfboard Bay|Grand Slam Pool|baseball diamond|Goofy|pitcher|surfboards/i,
  "All-Star Sports Resort icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Jambo House|kraal|savanna|Uzima Springs|African art|giraffe|zebra/i,
  "Animal Kingdom Lodge icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Jambo House|villa|balcony|String of Memories|Uzima|savanna overlook|African art/i,
  "Animal Kingdom Villas - Jambo House icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Kidani Village|Pembe Savanna Overlook|Samawati|Uwanja|Community Hall|String of Memories|Survival of the Fittest/i,
  "Animal Kingdom Villas - Kidani Village icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Art of Animation|Big Blue Pool|Finding Nemo|Cars|Lion King|Little Mermaid|Animation Hall|Pixel Play|Pride Rock|Skyliner/i,
  "Art of Animation Resort icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Yacht Club|lighthouse|burgee|compass|anchor|Crescent Lake|Admiral Pool|Stormalong|Shipwreck Beach/i,
  "Yacht Club Resort icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Wilderness Lodge|National Park|pine|mountain|bear|fireplace|Copper Creek Springs|geyser|Bay Lake|campfire/i,
  "Wilderness Lodge icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Boulder Ridge|Cove Pool|villa|railroad hotel|American West|pine|boulder|zero-depth|whirlpool|shaded seating/i,
  "Boulder Ridge Villas icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Copper Creek|cabins|Bay Lake|Pacific Northwest|waterfront|wraparound porch|hidden trails|railway|Copper Creek Springs Pool|rock waterslide|Geyser Point/i,
  "Copper Creek Villas & Cabins icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Rustic American Frontier|Fort Wilderness|Cabins|golf cart|Reception Outpost|Wilderness Swimmin|Meadow Swimmin|Campground Theater|Chip|Dale|pine|cypress|Tri-Circle-D|Bike Barn/i,
  "The Cabins at Disney's Fort Wilderness Resort icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /backcountry|campground|Campsites|tent|RV|Meadow Recreation|Chip|Dale|campfire|Pioneer Hall|wagon|Tri-Circle-D|Bike Barn|Electrical Water Pageant|pine|cypress/i,
  "The Campsites at Disney's Fort Wilderness Resort icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Old Key West|Conch Flats|Florida Keys|Sandcastle Pool|125-foot|lighthouse|dolphin|shimmering canal|Lake Buena Vista Golf Course|surrey|Hank|Electric Eel/i,
  "Disney's Old Key West Resort icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Polynesian Village|South Pacific|Great Ceremonial House|Lava Pool|volcano|142 foot|Moana|Seven Seas Lagoon|monorail|Electrical Water Pageant|Seven Seas Marina|tiki|lei/i,
  "Disney's Polynesian Village Resort icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Polynesian Villas|Bungalows|Island Tower|Cove Pool|Moana|canoe|Oasis Patio|Seven Seas Lagoon|aquatic red carpet|overwater|bungalow|Pineapple Lanai/i,
  "Disney's Polynesian Villas & Bungalows icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Pop Century|1950s|1960s|1970s|1980s|1990s|Hippy Dippy|flower-shaped|Bowling Pool|Computer Pool|Rubik|yo-yo|Generation Gap|Hourglass Lake|Skyliner|Everything Pop|Fast Forward/i,
  "Disney's Pop Century Resort icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Port Orleans|French Quarter|New Orleans|Mardi Gras|cobblestone|gas lamps|wrought-iron|magnolia|jazz|Sassagoula|Doubloon Lagoon|Scales|51-foot|sea serpent|King Neptune|alligator|South Quarter|surrey/i,
  "Disney's Port Orleans Resort - French Quarter icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Port Orleans|Riverside|rural Louisiana|Magnolia Bend|Alligator Bayou|Sassagoula|Ol.? Man Island|3.5-acre|swimmin|fishin|abandoned sawmill|wooden bridges|95 foot|rustic waterslide|Muddy Rivers|Riverside Levee Marina|carriage|cane pole|surrey/i,
  "Disney's Port Orleans Resort - Riverside icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Riviera|Europe imagined by Disney|European Riviera|Mediterranean|mosaic|Riviera Pool|stately column|S.il Vous Play|Fantasia|Beau Soleil|Skyliner|waterfront|garden|fountain|Eventi|Cote|Azur|Movie Lawn|Barefoot Bay/i,
  "Disney's Riviera Resort icon notes must preserve the researched story anchors"
);
assert.match(
  resortIcon,
  /Saratoga Springs|late-1800s|Victorian|spa|horse|racing|winner|spring water|Lake Buena Vista|Disney Springs|golf|High Rock Spring|128-foot|Paddock|146-foot|water tower|Donald Duck|Community Hall|Horsing Around|Turf Club|Congress Park/i,
  "Disney's Saratoga Springs Resort & Spa icon notes must preserve the researched story anchors"
);
assert.match(
  resortCard,
  /ResortStoryIcon/,
  "Resort cards must render story icons when available"
);
assert.match(
  resortCard,
  /hasResortStoryIcon\(resort\.slug\)/,
  "Resort cards must branch on a resort-specific icon registry before falling back to initials"
);
assert.ok(
  resortCard.indexOf("{hasStoryIcon ?") < resortCard.indexOf("resort-card__initial"),
  "Resort cards must check for a story icon before rendering the monogram fallback"
);
assert.match(
  polishCss,
  /resort-card__story-icon/,
  "Resort story icons need dedicated card styling instead of reusing monogram styling"
);

assert.match(
  polishCss,
  /\.event-card__resort-story-icon\s*\{[\s\S]*padding:\s*3px[\s\S]*overflow:\s*hidden/,
  "Event-card resort badges should provide an even white inset around the icon artwork."
);

assert.match(
  polishCss,
  /\.event-card__resort-story-icon \.resort-card__story-icon\s*\{[\s\S]*width:\s*100%[\s\S]*height:\s*100%[\s\S]*border-radius:\s*999px/,
  "Event-card resort icon containers should fill the badge frame and stay centered."
);

assert.match(
  polishCss,
  /\.event-card__resort-story-icon \.resort-card__story-svg\s*\{[\s\S]*display:\s*block[\s\S]*width:\s*100%[\s\S]*height:\s*100%[\s\S]*transform:\s*scale\(1\.16\)/,
  "Event-card resort SVGs should compensate for built-in viewBox padding so the artwork fills the badge."
);

const bayLakeMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "bay-lake-tower-at-contemporary-resort",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("bay-lake-tower-at-contemporary-resort"),
  true,
  "Bay Lake Tower slug must resolve to a story icon"
);
assert.match(
  bayLakeMarkup,
  /resort-card__story-icon--bay-lake-tower-at-contemporary-resort/,
  "Bay Lake Tower icon must render its own resort-specific class"
);
assert.doesNotMatch(
  bayLakeMarkup,
  /resort-card__initial|>BL</,
  "Bay Lake Tower icon rendering must not fall back to initials"
);

const beachClubMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "beach-club-resort",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("beach-club-resort"),
  true,
  "Beach Club Resort slug must resolve to a story icon"
);
assert.match(
  beachClubMarkup,
  /resort-card__story-icon--beach-club-resort/,
  "Beach Club Resort icon must render its own resort-specific class"
);
assert.doesNotMatch(
  beachClubMarkup,
  /resort-card__initial|>BC</,
  "Beach Club Resort icon rendering must not fall back to initials"
);

const beachClubVillasMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "beach-club-villas",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("beach-club-villas"),
  true,
  "Beach Club Villas slug must resolve to a story icon"
);
assert.match(
  beachClubVillasMarkup,
  /resort-card__story-icon--beach-club-villas/,
  "Beach Club Villas icon must render its own resort-specific class"
);
assert.doesNotMatch(
  beachClubVillasMarkup,
  /resort-card__initial|>BC</,
  "Beach Club Villas icon rendering must not fall back to initials"
);

const boardWalkInnMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "boardwalk-inn",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("boardwalk-inn"),
  true,
  "BoardWalk Inn slug must resolve to a story icon"
);
assert.match(
  boardWalkInnMarkup,
  /resort-card__story-icon--boardwalk-inn/,
  "BoardWalk Inn icon must render its own resort-specific class"
);
assert.doesNotMatch(
  boardWalkInnMarkup,
  /resort-card__initial|>B<|>BW</,
  "BoardWalk Inn icon rendering must not fall back to initials"
);

const boardWalkVillasMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "boardwalk-villas",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("boardwalk-villas"),
  true,
  "BoardWalk Villas slug must resolve to a story icon"
);
assert.match(
  boardWalkVillasMarkup,
  /resort-card__story-icon--boardwalk-villas/,
  "BoardWalk Villas icon must render its own resort-specific class"
);
assert.doesNotMatch(
  boardWalkVillasMarkup,
  /resort-card__initial|>B<|>BV</,
  "BoardWalk Villas icon rendering must not fall back to initials"
);

const caribbeanBeachMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "caribbean-beach-resort",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("caribbean-beach-resort"),
  true,
  "Caribbean Beach Resort slug must resolve to a story icon"
);
assert.match(
  caribbeanBeachMarkup,
  /resort-card__story-icon--caribbean-beach-resort/,
  "Caribbean Beach Resort icon must render its own resort-specific class"
);
assert.doesNotMatch(
  caribbeanBeachMarkup,
  /resort-card__initial|>C<|>CB</,
  "Caribbean Beach Resort icon rendering must not fall back to initials"
);

const coronadoSpringsMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "coronado-springs-resort",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("coronado-springs-resort"),
  true,
  "Coronado Springs Resort slug must resolve to a story icon"
);
assert.match(
  coronadoSpringsMarkup,
  /resort-card__story-icon--coronado-springs-resort/,
  "Coronado Springs Resort icon must render its own resort-specific class"
);
assert.doesNotMatch(
  coronadoSpringsMarkup,
  /resort-card__initial|>C<|>CS</,
  "Coronado Springs Resort icon rendering must not fall back to initials"
);

const grandFloridianMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "grand-floridian-resort-and-spa",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("grand-floridian-resort-and-spa"),
  true,
  "Grand Floridian Resort & Spa slug must resolve to a story icon"
);
assert.match(
  grandFloridianMarkup,
  /resort-card__story-icon--grand-floridian-resort-and-spa/,
  "Grand Floridian Resort & Spa icon must render its own resort-specific class"
);
assert.doesNotMatch(
  grandFloridianMarkup,
  /resort-card__initial|>G<|>GF</,
  "Grand Floridian Resort & Spa icon rendering must not fall back to initials"
);

const villasGrandFloridianMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "villas-at-grand-floridian-resort-and-spa",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("villas-at-grand-floridian-resort-and-spa"),
  true,
  "The Villas at Disney's Grand Floridian Resort & Spa slug must resolve to a story icon"
);
assert.match(
  villasGrandFloridianMarkup,
  /resort-card__story-icon--villas-at-grand-floridian-resort-and-spa/,
  "The Villas at Disney's Grand Floridian Resort & Spa icon must render its own resort-specific class"
);
assert.doesNotMatch(
  villasGrandFloridianMarkup,
  /resort-card__initial|>T<|>TV</,
  "The Villas at Disney's Grand Floridian Resort & Spa icon rendering must not fall back to initials"
);

const allStarMoviesMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "all-star-movies-resort",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("all-star-movies-resort"),
  true,
  "All-Star Movies Resort slug must resolve to a story icon"
);
assert.match(
  allStarMoviesMarkup,
  /resort-card__story-icon--all-star-movies-resort/,
  "All-Star Movies Resort icon must render its own resort-specific class"
);
assert.doesNotMatch(
  allStarMoviesMarkup,
  /resort-card__initial|>A<|>ASM</,
  "All-Star Movies Resort icon rendering must not fall back to initials"
);

const allStarMusicMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "all-star-music-resort",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("all-star-music-resort"),
  true,
  "All-Star Music Resort slug must resolve to a story icon"
);
assert.match(
  allStarMusicMarkup,
  /resort-card__story-icon--all-star-music-resort/,
  "All-Star Music Resort icon must render its own resort-specific class"
);
assert.doesNotMatch(
  allStarMusicMarkup,
  /resort-card__initial|>A<|>ASM</,
  "All-Star Music Resort icon rendering must not fall back to initials"
);

const allStarSportsMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "all-star-sports-resort",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("all-star-sports-resort"),
  true,
  "All-Star Sports Resort slug must resolve to a story icon"
);
assert.match(
  allStarSportsMarkup,
  /resort-card__story-icon--all-star-sports-resort/,
  "All-Star Sports Resort icon must render its own resort-specific class"
);
assert.doesNotMatch(
  allStarSportsMarkup,
  /resort-card__initial|>A<|>ASS</,
  "All-Star Sports Resort icon rendering must not fall back to initials"
);

const animalKingdomLodgeMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "animal-kingdom-lodge",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("animal-kingdom-lodge"),
  true,
  "Animal Kingdom Lodge slug must resolve to a story icon"
);
assert.match(
  animalKingdomLodgeMarkup,
  /resort-card__story-icon--animal-kingdom-lodge/,
  "Animal Kingdom Lodge icon must render its own resort-specific class"
);
assert.doesNotMatch(
  animalKingdomLodgeMarkup,
  /resort-card__initial|>A<|>AKL</,
  "Animal Kingdom Lodge icon rendering must not fall back to initials"
);

const animalKingdomVillasJamboMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "animal-kingdom-villas-jambo-house",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("animal-kingdom-villas-jambo-house"),
  true,
  "Animal Kingdom Villas - Jambo House slug must resolve to a story icon"
);
assert.match(
  animalKingdomVillasJamboMarkup,
  /resort-card__story-icon--animal-kingdom-villas-jambo-house/,
  "Animal Kingdom Villas - Jambo House icon must render its own resort-specific class"
);
assert.doesNotMatch(
  animalKingdomVillasJamboMarkup,
  /resort-card__initial|>A<|>AKVJH</,
  "Animal Kingdom Villas - Jambo House icon rendering must not fall back to initials"
);

const animalKingdomVillasKidaniMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "animal-kingdom-villas-kidani-village",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("animal-kingdom-villas-kidani-village"),
  true,
  "Animal Kingdom Villas - Kidani Village slug must resolve to a story icon"
);
assert.match(
  animalKingdomVillasKidaniMarkup,
  /resort-card__story-icon--animal-kingdom-villas-kidani-village/,
  "Animal Kingdom Villas - Kidani Village icon must render its own resort-specific class"
);
assert.doesNotMatch(
  animalKingdomVillasKidaniMarkup,
  /resort-card__initial|>A<|>AKVK/,
  "Animal Kingdom Villas - Kidani Village icon rendering must not fall back to initials"
);

const artOfAnimationMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "art-of-animation-resort",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("art-of-animation-resort"),
  true,
  "Art of Animation Resort slug must resolve to a story icon"
);
assert.match(
  artOfAnimationMarkup,
  /resort-card__story-icon--art-of-animation-resort/,
  "Art of Animation Resort icon must render its own resort-specific class"
);
assert.doesNotMatch(
  artOfAnimationMarkup,
  /resort-card__initial|>A<|>AOA/,
  "Art of Animation Resort icon rendering must not fall back to initials"
);

const yachtClubMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "yacht-club-resort",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("yacht-club-resort"),
  true,
  "Yacht Club Resort slug must resolve to a story icon"
);
assert.match(
  yachtClubMarkup,
  /resort-card__story-icon--yacht-club-resort/,
  "Yacht Club Resort icon must render its own resort-specific class"
);
assert.doesNotMatch(
  yachtClubMarkup,
  /resort-card__initial|>Y<|>YC/,
  "Yacht Club Resort icon rendering must not fall back to initials"
);

const wildernessLodgeMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "wilderness-lodge",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("wilderness-lodge"),
  true,
  "Wilderness Lodge slug must resolve to a story icon"
);
assert.match(
  wildernessLodgeMarkup,
  /resort-card__story-icon--wilderness-lodge/,
  "Wilderness Lodge icon must render its own resort-specific class"
);
assert.doesNotMatch(
  wildernessLodgeMarkup,
  /resort-card__initial|>W<|>WL/,
  "Wilderness Lodge icon rendering must not fall back to initials"
);

const boulderRidgeMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "boulder-ridge-villas-at-wilderness-lodge",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("boulder-ridge-villas-at-wilderness-lodge"),
  true,
  "Boulder Ridge Villas slug must resolve to a story icon"
);
assert.match(
  boulderRidgeMarkup,
  /resort-card__story-icon--boulder-ridge-villas-at-wilderness-lodge/,
  "Boulder Ridge Villas icon must render its own resort-specific class"
);
assert.doesNotMatch(
  boulderRidgeMarkup,
  /resort-card__initial|>B<|>BR/,
  "Boulder Ridge Villas icon rendering must not fall back to initials"
);

const copperCreekMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "copper-creek-villas-and-cabins-at-wilderness-lodge",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("copper-creek-villas-and-cabins-at-wilderness-lodge"),
  true,
  "Copper Creek Villas & Cabins slug must resolve to a story icon"
);
assert.match(
  copperCreekMarkup,
  /resort-card__story-icon--copper-creek-villas-and-cabins-at-wilderness-lodge/,
  "Copper Creek Villas & Cabins icon must render its own resort-specific class"
);
assert.doesNotMatch(
  copperCreekMarkup,
  /resort-card__initial|>C<|>CC/,
  "Copper Creek Villas & Cabins icon rendering must not fall back to initials"
);

const fortWildernessCabinsMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "cabins-at-fort-wilderness-resort",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("cabins-at-fort-wilderness-resort"),
  true,
  "The Cabins at Disney's Fort Wilderness Resort slug must resolve to a story icon"
);
assert.match(
  fortWildernessCabinsMarkup,
  /resort-card__story-icon--cabins-at-fort-wilderness-resort/,
  "The Cabins at Disney's Fort Wilderness Resort icon must render its own resort-specific class"
);
assert.doesNotMatch(
  fortWildernessCabinsMarkup,
  /resort-card__initial|>C<|>FWC/,
  "The Cabins at Disney's Fort Wilderness Resort icon rendering must not fall back to initials"
);

const fortWildernessCampsitesMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "campsites-at-fort-wilderness-resort",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("campsites-at-fort-wilderness-resort"),
  true,
  "The Campsites at Disney's Fort Wilderness Resort slug must resolve to a story icon"
);
assert.match(
  fortWildernessCampsitesMarkup,
  /resort-card__story-icon--campsites-at-fort-wilderness-resort/,
  "The Campsites at Disney's Fort Wilderness Resort icon must render its own resort-specific class"
);
assert.doesNotMatch(
  fortWildernessCampsitesMarkup,
  /resort-card__initial|>C<|>TC/,
  "The Campsites at Disney's Fort Wilderness Resort icon rendering must not fall back to initials"
);

const oldKeyWestMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "old-key-west-resort",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("old-key-west-resort"),
  true,
  "Disney's Old Key West Resort slug must resolve to a story icon"
);
assert.match(
  oldKeyWestMarkup,
  /resort-card__story-icon--old-key-west-resort/,
  "Disney's Old Key West Resort icon must render its own resort-specific class"
);
assert.doesNotMatch(
  oldKeyWestMarkup,
  /resort-card__initial|>O<|>OK/,
  "Disney's Old Key West Resort icon rendering must not fall back to initials"
);

const polynesianVillageMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "polynesian-village-resort",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("polynesian-village-resort"),
  true,
  "Disney's Polynesian Village Resort slug must resolve to a story icon"
);
assert.match(
  polynesianVillageMarkup,
  /resort-card__story-icon--polynesian-village-resort/,
  "Disney's Polynesian Village Resort icon must render its own resort-specific class"
);
assert.doesNotMatch(
  polynesianVillageMarkup,
  /resort-card__initial|>P<|>PV/,
  "Disney's Polynesian Village Resort icon rendering must not fall back to initials"
);

const polynesianVillasMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "polynesian-villas-and-bungalows",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("polynesian-villas-and-bungalows"),
  true,
  "Disney's Polynesian Villas & Bungalows slug must resolve to a story icon"
);
assert.match(
  polynesianVillasMarkup,
  /resort-card__story-icon--polynesian-villas-and-bungalows/,
  "Disney's Polynesian Villas & Bungalows icon must render its own resort-specific class"
);
assert.doesNotMatch(
  polynesianVillasMarkup,
  /resort-card__initial|>P<|>PV/,
  "Disney's Polynesian Villas & Bungalows icon rendering must not fall back to initials"
);

const popCenturyMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "pop-century-resort",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("pop-century-resort"),
  true,
  "Disney's Pop Century Resort slug must resolve to a story icon"
);
assert.match(
  popCenturyMarkup,
  /resort-card__story-icon--pop-century-resort/,
  "Disney's Pop Century Resort icon must render its own resort-specific class"
);
assert.doesNotMatch(
  popCenturyMarkup,
  /resort-card__initial|>P<|>PC/,
  "Disney's Pop Century Resort icon rendering must not fall back to initials"
);

const portOrleansFrenchQuarterMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "port-orleans-resort-french-quarter",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("port-orleans-resort-french-quarter"),
  true,
  "Disney's Port Orleans Resort - French Quarter slug must resolve to a story icon"
);
assert.match(
  portOrleansFrenchQuarterMarkup,
  /resort-card__story-icon--port-orleans-resort-french-quarter/,
  "Disney's Port Orleans Resort - French Quarter icon must render its own resort-specific class"
);
assert.doesNotMatch(
  portOrleansFrenchQuarterMarkup,
  /resort-card__initial|>P<|>PO|>PFQ/,
  "Disney's Port Orleans Resort - French Quarter icon rendering must not fall back to initials"
);

const portOrleansRiversideMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "port-orleans-resort-riverside",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("port-orleans-resort-riverside"),
  true,
  "Disney's Port Orleans Resort - Riverside slug must resolve to a story icon"
);
assert.match(
  portOrleansRiversideMarkup,
  /resort-card__story-icon--port-orleans-resort-riverside/,
  "Disney's Port Orleans Resort - Riverside icon must render its own resort-specific class"
);
assert.doesNotMatch(
  portOrleansRiversideMarkup,
  /resort-card__initial|>P<|>PO|>PR/,
  "Disney's Port Orleans Resort - Riverside icon rendering must not fall back to initials"
);

const rivieraMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "riviera-resort",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("riviera-resort"),
  true,
  "Disney's Riviera Resort slug must resolve to a story icon"
);
assert.match(
  rivieraMarkup,
  /resort-card__story-icon--riviera-resort/,
  "Disney's Riviera Resort icon must render its own resort-specific class"
);
assert.doesNotMatch(
  rivieraMarkup,
  /resort-card__initial|>R<|>RR/,
  "Disney's Riviera Resort icon rendering must not fall back to initials"
);

const saratogaMarkup = renderToStaticMarkup(
  createElement(ResortStoryIcon, {
    slug: "saratoga-springs-resort-and-spa",
    isDarkBanner: false,
  })
);

assert.equal(
  hasResortStoryIcon("saratoga-springs-resort-and-spa"),
  true,
  "Disney's Saratoga Springs Resort & Spa slug must resolve to a story icon"
);
assert.match(
  saratogaMarkup,
  /resort-card__story-icon--saratoga-springs-resort-and-spa/,
  "Disney's Saratoga Springs Resort & Spa icon must render its own resort-specific class"
);
assert.doesNotMatch(
  saratogaMarkup,
  /resort-card__initial|>S<|>SS|>SSR/,
  "Disney's Saratoga Springs Resort & Spa icon rendering must not fall back to initials"
);

console.log("Resort story icon coverage passed.");
