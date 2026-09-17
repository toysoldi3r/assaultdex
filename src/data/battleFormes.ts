// Battle-forme data (Mega / Primal / Aegislash-Blade …) resolved offline from
// @pkmn/dex for the Champions pool. Server-only (imports @pkmn/dex); the shared
// Variant / MegaForme types live in choicedexBuild so client tools can consume
// the results without pulling the dataset.

import { Dex } from "@pkmn/dex";
import { POKEMON_TYPES, type PokemonType, type StatKey } from "@/domain/types/pokemon";
import { CHAMPIONS_LEGAL_ITEMS } from "@/data/dexDatabase";
import type { MegaForme, PokemonRef, Variant } from "@/lib/choicedexBuild";

const STAT_KEYS_ORDER: StatKey[] = ["hp", "atk", "def", "spa", "spd", "spe"];

/** Lowercase + keep only real Pokémon types. */
function mapTypes(arr: readonly string[]): PokemonType[] {
  return arr
    .map((t) => t.toLowerCase())
    .filter((t): t is PokemonType => (POKEMON_TYPES as readonly string[]).includes(t));
}

/** Reorder a dex base-stat block into the canonical HP…Spe order. */
function orderStats(b: Record<StatKey, number>): Record<StatKey, number> {
  return Object.fromEntries(STAT_KEYS_ORDER.map((k) => [k, b[k]])) as Record<StatKey, number>;
}

/** True for a Mega/Primal forme whose trigger stone is Champions-legal (or that
 *  needs no stone, e.g. a battle-only forme). Lets us prefer the Champions
 *  variant when a species has several (Absol-Mega vs the legal Absol-Mega-Z). */
function stoneLegal(f: { requiredItem?: string }): boolean {
  return !f.requiredItem || CHAMPIONS_LEGAL_ITEMS.has(f.requiredItem);
}

/** Battle formes (Mega / Primal / Aegislash-Blade …) per pool species. */
export function buildVariants(refs: PokemonRef[]): Record<string, Variant[]> {
  const out: Record<string, Variant[]> = {};
  for (const p of refs) {
    const s = Dex.species.get(p.slug);
    if (!s.exists) continue;
    const extra: Variant[] = [];
    for (const fn of s.otherFormes ?? []) {
      const f = Dex.species.get(fn);
      if (!f.exists) continue;
      const isMega = /Mega|Primal/.test(f.forme);
      // Mega/Primal formes only count when their stone is Champions-legal;
      // other battle-only formes (Aegislash-Blade, …) always count.
      if ((isMega && stoneLegal(f)) || (!isMega && f.battleOnly)) {
        extra.push({ label: f.forme, baseStats: orderStats(f.baseStats), types: mapTypes(f.types) });
      }
    }
    if (extra.length) out[p.slug] = [{ label: "Base", baseStats: p.baseStats, types: p.types }, ...extra];
  }
  return out;
}

/** Mega / Primal forme per pool species, for the in-battle Mega button. Prefers
 *  the forme whose stone is Champions-legal (e.g. Absol-Mega-Z over Absol-Mega). */
export function buildMegaForms(refs: PokemonRef[]): Record<string, MegaForme> {
  const out: Record<string, MegaForme> = {};
  for (const p of refs) {
    const s = Dex.species.get(p.slug);
    if (!s.exists) continue;
    let fallback: ReturnType<typeof Dex.species.get> | undefined;
    let chosen: ReturnType<typeof Dex.species.get> | undefined;
    for (const fn of s.otherFormes ?? []) {
      const f = Dex.species.get(fn);
      if (!f.exists || !/Mega|Primal/.test(f.forme)) continue;
      fallback ??= f;
      if (stoneLegal(f) && f.requiredItem) { chosen = f; break; }
    }
    const f = chosen ?? fallback;
    if (!f) continue;
    out[p.slug] = {
      name: f.name,
      baseStats: orderStats(f.baseStats),
      types: mapTypes(f.types),
      ability: (Object.values(f.abilities)[0] as string) ?? p.abilities[0] ?? "",
      item: f.requiredItem ?? "",
    };
  }
  return out;
}
