// Heuristic competitive set suggestions for a species. There is no offline
// per-Pokémon usage/spread dataset for Champions, so these are archetype-based
// suggestions (offensive / bulky / support) derived from base stats and the
// legal movepool - not scraped "most common" sets. Labelled as such in the UI.

import type { BaseStats, MoveCategory, PokemonType, StatKey } from "@/domain/types/pokemon";

/** Minimal move shape the suggester needs (matches DexMoveRow). */
interface MoveLike {
  name: string;
  type: PokemonType | null;
  category: MoveCategory;
  power: number | null;
}

export interface SuggestedSet {
  label: string;
  item: string;
  ability: string;
  nature: string;
  evs: Partial<Record<StatKey, number>>;
  ivs: Partial<Record<StatKey, number>>;
  moves: string[];
}

const UTILITY = [
  "Protect", "Detect", "Fake Out", "Follow Me", "Rage Powder", "Helping Hand",
  "Wide Guard", "Quick Guard", "Tailwind", "Trick Room", "Thunder Wave",
  "Icy Wind", "Will-O-Wisp", "Spore", "Sleep Powder", "Taunt", "Reflect",
  "Light Screen", "Swords Dance", "Nasty Plot", "Recover", "Roost", "Substitute",
];

export function suggestSets(
  types: PokemonType[],
  baseStats: BaseStats,
  abilities: string[],
  moves: MoveLike[],
): SuggestedSet[] {
  const ability = abilities[0] ?? "";
  const has = (n: string) => moves.some((m) => m.name === n);
  const learn = (list: string[]) => list.filter(has);

  const physical = (baseStats.atk ?? 0) >= (baseStats.spa ?? 0);
  const atkStat: StatKey = physical ? "atk" : "spa";
  const damaging = moves.filter((m) => m.category !== "status" && (m.power ?? 0) > 0);
  const wantPhysical = physical;
  const inCat = damaging
    .filter((m) => (m.category === "physical") === wantPhysical)
    .sort((a, b) => (b.power ?? 0) - (a.power ?? 0));
  const stab = inCat.filter((m) => m.type != null && types.includes(m.type));
  const coverage = inCat.filter((m) => !(m.type != null && types.includes(m.type)));

  const topStab = stab.slice(0, 2).map((m) => m.name);
  const topCover = coverage.slice(0, 2).map((m) => m.name);
  const util = learn(UTILITY);

  const fill = (base: string[], extra: string[]): string[] => {
    const out = [...base];
    for (const e of extra) {
      if (out.length >= 4) break;
      if (!out.includes(e)) out.push(e);
    }
    // Pad from any remaining damaging moves if still short.
    for (const m of inCat) {
      if (out.length >= 4) break;
      if (!out.includes(m.name)) out.push(m.name);
    }
    return out.slice(0, 4);
  };

  const ivs: Partial<Record<StatKey, number>> = physical ? {} : { atk: 0 };
  const sets: SuggestedSet[] = [];

  // 1) Offensive
  sets.push({
    label: "Offensive",
    item: has("Protect") ? "Life Orb" : physical ? "Choice Band" : "Choice Specs",
    ability,
    nature: physical ? "Adamant" : "Modest",
    evs: { [atkStat]: 252, spe: 252, hp: 4 },
    ivs,
    moves: fill([...topStab], [...topCover, "Protect"]),
  });

  // 2) Bulky attacker
  const bulkDef: StatKey = (baseStats.def ?? 0) >= (baseStats.spd ?? 0) ? "def" : "spd";
  sets.push({
    label: (baseStats.hp ?? 0) >= 90 ? "Bulky attacker" : "Balanced",
    item: "Leftovers",
    ability,
    nature: bulkDef === "def" ? (physical ? "Impish" : "Bold") : physical ? "Careful" : "Calm",
    evs: { hp: 252, [bulkDef]: 252, [atkStat]: 4 },
    ivs,
    moves: fill([...topStab.slice(0, 1)], [...util, ...topCover]),
  });

  // 3) Support (only when it actually has support tools)
  if (util.length >= 2) {
    sets.push({
      label: "Support",
      item: has("Fake Out") ? "Safety Goggles" : "Focus Sash",
      ability,
      nature: "Timid",
      evs: { hp: 252, spe: 132, [bulkDef]: 124 },
      ivs,
      moves: fill([...util], [...topStab]),
    });
  }

  return sets;
}
