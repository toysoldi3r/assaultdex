// Two-way link map between the Guide and the Database's Knowledgebase.
//
// - glossaryHref(word): where a Guide term links to (its Knowledgebase card).
// - guideHrefForTerm(slug): where a Knowledgebase card links back into the
//   Guide (the lesson that teaches it).
//
// Pure data so both the client Guide and the server term pages can use it.

const KB = "/database/terminology/kb/";
const TM = "/database/terminology/";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Guide word (and common variants) → Knowledgebase href. Prefer the longer KB
// building-block pages where one exists, else the short term page.
const GLOSSARY: Record<string, string> = {
  stab: `${KB}stab`,
  "same type attack bonus": `${KB}stab`,
  ev: `${KB}evs`, evs: `${KB}evs`, "effort value": `${KB}evs`, "effort values": `${KB}evs`,
  iv: `${KB}ivs`, ivs: `${KB}ivs`, "individual value": `${KB}ivs`, "individual values": `${KB}ivs`,
  nature: `${KB}nature`, natures: `${KB}nature`,
  "base stat": `${KB}base-stats`, "base stats": `${KB}base-stats`,
  "speed control": `${KB}speed-control`,
  weather: `${KB}weather-terrain`, terrain: `${KB}weather-terrain`,
  role: `${KB}team-roles`, roles: `${KB}team-roles`, "team role": `${KB}team-roles`, "team roles": `${KB}team-roles`,
  // Short term pages
  ohko: `${TM}ohko`, "1hko": `${TM}ohko`,
  "2hko": `${TM}2hko`,
  spread: `${TM}spread-move`, "spread move": `${TM}spread-move`, "spread moves": `${TM}spread-move`,
  "speed tier": `${TM}speed-tier`, "speed tiers": `${TM}speed-tier`,
  priority: `${TM}priority`,
  redirection: `${TM}redirection`, redirect: `${TM}redirection`,
  pivot: `${TM}pivot`, pivoting: `${TM}pivot`,
  bulk: `${TM}bulk`,
  sweeper: `${TM}sweeper`,
  wallbreaker: `${TM}wallbreaker`,
  setup: `${TM}setup`,
  hazard: `${TM}hazards`, hazards: `${TM}hazards`, "entry hazards": `${TM}hazards`,
  lead: `${TM}lead`,
  "team preview": `${TM}team-preview`,
  "win condition": `${TM}wincon`, wincon: `${TM}wincon`,
};

/** The Knowledgebase page for a Guide word, or null if there is none. */
export function glossaryHref(word: string): string | null {
  const k = norm(word);
  return GLOSSARY[k] ?? GLOSSARY[k.replace(/s$/, "")] ?? null;
}

// Knowledgebase slug → the Guide lesson id that teaches it.
const SLUG_LESSON: Record<string, string> = {
  // Building-block (kb) slugs
  "base-stats": "stats", evs: "stats", ivs: "stats", nature: "stats",
  stab: "typing", "speed-control": "turn-order", "weather-terrain": "field-hazards",
  "team-roles": "roles-synergy",
  // Short term slugs
  ohko: "moves-damage", "2hko": "moves-damage", bulk: "moves-damage",
  "spread-move": "protection-targeting", redirection: "protection-targeting",
  "speed-tier": "turn-order", priority: "turn-order",
  pivot: "switching", hazards: "field-hazards",
  sweeper: "roles-synergy", wallbreaker: "roles-synergy", setup: "roles-synergy",
  lead: "info-win-conditions", "team-preview": "info-win-conditions", wincon: "info-win-conditions",
};

/** Deep-link into the Guide lesson that covers a term/kb slug (else the overview). */
export function guideHrefForTerm(slug: string): string {
  const lesson = SLUG_LESSON[slug];
  return lesson ? `/guide?lesson=${lesson}` : "/guide";
}
