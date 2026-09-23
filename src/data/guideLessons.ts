// Guide structure: six topics, fifteen lessons. Each lesson is its own route
// (/guide/<id>); the landing page (/guide) lists the topics as an accordion and
// every lesson page shares the same sidebar + progress bar. Lesson bodies live
// in src/components/guide/lessons, keyed by the ids below.

export interface GuideLesson {
  id: string;
  title: string;
  /** One-line summary shown on the landing page. */
  blurb: string;
  advanced?: boolean;
}

export interface GuideTopic {
  id: string;
  title: string;
  blurb: string;
  lessons: GuideLesson[];
}

export const GUIDE_TOPICS: GuideTopic[] = [
  {
    id: "start", title: "Welcome", blurb: "What this site does, and how to use this guide",
    lessons: [{ id: "start-here", title: "Start Here", blurb: "What this site does, and how to use this guide" }],
  },
  {
    id: "basics", title: "The Basics", blurb: "Stats, typing, abilities and items",
    lessons: [
      { id: "stats", title: "Stats", blurb: "The six stats, and what raises or lowers them" },
      { id: "typing", title: "Typing", blurb: "Why some hits do 4× damage and others do none" },
      { id: "abilities-items", title: "Abilities & Items", blurb: "Passive powers and held items" },
    ],
  },
  {
    id: "moves", title: "Moves & Turns", blurb: "Damage, turn order, and status effects",
    lessons: [
      { id: "damage", title: "Moves & Damage", blurb: "Physical, special, and status moves" },
      { id: "turn-order", title: "Turn Order", blurb: "Priority, Speed, Trick Room and Tailwind" },
      { id: "status", title: "Status", blurb: "Burn, paralysis, poison, sleep and more" },
    ],
  },
  {
    id: "battlefield", title: "The Battlefield", blurb: "Switching, hazards, weather and protection",
    lessons: [
      { id: "switching", title: "Switching", blurb: "Pivoting, momentum and trapping" },
      { id: "field-hazards", title: "Field Effects & Hazards", blurb: "Weather, terrain, and entry hazards" },
      { id: "protection-targeting", title: "Protection & Targeting", blurb: "Protect variants and doubles targeting", advanced: true },
    ],
  },
  {
    id: "strategy", title: "Battle Strategy", blurb: "Making good decisions with limited information",
    lessons: [
      { id: "positioning-prediction", title: "Positioning & Prediction", blurb: "Momentum, reads, and risk vs reward" },
      { id: "win-conditions", title: "Win Conditions", blurb: "Planning your endgame before it starts" },
    ],
  },
  {
    id: "team", title: "Team Building", blurb: "Roles, synergy, and a build process",
    lessons: [
      { id: "roles-synergy", title: "Roles & Synergy", blurb: "What each Pokémon does, and how they fit together" },
      { id: "cores-archetypes", title: "Cores & Archetypes", blurb: "Building blocks, and overall team plans" },
      { id: "building-a-team", title: "Building a Team", blurb: "A step-by-step checklist" },
    ],
  },
];

export interface FlatGuideLesson extends GuideLesson {
  topicId: string;
  topicTitle: string;
  index: number;
}

export const GUIDE_LESSONS: FlatGuideLesson[] = GUIDE_TOPICS.flatMap((t) =>
  t.lessons.map((l) => ({ ...l, topicId: t.id, topicTitle: t.title })),
).map((l, index) => ({ ...l, index }));

export const TOTAL_GUIDE_LESSONS = GUIDE_LESSONS.length;

export function getGuideLesson(id: string): FlatGuideLesson | undefined {
  return GUIDE_LESSONS.find((l) => l.id === id);
}

export function guideLessonHref(id: string): string {
  return `/guide/${id}`;
}

// Lesson ids from the previous single-page Guide (?lesson=<id>), so old links
// and bookmarks still land on the matching lesson page.
const LEGACY_IDS: Record<string, string> = {
  "getting-started": "start-here",
  "using-the-site": "start-here",
  "moves-damage": "damage",
  "info-win-conditions": "win-conditions",
  "cores-modes-archetypes": "cores-archetypes",
};

/** Resolve a current or legacy lesson id to a current one (null if unknown). */
export function resolveGuideLessonId(id: string): string | null {
  const mapped = LEGACY_IDS[id] ?? id;
  return getGuideLesson(mapped) ? mapped : null;
}
