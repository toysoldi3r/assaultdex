// Adapter that flattens the Database tab's three reference lists (items,
// abilities, moves) into the single "index" shape the one-index Database design
// consumes: a uniform DexEntry with a legality flag, a champions-popularity
// rank, the terse engine chips the calculator actually applies, and the roster
// Pokémon that carry each entry. Server-only - it reads @pkmn/dex-derived lists,
// the champions roster (as reference Pokémon rows) and the usage snapshot; no
// network, no per-request rebuild beyond the page's own memoised inputs.

import type { DbItem, DbAbility, DbMove } from "@/data/dexDatabase";
import { getDbItem } from "@/data/dexDatabase";
import type { Pokemon } from "@/domain/types/pokemon";
import { topMeta, usageKey } from "@/data/usageStats";

/** A plain engine chip, or a caution chip (amber, data-flagged caveat). */
export type EngineChip = string | { text: string; warn: true };

/** One reference Pokémon that carries an entry, with its Pokédex sprite slug. */
export interface Carrier {
  name: string;
  slug: string;
}

export type DexKind = "item" | "ability" | "move";

/** The uniform record every kind is projected onto for the index + detail card. */
export interface DexEntry {
  id: string;
  kind: DexKind;
  name: string;
  /** Legal in the Champions format (drives the scope filter + Legal stat). */
  legal: boolean;
  /** Champions-popularity rank as "#4", or "—" when it has no ranking. */
  usage: string;
  /** Numeric rank for sorting; 999 when unranked (sorts last). */
  rank: number;
  effect: string;
  interaction: string | null;
  /** What the battle engine applies, as chips; empty = flavour only. */
  engine: EngineChip[];
  /** The entry has a modelled (provisional) formula. */
  provisional: boolean;
  /** Up to four carriers, best-used first; `more` counts the remainder. */
  carried: Carrier[];
  more: number;

  // item
  category?: string;
  fling?: number | null;

  // ability
  group?: string;
  rating?: number;

  // move
  type?: string;
  mcat?: string;
  power?: number | null;
  acc?: string;
  pp?: number | null;
  pri?: number;
}

/** Split a modelled-calc sentence into terse engine chips. */
function chipsFromCalc(calc: string | null): string[] {
  if (!calc) return [];
  return calc
    .split(/;\s*/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter(Boolean);
}

/**
 * Coarse "Effect" grouping for the ability facet (On entry | Damage | Priority |
 * Immunity | Field). Heuristic - reads the modelled calc, the interaction note
 * and the short description, same spirit as classifyItem in dexDatabase.
 */
const PRIORITY_ABILITIES = new Set([
  "Prankster", "Gale Wings", "Triage", "Armor Tail", "Dazzling", "Queenly Majesty", "Stall",
]);
const ENTRY_ABILITIES = new Set([
  "Intimidate", "Download", "Intrepid Sword", "Dauntless Shield", "Screen Cleaner", "Supersweet Syrup",
]);
function abilityGroup(a: DbAbility): string | undefined {
  const text = `${a.calc ?? ""} ${a.interaction ?? ""} ${a.desc}`;
  if (PRIORITY_ABILITIES.has(a.name) || /priority/i.test(text)) return "Priority";
  if (ENTRY_ABILITIES.has(a.name) || /on switch-?in|on entry|when it enters/i.test(text)) return "On entry";
  if (/sun|rain|sand(storm)?|snow|hail|terrain|weather|booster energy|protosynthesis|quark drive/i.test(text))
    return "Field";
  if (/immune|immunity|cannot be|blocks .*(status|move)|prevents |suppress/i.test(text)) return "Immunity";
  if (/×[\d.]/.test(a.calc ?? "")) return "Damage";
  return undefined;
}

const rankToUsage = (rank: number): string => (rank >= 999 ? "—" : `#${rank}`);

interface DerivedHolders {
  /** name(lowercased id) -> carriers sorted best-used first */
  holders: Map<string, Carrier[]>;
  /** name(lowercased id) -> summed champions usage weight */
  weight: Map<string, number>;
}

/** Index the roster by a per-Pokémon key list (abilities or movepool). */
function deriveHolders(
  pokemon: Pokemon[],
  usageOf: (name: string) => number,
  keysOf: (p: Pokemon) => string[],
): DerivedHolders {
  const acc = new Map<string, { carriers: Carrier[]; weight: number }>();
  for (const p of pokemon) {
    const u = usageOf(p.name);
    for (const key of new Set(keysOf(p))) {
      const k = key.toLowerCase();
      const bucket = acc.get(k) ?? { carriers: [], weight: 0 };
      bucket.carriers.push({ name: p.name, slug: p.slug });
      bucket.weight += u;
      acc.set(k, bucket);
    }
  }
  const holders = new Map<string, Carrier[]>();
  const weight = new Map<string, number>();
  for (const [k, v] of acc) {
    v.carriers.sort((a, b) => usageOf(b.name) - usageOf(a.name) || a.name.localeCompare(b.name));
    holders.set(k, v.carriers);
    weight.set(k, v.weight);
  }
  return { holders, weight };
}

/** Assign 1-based ranks to legal names by descending weight, ties by name. */
function rankByWeight(names: string[], weight: Map<string, number>): Map<string, number> {
  const ranked = [...names].sort(
    (a, b) => (weight.get(b.toLowerCase()) ?? 0) - (weight.get(a.toLowerCase()) ?? 0) || a.localeCompare(b),
  );
  const out = new Map<string, number>();
  ranked.forEach((n, i) => out.set(n, i + 1));
  return out;
}

function toCarried(carriers: Carrier[] | undefined): { carried: Carrier[]; more: number } {
  const all = carriers ?? [];
  return { carried: all.slice(0, 4), more: Math.max(0, all.length - 4) };
}

/**
 * Build the flat index for the Database tab. `pokemon` is the champions roster
 * (reference rows carrying abilities + movepool), used to derive which Pokémon
 * carry each ability/move and a champions-popularity ranking from the usage
 * snapshot. Items have no per-holder data in the dataset, so they carry no
 * popularity rank or carrier list (shown as "—" / omitted) rather than a
 * fabricated one.
 */
export function buildDexEntries({
  items,
  abilities,
  moves,
  pokemon,
}: {
  items: DbItem[];
  abilities: DbAbility[];
  moves: DbMove[];
  pokemon: Pokemon[];
}): DexEntry[] {
  const usageByKey = new Map<string, number>();
  for (const m of topMeta(10000)) usageByKey.set(usageKey(m.name), m.usage);
  const usageOf = (name: string) => usageByKey.get(usageKey(name)) ?? 0;

  const abilityHolders = deriveHolders(pokemon, usageOf, (p) => p.abilities);
  const moveHolders = deriveHolders(pokemon, usageOf, (p) =>
    p.movepool.length ? p.movepool : p.moves.map((mv) => mv.name),
  );

  const legalAbilityNames = abilities.filter((a) => abilityHolders.holders.has(a.name.toLowerCase())).map((a) => a.name);
  const legalMoveNames = moves.filter((m) => moveHolders.holders.has(m.name.toLowerCase())).map((m) => m.name);
  const abilityRank = rankByWeight(legalAbilityNames, abilityHolders.weight);
  const moveRank = rankByWeight(legalMoveNames, moveHolders.weight);

  const itemEntries: DexEntry[] = items.map((i) => {
    const engine = chipsFromCalc(i.calc);
    return {
      id: `it-${usageKey(i.name)}`,
      kind: "item",
      name: i.name,
      legal: i.competitive,
      usage: "—",
      rank: 999,
      effect: i.desc,
      interaction: getInteraction(i),
      engine,
      provisional: engine.length > 0,
      carried: [],
      more: 0,
      category: i.category,
      fling: i.fling,
    };
  });

  const abilityEntries: DexEntry[] = abilities.map((a) => {
    const holders = abilityHolders.holders.get(a.name.toLowerCase());
    const rank = abilityRank.get(a.name) ?? 999;
    const engine = chipsFromCalc(a.calc);
    return {
      id: `ab-${usageKey(a.name)}`,
      kind: "ability",
      name: a.name,
      legal: !!holders,
      usage: rankToUsage(rank),
      rank,
      effect: a.desc,
      interaction: a.interaction,
      engine,
      provisional: engine.length > 0,
      ...toCarried(holders),
      group: abilityGroup(a),
      rating: a.rating,
    };
  });

  const moveEntries: DexEntry[] = moves.map((m) => {
    const holders = moveHolders.holders.get(m.name.toLowerCase());
    const rank = moveRank.get(m.name) ?? 999;
    const engine: EngineChip[] = [];
    if (m.priority > 0) engine.push(`priority +${m.priority}`);
    else if (m.priority < 0) engine.push(`priority ${m.priority}`);
    return {
      id: `mv-${usageKey(m.name)}`,
      kind: "move",
      name: m.name,
      legal: !!holders,
      usage: rankToUsage(rank),
      rank,
      effect: m.desc,
      interaction: null,
      engine,
      provisional: false,
      ...toCarried(holders),
      type: m.type.toLowerCase(),
      mcat: m.category.toLowerCase(),
      power: m.power,
      acc: m.accuracy == null ? "—" : `${m.accuracy}%`,
      pp: m.pp,
      pri: m.priority,
    };
  });

  return [...itemEntries, ...abilityEntries, ...moveEntries];
}

// listDbItems drops the interaction note that getDbItem carries; the annotated
// interaction map lives in dexDatabase, so re-derive it here from the known set.
function getInteraction(i: DbItem): string | null {
  return getDbItem(i.name)?.interaction ?? null;
}
