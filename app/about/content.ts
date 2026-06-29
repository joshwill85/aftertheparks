export type AboutIconName =
  | "sun-pack"
  | "cabin-key"
  | "paper-stack"
  | "pencil-dots"
  | "route-sign"
  | "lantern-path";

export interface StorySection {
  heading: string;
  icon: AboutIconName;
  mapNote: string;
  paragraphs: string[];
}

export const heroContent = {
  headline: "I built After the Parks because I needed it first.",
  subhead:
    "A family staycation, a little girl's first real summer, a cabin at Fort Wilderness, and one dad who could not stop trying to organize the magic.",
  primaryCta: {
    label: "Read the story",
    href: "#story",
  },
  secondaryCta: {
    label: "Explore today's activities",
    href: "/today",
  },
  illustrationAlt:
    "Illustrated resort planning map with a cabin, campfire, backpack, and route marks.",
  decorativeLabels: [
    "Fort Wilderness cabin",
    "folded planning map",
    "campfire glow",
    "route pins",
    "kid-sized backpack",
  ],
} as const;

export const storySections: StorySection[] = [
  {
    heading: "The summer we wanted to make count",
    icon: "sun-pack",
    mapNote: "Map note 01 · Budget summer",
    paragraphs: [
      "I'm Josh, the dad behind After the Parks.",
      "This whole thing started because I wanted to give our daughter a summer she would remember.",
      "We did not have big-vacation money this year. My daughter had just wrapped up VPK here in Florida, and my wife and I wanted to do what parents do. We wanted to stretch what we had, make it feel bigger than it was, and give her one of those first real summer memories that sticks.",
      "My wife and daughter are Disney people. I am not.",
    ],
  },
  {
    heading: "The cabin that made it possible",
    icon: "cabin-key",
    mapNote: "Map note 02 · Cabin math",
    paragraphs: [
      "I have always respected Disney. I love the storytelling. I love that they can make a place feel different from the rest of the world. I love that so many families have their own memories tied to a resort, a boat ride, a campfire, a song, a smell, or a little moment that probably did not look like much to anyone else.",
      "But I was not the guy counting down to park days. I was not the expert. I was not the one who knew every resort, every bus route, every hidden activity, or every perfect place to end the night.",
      "Living in Orlando, though, it made sense for us to build something Disney into our summer. We called my sister, and she agreed to split the cost of one of the new cabins at Fort Wilderness with us. My wife and daughter had annual passes, there were dining deals we could work around, and suddenly we had the makings of a real staycation with extended family.",
    ],
  },
  {
    heading: "The planning problem",
    icon: "paper-stack",
    mapNote: "Map note 03 · The problem",
    paragraphs: [
      "Once the cabin was booked, I did what I always do. I started planning way too much.",
      "I wanted to make the trip feel full without making it feel expensive. I wanted to visit other resorts. I wanted to find the campfires, movies, scavenger hunts, crafts, community halls, boat rides, playgrounds, and all the little things that make Disney feel magical even when you are not walking into a park.",
      "I knew some of those things existed. I just did not know how scattered they were.",
      "The information was out there, but not in a way that felt easy to use. Some of it lived in PDFs. Some of it was buried in images. Some of it was separated by resort. Some of it was hard to compare.",
      "For someone who just wanted to make a little girl's summer feel special, it felt harder than it needed to be.",
    ],
  },
  {
    heading: "The part where I could not leave it alone",
    icon: "pencil-dots",
    mapNote: "Map note 04 · Dad brain activates",
    paragraphs: [
      "A few things about me probably explain what happened next.",
      "First, I am a planner. Sometimes to an unhealthy degree.",
      "Second, I have a bad habit of running straight toward problems once I see them. I joke that it is one of my more toxic traits. If something feels broken and I think I can fix it, I have a hard time letting it go.",
      "Third, in my professional life, I work with data and analytics. A big part of what I do is take messy information, organize it, and turn it into something people can actually understand and use.",
      "So once I saw the problem, my brain would not leave it alone.",
    ],
  },
  {
    heading: "After the Parks is born",
    icon: "route-sign",
    mapNote: "Map note 05 · A useful map",
    paragraphs: [
      "I started playing with name ideas. The names I wanted most were already taken, because of course they were. Maybe one day, if this grows into something useful enough, I will try to buy one of them. But I move fast, sometimes too fast, and within about an hour After the Parks had a name.",
      "That is really what this site is about.",
      "It is for the families trying to make the most of the time they have. It is for the parents who want the trip to feel magical but also need it to be realistic.",
      "It is for the grandparents, aunts, uncles, locals, resort-hoppers, Disney fans, almost-Disney fans, and tired planners who do not want to dig through ten different places just to figure out what is happening tonight.",
      "And it is especially for the people who know that some of the best Disney memories do not happen on a ride. They happen after dinner, on a boat, around a campfire, at a movie under the stars, walking through a resort you have never visited before, watching your kid light up over something small.",
    ],
  },
  {
    heading: "Maybe I'm becoming a Disney person",
    icon: "lantern-path",
    mapNote: "Map note 06 · Still in progress",
    paragraphs: [
      "We did take that Fort Wilderness trip. It was fun. It was not as organized as I hoped it would be. I missed things. I found things too late. I kept thinking, Next time, I want this to be easier.",
      "So I started building the thing I wish I had before we went.",
      "Maybe After the Parks will help you plan a better night, a better resort day, or a better staycation. Maybe it will help you find something you did not know existed. Maybe it will save you from opening another PDF on your phone while your family is already asking what you are doing next.",
      "And who knows? Maybe this is my origin story too.",
      "Maybe this is how I finally become a Disney person. I am not fully there yet. But I think I am getting closer.",
    ],
  },
];

export const messyInputs = [
  "PDFs",
  "Resort pages",
  "Images",
  "Activity calendars",
  "Times that change",
  "Weather questions",
  "Transportation confusion",
] as const;

export const organizedOutputs = [
  "Today",
  "Tonight",
  "Free activities",
  "Movies",
  "Campfires",
  "Resort filters",
  "My Plan",
] as const;

export const messyToMagicContent = {
  heading: "The problem was not a lack of magic. It was finding it.",
  body:
    "After the Parks is the planning layer I wanted: a way to turn scattered resort details into a clear picture of what is happening now, tonight, and during the kind of day your family can actually have.",
} as const;

export const founderContent = {
  heading: "Built by Josh",
  descriptor: "Husband. Dad. Over-planner. Data person. Possible Disney person in progress.",
  note:
    "I built this because our family needed a better way to find the magic outside the parks. I hope it helps yours too.",
} as const;

export const footerCta = {
  heading: "Planning a resort day? Start with what's happening now.",
  disclaimer:
    "Use it as your planning shortcut, then confirm final details with the official resort source.",
  actions: [
    { label: "See today's activities", href: "/today", variant: "primary" },
    { label: "Find tonight's movies and campfires", href: "/tonight", variant: "secondary" },
    { label: "Build my plan", href: "/plan", variant: "secondary" },
  ],
} as const;
