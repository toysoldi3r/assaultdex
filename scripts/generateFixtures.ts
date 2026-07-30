// Generate src/data/fixtures/pokemon.json for the full Pokémon Champions pool.
//
//   pnpm tsx scripts/generateFixtures.ts
//
// Pool membership comes from the authoritative roster
// (src/data/fixtures/championsRoster.json, the user-provided list). Base stats,
// types, abilities, movepools, and move data come from @pkmn/dex (Pokémon
// Showdown's dataset — accurate, offline, MIT-licensed). This is a build-time
// script; the app imports only the generated JSON.

import { writeFileSync } from "node:fs";
import { Dex } from "@pkmn/dex";
import roster from "../src/data/fixtures/championsRoster.json";

interface RosterEntry {
  ndex: string;
  name: string;
  type1: string;
  type2: string;
}

/** Map an upload display name to a Showdown species name. */
function toShowdown(name: string): string {
  if (/ Rotom$/.test(name) || name === "Rotom Rotom") {
    const app = name.replace(/ Rotom$/, "").replace(/^Rotom\s*/, "").trim();
    return app ? `Rotom-${app}` : "Rotom";
  }
  const rules: [RegExp, string][] = [
    [/^(.*) Alolan Form$/, "$1-Alola"],
    [/^(.*) Galarian Form$/, "$1-Galar"],
    [/^(.*) Hisuian Form$/, "$1-Hisui"],
    [/^Tauros Paldean Form (\w+) Breed$/, "Tauros-Paldea-$1"],
    [/^Gourgeist Jumbo Variety$/, "Gourgeist-Super"],
    [/^Gourgeist Large Variety$/, "Gourgeist-Large"],
    [/^Gourgeist Medium Variety$/, "Gourgeist"],
    [/^Gourgeist Small Variety$/, "Gourgeist-Small"],
    [/^Lycanroc Dusk Form$/, "Lycanroc-Dusk"],
    [/^Lycanroc Midday Form$/, "Lycanroc"],
    [/^Lycanroc Midnight Form$/, "Lycanroc-Midnight"],
    [/^Floette Eternal Flower$/, "Floette-Eternal"],
    [/^(.*) Female$/, "$1-F"],
    [/^(.*) Male$/, "$1"],
  ];
  for (const [re, rep] of rules) if (re.test(name)) return name.replace(re, rep);
  return name;
}

const TARGET_MAP: Record<string, string> = {
  normal: "normal",
  any: "normal",
  randomNormal: "normal",
  scripted: "normal",
  adjacentFoe: "normal",
  allAdjacentFoes: "all-adjacent-foes",
  allAdjacent: "all-adjacent",
  self: "self",
  adjacentAlly: "ally",
  adjacentAllyOrSelf: "self",
  allySide: "self",
  allyTeam: "self",
  foeSide: "self",
  all: "self",
};

const UTILITY_ORDER = [
  "Protect",
  "Fake Out",
  "Tailwind",
  "Trick Room",
  "Swords Dance",
  "Nasty Plot",
  "Dragon Dance",
  "Calm Mind",
  "Bulk Up",
  "Recover",
  "Roost",
  "Spore",
  "Sleep Powder",
  "Will-O-Wisp",
  "Thunder Wave",
  "Rage Powder",
  "Follow Me",
  "Helping Hand",
  "Reflect",
  "Light Screen",
  "Substitute",
  "Taunt",
  "Encore",
];

interface OutMove {
  name: string;
  type: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  priority: number;
  target: string;
  overrideOffensiveStat?: string;
  overrideDefensiveStat?: string;
  useTargetOffense?: boolean;
  hits?: number;
}

function toOutMove(m: ReturnType<typeof Dex.moves.get>): OutMove {
  const mm = m as unknown as {
    overrideOffensiveStat?: string;
    overrideDefensiveStat?: string;
    overrideOffensivePokemon?: string;
    multihit?: number | [number, number];
  };
  const isStatus = m.category === "Status" || !m.basePower;
  const out: OutMove = {
    name: m.name,
    type: m.type.toLowerCase(),
    category: m.category.toLowerCase(),
    power: isStatus ? null : m.basePower,
    accuracy: m.accuracy === true ? null : m.accuracy,
    priority: m.priority,
    target: TARGET_MAP[m.target] ?? "normal",
  };
  if (mm.overrideOffensiveStat && mm.overrideOffensiveStat !== "atk" && mm.overrideOffensiveStat !== "spa") {
    out.overrideOffensiveStat = mm.overrideOffensiveStat;
  }
  if (mm.overrideDefensiveStat === "def" || mm.overrideDefensiveStat === "spd") {
    out.overrideDefensiveStat = mm.overrideDefensiveStat;
  }
  if (mm.overrideOffensivePokemon === "target") out.useTargetOffense = true;
  if (mm.multihit) {
    const h = Array.isArray(mm.multihit)
      ? Math.round((mm.multihit[0] + mm.multihit[1]) / 2)
      : mm.multihit;
    if (h > 1) out.hits = h;
  }
  return out;
}

async function main() {
  const entries = (roster.roster as RosterEntry[]);
  const unresolved: string[] = [];
  const typeConflicts: string[] = [];
  const out: unknown[] = [];

  for (const entry of entries) {
    const sdName = toShowdown(entry.name);
    const species = Dex.species.get(sdName);
    if (!species.exists) {
      unresolved.push(`${entry.name} → ${sdName}`);
      continue;
    }

    const types = species.types.map((t) => t.toLowerCase());
    // Cross-check against the authoritative list types (mono = type1===type2).
    const listTypes = entry.type2 && entry.type2 !== entry.type1
      ? [entry.type1.toLowerCase(), entry.type2.toLowerCase()].sort()
      : [entry.type1.toLowerCase()];
    if ([...types].sort().join("/") !== listTypes.join("/")) {
      typeConflicts.push(`${entry.name}: list ${listTypes.join("/")} vs dex ${types.join("/")}`);
    }

    const abilities = Object.values(species.abilities).filter(Boolean) as string[];

    // Forms store their learnset under the base species.
    let learnset = await Dex.learnsets.get(species.id);
    if (!learnset?.learnset && species.baseSpecies && species.baseSpecies !== species.name) {
      const baseId = species.baseSpecies.toLowerCase().replace(/[^a-z0-9]/g, "");
      learnset = await Dex.learnsets.get(baseId);
    }
    const learnMoves = Object.keys(learnset?.learnset ?? {})
      .map((id) => Dex.moves.get(id))
      .filter((m) => m.exists);
    const movepool = [...new Set(learnMoves.map((m) => m.name))].sort();

    // Effective power accounts for multi-hit moves (Dragon Darts 50×2, etc.).
    const effPower = (m: (typeof learnMoves)[number]): number => {
      const mh = (m as unknown as { multihit?: number | [number, number] }).multihit;
      const hits = Array.isArray(mh) ? Math.round((mh[0] + mh[1]) / 2) : mh || 1;
      return m.basePower * (hits > 1 ? hits : 1);
    };

    // Curated playable subset: STAB/high-power damaging + key utility, ≤10.
    const damaging = learnMoves
      .filter((m) => m.category !== "Status" && m.basePower > 0)
      .sort((a, b) => {
        const as = species.types.includes(a.type) ? 1 : 0;
        const bs = species.types.includes(b.type) ? 1 : 0;
        return bs - as || effPower(b) - effPower(a);
      });

    const byName = new Map(learnMoves.map((m) => [String(m.name), m]));
    const picked: (typeof learnMoves)[number][] = [];
    const seen = new Set<string>();
    const add = (m: (typeof learnMoves)[number]) => {
      if (!seen.has(m.name)) {
        picked.push(m);
        seen.add(m.name);
      }
    };
    for (const m of damaging) {
      if (picked.length >= 6) break;
      add(m);
    }
    for (const name of UTILITY_ORDER) {
      if (picked.length >= 10) break;
      const m = byName.get(name);
      if (m) add(m);
    }
    if (picked.length === 0 && learnMoves[0]) add(learnMoves[0]);

    out.push({
      external_id: species.id,
      name: species.name,
      types,
      base_stats: {
        hp: species.baseStats.hp,
        attack: species.baseStats.atk,
        defense: species.baseStats.def,
        special_attack: species.baseStats.spa,
        special_defense: species.baseStats.spd,
        speed: species.baseStats.spe,
      },
      abilities,
      movepool,
      moves: picked.map(toOutMove),
    });
  }

  if (unresolved.length > 0) {
    console.error(`Unresolved species (${unresolved.length}):\n  ${unresolved.join("\n  ")}`);
    process.exitCode = 1;
    return;
  }

  const dataset = {
    data_version: "champions-2026.1",
    note: "Full Pokémon Champions pool. Membership from the authoritative roster (championsRoster.json). Base stats, types, abilities, movepools, and move data generated from @pkmn/dex (Pokémon Showdown dataset). Move mechanics remain provisional for Champions; the `moves` list is a curated playable subset of the full `movepool`.",
    pokemon: out,
  };
  writeFileSync("src/data/fixtures/pokemon.json", JSON.stringify(dataset, null, 2) + "\n");
  console.log(`Generated ${out.length} Pokémon.`);
  if (typeConflicts.length > 0) {
    console.log(`Type conflicts vs list (${typeConflicts.length}):\n  ${typeConflicts.join("\n  ")}`);
  } else {
    console.log("No type conflicts vs the authoritative list.");
  }
}

main();
