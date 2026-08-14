// Knowledgebase: short reference explainers for the competitive building blocks
// (base stats, EVs, IVs, nature, …). Pure data so the /guide/knowledgebase
// pages render generically and the Guide can deep-link each term.

export interface KbSection {
  heading?: string;
  /** Paragraphs of plain text. */
  body: string[];
}

export interface KbEntry {
  slug: string;
  title: string;
  /** One-line summary shown in the index and as the page lede. */
  summary: string;
  sections: KbSection[];
  /** Slugs of related entries to cross-link. */
  related?: string[];
}

export const KB_ENTRIES: KbEntry[] = [
  {
    slug: "base-stats",
    title: "Base stats",
    summary:
      "The six innate stats every Pokémon has, and what each one does.",
    sections: [
      {
        body: [
          "Every Pokémon has six base stats set by its species: HP, Attack, Defense, Special Attack, Special Defense, and Speed. Base stats are just the starting point - the number you actually battle with is calculated from the base stat plus the Pokémon's level, IVs, EVs, and nature.",
        ],
      },
      {
        heading: "The six stats",
        body: [
          "HP (Hit Points): the total damage a Pokémon can take before fainting. Effective bulk is HP multiplied by a defensive stat, so investing in HP helps against both physical and special hits.",
          "Attack (Atk): the power behind physical moves (like Close Combat or Earthquake).",
          "Defense (Def): reduces the damage taken from physical moves.",
          "Special Attack (SpA): the power behind special moves (like Ice Beam or Thunderbolt).",
          "Special Defense (SpD): reduces the damage taken from special moves.",
          "Speed (Spe): decides who acts first each turn. The faster Pokémon moves first, unless a priority move or Trick Room changes the order.",
        ],
      },
      {
        heading: "Physical vs special",
        body: [
          "Every damaging move is either physical or special. Physical moves use the attacker's Attack against the target's Defense; special moves use Special Attack against Special Defense. This split is why a wall can be bulky on one side and frail on the other, and why attackers usually invest in only one offensive stat.",
        ],
      },
    ],
    related: ["evs", "ivs", "nature"],
  },
  {
    slug: "evs",
    title: "EVs (Effort Values)",
    summary:
      "The 508 tuning points you spread across stats to shape a Pokémon's role.",
    sections: [
      {
        body: [
          "Effort Values are points you assign to a Pokémon's stats to customize it. You get 508 EVs total, with a maximum of 252 in any single stat. At level 50, every 4 EVs in a stat add 1 point to that stat (up to +63 from a maxed 252).",
        ],
      },
      {
        heading: "Why they matter",
        body: [
          "EVs are the main reason two copies of the same Pokémon can play completely differently: one might max Speed and Special Attack to hit first and hard, while another dumps everything into HP and defenses to survive. Because damage in this format is a range, EVs are often tuned to precise benchmarks - just enough Special Defense to survive a specific attack, or just enough Speed to outrun a key threat.",
        ],
      },
      {
        heading: "A common spread",
        body: [
          "252 in an offensive stat, 252 in Speed, and 4 left over is a classic fast attacker. Bulkier Pokémon spread EVs between HP and one or both defenses instead.",
        ],
      },
    ],
    related: ["base-stats", "ivs", "nature"],
  },
  {
    slug: "ivs",
    title: "IVs (Individual Values)",
    summary: "Fixed 0-31 per-stat values; usually maxed, with a few exceptions.",
    sections: [
      {
        body: [
          "Individual Values are fixed per-Pokémon bonuses ranging from 0 to 31 in each stat. Unlike EVs you don't spend a budget - each stat has its own IV. In competitive play you normally run 31 in every stat.",
        ],
      },
      {
        heading: "When you lower an IV",
        body: [
          "A 0 Attack IV is common on special attackers: it minimizes the damage they take from Foul Play and from their own attack when confused, since neither cares about the Pokémon's low physical role otherwise.",
          "A 0 Speed IV is used on Trick Room Pokémon that want to be as slow as possible, so they move first while Trick Room is up.",
        ],
      },
    ],
    related: ["base-stats", "evs", "speed-control"],
  },
  {
    slug: "nature",
    title: "Nature",
    summary: "A trait that raises one stat by 10% and lowers another by 10%.",
    sections: [
      {
        body: [
          "Each Pokémon has a nature that boosts one stat by 10% and reduces another by 10%. Natures never affect HP. A nature that raises and lowers the same stat (like Serious or Hardy) is neutral - no change at all.",
        ],
      },
      {
        heading: "Common choices",
        body: [
          "Adamant (+Attack, -Special Attack) and Modest (+Special Attack, -Attack) power up an attacker's main stat while dropping the offensive stat it doesn't use.",
          "Jolly (+Speed, -Special Attack) and Timid (+Speed, -Attack) trade offense for Speed on fast attackers.",
          "Defensive Pokémon often pick a nature that boosts the defense they need most and lowers an offensive stat they weren't using.",
        ],
      },
    ],
    related: ["base-stats", "evs"],
  },
  {
    slug: "stab",
    title: "STAB (Same-Type Attack Bonus)",
    summary: "A ×1.5 damage bonus when a move's type matches the user's type.",
    sections: [
      {
        body: [
          "When a Pokémon uses a move whose type matches one of its own types, the move deals 1.5 times as much damage. A Fire-type using a Fire move gets STAB; using a Ground move it does not.",
        ],
      },
      {
        heading: "Why it shapes movesets",
        body: [
          "STAB is why a Pokémon's same-type moves are usually its hardest hits, and why off-type coverage moves need higher base power (or a super-effective matchup) to compete. The ability Adaptability turns the bonus into ×2 instead of ×1.5.",
        ],
      },
    ],
    related: ["base-stats"],
  },
  {
    slug: "speed-control",
    title: "Speed control",
    summary: "Tools that decide who moves first - central to doubles.",
    sections: [
      {
        body: [
          "In doubles both of your Pokémon act every turn, so controlling turn order is one of the most important things a team does. Speed control is any tool that changes who moves first.",
        ],
      },
      {
        heading: "Common tools",
        body: [
          "Tailwind doubles your team's Speed for a few turns. Trick Room reverses the order so slower Pokémon move first - built around deliberately slow, bulky attackers.",
          "Speed-lowering moves like Icy Wind, Electroweb, and Bulldoze slow the opposing side, while Thunder Wave and paralysis cut a target's Speed and can make it skip a turn.",
          "Priority moves (Fake Out, Extreme Speed, Aqua Jet) ignore Speed entirely by moving in a higher bracket.",
        ],
      },
    ],
    related: ["ivs", "weather-terrain", "team-roles"],
  },
  {
    slug: "weather-terrain",
    title: "Weather & terrain",
    summary: "Field effects that boost, weaken, or enable specific strategies.",
    sections: [
      {
        heading: "Weather",
        body: [
          "Sun boosts Fire moves and weakens Water; Rain boosts Water and weakens Fire; Sand and Snow buff certain types' defenses and can chip or protect specific Pokémon. Weather is usually set by an ability on entry or by a move, and it enables abilities like Chlorophyll (Speed in sun) and Swift Swim (Speed in rain).",
        ],
      },
      {
        heading: "Terrain",
        body: [
          "Terrain only affects grounded Pokémon. Electric Terrain boosts Electric moves and blocks sleep; Grassy Terrain boosts Grass moves and heals each turn; Psychic Terrain boosts Psychic moves and blocks priority; Misty Terrain halves Dragon damage and blocks status. Terrain and weather can be active at the same time.",
        ],
      },
    ],
    related: ["speed-control", "stab"],
  },
  {
    slug: "team-roles",
    title: "Team roles",
    summary: "The jobs Pokémon fill so a team covers threats without shared holes.",
    sections: [
      {
        body: [
          "A good doubles team isn't six attackers - it's a set of roles that support each other. Most teams try to cover each role while sharing as few weaknesses as possible.",
        ],
      },
      {
        heading: "Common roles",
        body: [
          "Attackers apply offensive pressure and take knockouts. Support Pokémon enable them with redirection (Follow Me, Rage Powder), Fake Out, screens (Reflect / Light Screen), and status.",
          "Speed control (Tailwind or Trick Room) sets the tempo the rest of the team wants. Pivots and bulky Pokémon absorb hits and reset bad positions.",
          "When building, check that your team answers common threats and weather, and that no single type is super-effective against too many of your Pokémon.",
        ],
      },
    ],
    related: ["speed-control", "base-stats"],
  },
];

const bySlug = new Map(KB_ENTRIES.map((e) => [e.slug, e]));

export function getKbEntry(slug: string): KbEntry | null {
  return bySlug.get(slug) ?? null;
}

export function kbTitle(slug: string): string {
  return bySlug.get(slug)?.title ?? slug;
}
