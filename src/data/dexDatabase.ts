// Server-only reference data for the Database tab, sourced from @pkmn/dex (full
// offline item/ability text) and annotated with the exact formulas AssaultDex's
// own damage/speed engine applies. No network, no DB - pure lookups.

import { Dex } from "@pkmn/dex";

const gen = Dex.forGen(9);

export interface DbItem {
  name: string;
  /** Showdown item spritenum (for the icon sheet). */
  spritenum: number;
  desc: string;
  /** Fling base power, if the item can be flung. */
  fling: number | null;
  /** Exact modifier AssaultDex's engine applies, if any. */
  calc: string | null;
  /** Competitively relevant / commonly seen in the Champions format. */
  competitive: boolean;
  /** Berry item (name ends in "Berry"). */
  berry: boolean;
  /** Mega Stone or primal orb. */
  mega: boolean;
}

// Common competitive held items (beyond the modeled ones) shown in the default
// "Champions" item view. Everything else is only in the full list.
const COMPETITIVE_ITEMS = new Set<string>([
  "Leftovers", "Rocky Helmet", "Sitrus Berry", "Focus Sash", "Safety Goggles",
  "Covert Cloak", "Clear Amulet", "Booster Energy", "Mental Herb", "Light Clay",
  "Eviolite", "Weakness Policy", "Throat Spray", "Wide Lens", "Zoom Lens",
  "Grassy Seed", "Electric Seed", "Psychic Seed", "Misty Seed", "Room Service",
  "Loaded Dice", "Protective Pads", "Air Balloon", "Red Card", "Eject Button",
  "Eject Pack", "Blunder Policy", "Adrenaline Orb", "Power Herb", "White Herb",
  "Lum Berry", "Chesto Berry", "Aguav Berry", "Figy Berry", "Iapapa Berry",
  "Mago Berry", "Wiki Berry", "Occa Berry", "Passho Berry", "Wacan Berry",
  "Rindo Berry", "Yache Berry", "Chople Berry", "Kebia Berry", "Shuca Berry",
  "Coba Berry", "Payapa Berry", "Tanga Berry", "Charti Berry", "Kasib Berry",
  "Haban Berry", "Colbur Berry", "Babiri Berry", "Chilan Berry", "Roseli Berry",
  "Assault Vest", "Life Orb", "Choice Band", "Choice Specs", "Choice Scarf",
  "Mystic Water", "Charcoal", "Metronome", "Muscle Band", "Wise Glasses",
  "Expert Belt", "Iron Ball", "Black Sludge", "Toxic Orb", "Flame Orb",
  "Heavy-Duty Boots", "Utility Umbrella", "Mirror Herb", "Ability Shield",
  "Punching Glove", "Custap Berry", "Leppa Berry",
]);

// Mega Stones and the primal orbs - legal held items that trigger a Mega/Primal
// forme. Flagged competitive so they show in the default "Champions" item view.
const isMegaItem = (i: { megaStone?: unknown; name: string }): boolean =>
  !!i.megaStone || i.name === "Blue Orb" || i.name === "Red Orb";

export interface DbAbility {
  name: string;
  desc: string;
  /** Competitive rating from @pkmn (−1..5), rough usefulness. */
  rating: number;
  /** Exact modifier AssaultDex's engine applies, if any. */
  calc: string | null;
  /** Deep interaction notes for tricky abilities (priority, timing, …). */
  interaction: string | null;
}

// --- Formulas AssaultDex actually models (mirrors mechanics/items.ts) --------
const ITEM_CALC: Record<string, string> = {
  "Choice Band": "×1.5 to physical damage (locks into one move).",
  "Choice Specs": "×1.5 to special damage (locks into one move).",
  "Choice Scarf": "×1.5 Speed (locks into one move).",
  "Life Orb": "×1.3 to all damage; user loses 1/10 max HP per attack.",
  "Assault Vest": "×1.5 Special Defense (=×2/3 special damage taken); no status moves.",
  "Muscle Band": "×1.1 to physical damage.",
  "Wise Glasses": "×1.1 to special damage.",
  "Expert Belt": "×1.2 to super-effective damage.",
  "Iron Ball": "×0.5 Speed; grounds the holder.",
  Charcoal: "×1.2 to Fire moves.",
  "Mystic Water": "×1.2 to Water moves.",
  "Miracle Seed": "×1.2 to Grass moves.",
  Magnet: "×1.2 to Electric moves.",
  "Never-Melt Ice": "×1.2 to Ice moves.",
  "Black Belt": "×1.2 to Fighting moves.",
  "Poison Barb": "×1.2 to Poison moves.",
  "Soft Sand": "×1.2 to Ground moves.",
  "Sharp Beak": "×1.2 to Flying moves.",
  "Twisted Spoon": "×1.2 to Psychic moves.",
  "Silver Powder": "×1.2 to Bug moves.",
  "Hard Stone": "×1.2 to Rock moves.",
  "Spell Tag": "×1.2 to Ghost moves.",
  "Dragon Fang": "×1.2 to Dragon moves.",
  "Black Glasses": "×1.2 to Dark moves.",
  "Metal Coat": "×1.2 to Steel moves.",
  "Fairy Feather": "×1.2 to Fairy moves.",
  "Silk Scarf": "×1.2 to Normal moves.",
};

// --- Formulas + deep interactions for abilities (mirrors mechanics/abilities) -
const ABILITY_CALC: Record<string, string> = {
  Adaptability: "STAB becomes ×2 instead of ×1.5.",
  Technician: "×1.5 to moves with base power ≤60.",
  "Tough Claws": "×1.3 to contact moves.",
  "Iron Fist": "×1.2 to punch moves.",
  Sharpness: "×1.5 to slicing moves.",
  "Punk Rock": "×1.3 to sound moves (and ×0.5 sound damage taken).",
  "Strong Jaw": "×1.5 to bite moves.",
  "Mega Launcher": "×1.5 to pulse/aura moves.",
  "Sheer Force": "×1.3 to moves with a secondary effect (effect is removed).",
  "Huge Power": "×2 Attack (physical damage).",
  "Pure Power": "×2 Attack (physical damage).",
  "Gorilla Tactics": "×1.5 Attack (locks into one move).",
  Guts: "×1.5 Attack while statused (ignores burn's Attack drop).",
  Transistor: "×1.5 to Electric moves.",
  "Dragon's Maw": "×1.5 to Dragon moves.",
  "Rocky Payload": "×1.5 to Rock moves.",
  Steelworker: "×1.5 to Steel moves.",
  "Steely Spirit": "×1.5 to Steel moves.",
  "Water Bubble": "×2 to Water moves; ×0.5 Fire damage taken.",
  "Sand Force": "×1.3 Rock/Ground/Steel moves in sand.",
  Overgrow: "×1.5 Grass moves at ≤1/3 HP.",
  Blaze: "×1.5 Fire moves at ≤1/3 HP.",
  Torrent: "×1.5 Water moves at ≤1/3 HP.",
  Swarm: "×1.5 Bug moves at ≤1/3 HP.",
  "Thick Fat": "×0.5 Fire and Ice damage taken.",
  Heatproof: "×0.5 Fire damage taken.",
  "Dry Skin": "×1.25 Fire damage taken; immune to Water (heals).",
  Multiscale: "×0.5 damage taken at full HP.",
  "Shadow Shield": "×0.5 damage taken at full HP.",
  "Ice Scales": "×0.5 special damage taken.",
  "Fur Coat": "×0.5 physical damage taken.",
  Fluffy: "×0.5 contact damage; ×2 Fire damage taken.",
  Filter: "×0.75 super-effective damage taken.",
  "Solid Rock": "×0.75 super-effective damage taken.",
  "Prism Armor": "×0.75 super-effective damage taken.",
  "Purifying Salt": "×0.5 Ghost damage taken; immune to status.",
  "Marvel Scale": "×1.5 Defense while statused (=×2/3 physical taken).",
  Levitate: "Immune to Ground moves; ungrounded.",
  "Flash Fire": "Immune to Fire moves.",
  "Water Absorb": "Immune to Water moves (heals).",
  "Volt Absorb": "Immune to Electric moves (heals).",
  "Sap Sipper": "Immune to Grass moves.",
  Bulletproof: "Immune to ball/bomb moves.",
  Chlorophyll: "×2 Speed in sun.",
  "Swift Swim": "×2 Speed in rain.",
  "Sand Rush": "×2 Speed in sand.",
  "Slush Rush": "×2 Speed in snow.",
  "Surge Surfer": "×2 Speed on Electric Terrain.",
  "Quick Feet": "×1.5 Speed while statused.",
};

const ABILITY_INTERACTION: Record<string, string> = {
  "Gale Wings":
    "Grants +1 priority to the holder's Flying-type moves, but only while it is at full HP. Take any chip damage (Life Orb, hazards, weather) and the priority is gone until healed back to 100%.",
  "Armor Tail":
    "Blocks opposing priority moves that target this Pokémon or its allies - the same class of moves Psychic Terrain and Dazzling/Queenly Majesty stop. A move counts as priority when its priority bracket is >0: Quick Attack/Aqua Jet/Bullet Punch/Sucker Punch/Extreme Speed/Fake Out/Grassy Glide (Grassy Terrain)/Gale Wings-boosted moves, and status moves raised by Prankster. It does NOT stop Trick Room 'speed control' or moves that merely go first from raw Speed.",
  Prankster:
    "+1 priority to the holder's status moves. Prankster-boosted status moves fail against Dark-type targets, and are stopped by Armor Tail / Dazzling / Queenly Majesty / Psychic Terrain.",
  Triage: "+3 priority to the holder's healing moves (Giga Drain, Drain Punch, Recover, …).",
  Dazzling:
    "Like Armor Tail: opposing priority moves aimed at this Pokémon or its allies fail. Same priority-bracket rule as Armor Tail.",
  "Queenly Majesty": "Same as Dazzling / Armor Tail - blocks opposing priority moves.",
  Intimidate: "On entry, lowers each opposing active Pokémon's Attack by one stage.",
  Unaware: "Ignores the target's stat-stage changes when calculating damage (not modeled in the calc yet).",
  Sturdy: "Survives any single hit from full HP with 1 HP (OHKO protection).",
  "Neutralizing Gas": "Suppresses every other Pokémon's ability while this Pokémon is on the field.",
};

function isReal(x: { exists: boolean; isNonstandard?: string | null; name: string }): boolean {
  // Keep standard + Past (megas, some legacy abilities) - only drop CAP/Future.
  return x.exists && (!x.isNonstandard || x.isNonstandard === "Past") && x.name !== "";
}

export interface DbMove {
  name: string;
  type: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  priority: number;
  desc: string;
}

// The item/ability/move lists derive from the static @pkmn/dex dataset, which
// never changes at runtime, so each list is computed once and memoized rather
// than rebuilt on every Database-page request.
let cachedMoves: DbMove[] | undefined;
export function listDbMoves(): DbMove[] {
  return (cachedMoves ??= gen.moves
    .all()
    .filter(isReal)
    .map((m) => ({
      name: m.name,
      type: m.type,
      category: m.category,
      power: m.basePower || null,
      accuracy: m.accuracy === true ? null : (m.accuracy ?? null),
      pp: m.pp ?? null,
      priority: m.priority ?? 0,
      desc: m.shortDesc || m.desc || "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name)));
}

const ITEM_INTERACTION: Record<string, string> = {
  "Iron Ball": "Halves the holder's Speed and grounds it - a Flying-type or Levitate holder becomes hit by Ground moves and affected by Spikes/terrain. Cancels the ungrounding from Levitate/Magnet Rise for as long as it's held.",
  "Air Balloon": "Grounds nothing - instead makes the holder immune to Ground moves until it is hit by any damaging move, which pops the balloon.",
  "Choice Band": "Locks the holder into the first move it selects, but boosts Attack ×1.5.",
  "Choice Specs": "Locks the holder into the first move it selects, but boosts Special Attack ×1.5.",
  "Choice Scarf": "Locks the holder into the first move it selects, but boosts Speed ×1.5.",
  "Life Orb": "×1.3 damage on all attacks, but the holder loses 1/10 of its max HP after each attacking move (no recoil on status moves).",
  "Assault Vest": "×1.5 Special Defense, but the holder cannot select status moves.",
  "Focus Sash": "If at full HP, the holder survives any single hit with 1 HP. Consumed after use.",
  "Rocky Helmet": "Attackers that make contact lose 1/6 of their max HP.",
  "Flame Orb": "Burns the holder at the end of the turn - used to trigger Guts/Flare Boost or self-inflict burn deliberately.",
  "Toxic Orb": "Badly poisons the holder - used to trigger Poison Heal/Guts or Toxic Boost.",
  "Weakness Policy": "When hit by a super-effective move, sharply raises the holder's Attack and Special Attack (+2 each). Consumed.",
  "Booster Energy": "Activates Protosynthesis/Quark Drive without sun/Electric Terrain, boosting the holder's highest stat. Consumed.",
  "Covert Cloak": "Protects the holder from the added (secondary) effects of moves - no flinch, no stat drops from the attack's secondary.",
  "Clear Amulet": "Prevents other Pokémon from lowering the holder's stats (blocks Intimidate, Icy Wind's drop, etc.).",
  "Safety Goggles": "Immune to powder/spore moves (Spore, Sleep Powder, Rage Powder) and to weather chip damage (sand/hail).",
};

/** Item by name, with description, fling, modelled calc, and interaction note. */
export function getDbItem(nameOrId: string): (DbItem & { interaction: string | null }) | null {
  const i = gen.items.get(nameOrId);
  if (!isReal(i)) return null;
  return {
    name: i.name,
    spritenum: (i as unknown as { spritenum?: number }).spritenum ?? 0,
    desc: i.desc || i.shortDesc || "",
    fling: i.fling?.basePower ?? null,
    calc: ITEM_CALC[i.name] ?? null,
    competitive: !!ITEM_CALC[i.name] || COMPETITIVE_ITEMS.has(i.name) || isMegaItem(i),
    berry: i.name.endsWith("Berry"),
    mega: isMegaItem(i),
    interaction: ITEM_INTERACTION[i.name] ?? null,
  };
}

let cachedItems: DbItem[] | undefined;
export function listDbItems(): DbItem[] {
  return (cachedItems ??= gen.items
    .all()
    .filter(isReal)
    .map((i) => ({
      name: i.name,
      spritenum: (i as unknown as { spritenum?: number }).spritenum ?? 0,
      desc: i.desc || i.shortDesc || "",
      fling: i.fling?.basePower ?? null,
      calc: ITEM_CALC[i.name] ?? null,
      competitive: !!ITEM_CALC[i.name] || COMPETITIVE_ITEMS.has(i.name) || isMegaItem(i),
      berry: i.name.endsWith("Berry"),
      mega: isMegaItem(i),
    }))
    .sort((a, b) => a.name.localeCompare(b.name)));
}

function toDbAbility(a: ReturnType<typeof gen.abilities.get>): DbAbility {
  return {
    name: a.name,
    desc: a.desc || a.shortDesc || "",
    rating: (a as unknown as { rating?: number }).rating ?? 0,
    calc: ABILITY_CALC[a.name] ?? null,
    interaction: ABILITY_INTERACTION[a.name] ?? null,
  };
}

let cachedAbilities: DbAbility[] | undefined;
export function listDbAbilities(): DbAbility[] {
  return (cachedAbilities ??= gen.abilities
    .all()
    .filter(isReal)
    .map(toDbAbility)
    .sort((a, b) => a.name.localeCompare(b.name)));
}

/** Ability by slug/name, or null. */
export function getDbAbility(nameOrId: string): DbAbility | null {
  const a = gen.abilities.get(nameOrId);
  return a.exists ? toDbAbility(a) : null;
}

/** Every species/forme (full dex, incl. Mega/Primal) that can have the ability. */
const abilityPokemonCache = new Map<string, { name: string; slug: string }[]>();
export function pokemonWithAbility(nameOrId: string): { name: string; slug: string }[] {
  const target = gen.abilities.get(nameOrId).name;
  if (!target) return [];
  // Full-dex scan per ability page; cache the result by ability name.
  const cached = abilityPokemonCache.get(target);
  if (cached) return cached;
  const out: { name: string; slug: string }[] = [];
  for (const s of gen.species.all()) {
    // Include Past (megas, e.g. Parental Bond on Kangaskhan-Mega); drop CAP/Future.
    if (!s.exists || (s.isNonstandard && s.isNonstandard !== "Past")) continue;
    const abilities = Object.values(s.abilities) as string[];
    if (abilities.includes(target)) {
      // Link deep-linkable formes to their base page so the sprite/route resolves.
      const slug = s.baseSpecies && s.baseSpecies !== s.name ? gen.species.get(s.baseSpecies).id : s.id;
      out.push({ name: s.name, slug });
    }
  }
  // Deduplicate by display name.
  const seen = new Set<string>();
  const result = out
    .filter((m) => (seen.has(m.name) ? false : (seen.add(m.name), true)))
    .sort((a, b) => a.name.localeCompare(b.name));
  abilityPokemonCache.set(target, result);
  return result;
}

/** Move names classified for an ability's interaction list (Bulletproof, …). */
export function abilityAffectedMoves(abilityName: string): string[] {
  const flagByAbility: Record<string, string> = {
    Bulletproof: "bullet",
    Soundproof: "sound",
    "Punk Rock": "sound",
    Dazzling: "priority",
    "Queenly Majesty": "priority",
    "Armor Tail": "priority",
    Overcoat: "powder",
    "Iron Fist": "punch",
    "Strong Jaw": "bite",
    "Mega Launcher": "pulse",
    Sharpness: "slicing",
    "Tough Claws": "contact",
  };
  const flag = flagByAbility[abilityName];
  if (!flag) return [];
  const out: string[] = [];
  for (const m of gen.moves.all()) {
    if (!m.exists || (m.isNonstandard && m.isNonstandard !== "Past")) continue;
    if (flag === "priority") {
      if ((m.priority ?? 0) > 0 && m.category !== "Status") out.push(m.name);
    } else if (m.flags && (m.flags as Record<string, unknown>)[flag]) {
      out.push(m.name);
    }
  }
  return out.sort();
}
