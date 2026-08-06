// Battle-forme data (Mega / Primal / Aegislash-Blade …) resolved offline from
// @pkmn/dex for the Champions pool. Server-only (imports @pkmn/dex); the shared
// Variant / MegaForme types live in choicedexBuild so client tools can consume
// the results without pulling the dataset.

import { Dex } from "@pkmn/dex";
import { POKEMON_TYPES, type PokemonType, type StatKey } from "@/domain/types/pokemon";
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
      if (/Mega|Primal/.test(f.forme) || f.battleOnly) {
        extra.push({ label: f.forme, baseStats: orderStats(f.baseStats), types: mapTypes(f.types) });
      }
    }
    if (extra.length) out[p.slug] = [{ label: "Base", baseStats: p.baseStats, types: p.types }, ...extra];
  }
  return out;
}

/** Mega / Primal forme per pool species, for the in-battle Mega button. */
export function buildMegaForms(refs: PokemonRef[]): Record<string, MegaForme> {
  const out: Record<string, MegaForme> = {};
  for (const p of refs) {
    const s = Dex.species.get(p.slug);
    if (!s.exists) continue;
    for (const fn of s.otherFormes ?? []) {
      const f = Dex.species.get(fn);
      if (!f.exists || !/Mega|Primal/.test(f.forme)) continue;
      out[p.slug] = {
        name: f.name,
        baseStats: orderStats(f.baseStats),
        types: mapTypes(f.types),
        ability: (Object.values(f.abilities)[0] as string) ?? p.abilities[0] ?? "",
        item: f.requiredItem ?? "",
      };
      break; // first Mega/Primal forme (e.g. Charizard-Mega-X)
    }
  }
  return out;
}
