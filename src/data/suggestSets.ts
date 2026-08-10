// Heuristic competitive set suggestions for a species. There is no offline
// per-Pokémon usage/spread dataset for Champions, so these are archetype-based
// suggestions (offensive / bulky / support / mega) derived from base stats and
// the legal movepool - not scraped "most common" sets. Labelled as such.

import type { BaseStats, MoveCategory, PokemonType, StatKey } from "@/domain/types/pokemon";

/** Minimal move shape the suggester needs (matches DexMoveRow). */
interface MoveLike {
  name: string;
  type: PokemonType | null;
  category: MoveCategory;
  power: number | null;
}

/** A species' Mega/Primal forme, so a Mega set can hold the stone + forme ability. */
export interface MegaInfo {
  stone: string;
  ability: string;
  label: string;
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

// Doubles-relevant utility, in rough priority order (protection and Fake Out /
// redirection first, then speed control, then status and setup).
const UTILITY = [
  "Fake Out", "Follow Me", "Rage Powder", "Helping Hand", "Wide Guard", "Quick Guard",
  "Tailwind", "Trick Room", "Icy Wind", "Thunder Wave", "Will-O-Wisp", "Spore",
  "Sleep Powder", "Taunt", "Reflect", "Light Screen", "Swords Dance", "Nasty Plot",
  "Dragon Dance", "Calm Mind", "Recover", "Roost", "Substitute",
];
const PROTECT = ["Protect", "Detect"];

export function suggestSets(
  types: PokemonType[],
  baseStats: BaseStats,
  abilities: string[],
  moves: MoveLike[],
  mega?: MegaInfo,
): SuggestedSet[] {
  const ability = abilities[0] ?? "";
  const names = new Set(moves.map((m) => m.name));
  const has = (n: string) => names.has(n);
  const firstOf = (list: string[]) => list.find(has);

  const physical = (baseStats.atk ?? 0) >= (baseStats.spa ?? 0);
  const atkStat: StatKey = physical ? "atk" : "spa";
  const damaging = moves.filter((m) => m.category !== "status" && (m.power ?? 0) > 0);
  const inCat = damaging
    .filter((m) => (m.category === "physical") === physical)
    .sort((a, b) => (b.power ?? 0) - (a.power ?? 0));

  const stab = inCat.filter((m) => m.type != null && types.includes(m.type)).map((m) => m.name);
  // Coverage: strongest move per distinct off-STAB type (avoid two same-type slots).
  const coverage: string[] = [];
  const seenTypes = new Set<string>();
  for (const m of inCat) {
    if (m.type != null && types.includes(m.type)) continue;
    const key = m.type ?? m.name;
    if (seenTypes.has(key)) continue;
    seenTypes.add(key);
    coverage.push(m.name);
  }

  const protect = firstOf(PROTECT);
  const util = UTILITY.filter(has);

  /** Assemble a 4-move set from prioritized lists, deduped, padded from damage. */
  const build = (...lists: (string | undefined)[][]): string[] => {
    const out: string[] = [];
    for (const list of lists) {
      for (const mv of list) {
        if (out.length >= 4) break;
        if (mv && !out.includes(mv)) out.push(mv);
      }
    }
    for (const m of inCat) {
      if (out.length >= 4) break;
      if (!out.includes(m.name)) out.push(m.name);
    }
    return out.slice(0, 4);
  };

  const ivs: Partial<Record<StatKey, number>> = physical ? {} : { atk: 0 };
  const bulkDef: StatKey = (baseStats.def ?? 0) >= (baseStats.spd ?? 0) ? "def" : "spd";
  const sets: SuggestedSet[] = [];

  // 1) Offensive: two STAB + best coverage, capped with Protect (doubles staple).
  sets.push({
    label: "Offensive",
    item: protect ? "Life Orb" : physical ? "Choice Band" : "Choice Specs",
    ability,
    nature: physical ? "Adamant" : "Modest",
    evs: { [atkStat]: 252, spe: 252, hp: 4 },
    ivs,
    moves: build(stab.slice(0, 2), coverage.slice(0, 1), [protect], coverage.slice(1)),
  });

  // 2) Bulky attacker / balanced: STAB + recovery/utility + Protect.
  const recovery = firstOf(["Recover", "Roost", "Slack Off", "Synthesis", "Morning Sun"]);
  sets.push({
    label: (baseStats.hp ?? 0) >= 90 ? "Bulky attacker" : "Balanced",
    item: "Leftovers",
    ability,
    nature: bulkDef === "def" ? (physical ? "Impish" : "Bold") : physical ? "Careful" : "Calm",
    evs: { hp: 252, [bulkDef]: 252, [atkStat]: 4 },
    ivs,
    moves: build(stab.slice(0, 1), [protect, recovery], util, coverage),
  });

  // 3) Support: protection + Fake Out / redirection / speed control + a STAB.
  if (util.length >= 1 && protect) {
    sets.push({
      label: "Support",
      item: has("Fake Out") ? "Safety Goggles" : "Focus Sash",
      ability,
      nature: (baseStats.spe ?? 0) >= 80 ? "Timid" : "Relaxed",
      evs: { hp: 252, spe: 132, [bulkDef]: 124 },
      ivs,
      moves: build([protect], util, stab.slice(0, 1)),
    });
  }

  // 4) Mega: same offensive shell, holding the Mega Stone with the forme ability.
  if (mega) {
    sets.push({
      label: `Mega (${mega.label})`,
      item: mega.stone,
      ability: mega.ability || ability,
      nature: physical ? "Adamant" : "Modest",
      evs: { [atkStat]: 252, spe: 252, hp: 4 },
      ivs,
      moves: build(stab.slice(0, 2), coverage.slice(0, 1), [protect], coverage.slice(1)),
    });
  }

  return sets;
}
