// Refresh the committed Pokédex flavor fixture (src/data/fixtures/pokedex.json):
// species classification (genus), height, foreign-language names, and per-game
// Pokédex entries. Runs OUT OF BAND (locally or in CI), never at request time,
// so the deployed app makes no external call - it only serves this snapshot.
//
//   pnpm refresh:pokedex            # Champions roster only (~235 species)
//   POKEDEX_ALL=1 pnpm refresh:pokedex   # every base species in the dex
//
// Source is PokéAPI (pokemon-species for genus/names/entries, pokemon for
// height), keyed by national dex number and stored under the @pkmn species id so
// the Pokédex page can look it up by slug. Species that fail to resolve are
// skipped and reported; a partial run still writes what it fetched.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Dex } from "@pkmn/dex";
import fixtureData from "../src/data/fixtures/pokemon.json";
import type {
  ForeignName,
  PokedexEntryText,
  PokedexFlavor,
} from "../src/data/pokedexFlavor";

const BASE_URL = process.env.POKEAPI_BASE_URL || "https://pokeapi.co/api/v2";
const OUT = join(process.cwd(), "src", "data", "fixtures", "pokedex.json");
const KEEP_LANGS = new Set([
  "ja", "ja-Hrkt", "ko", "zh-Hant", "zh-Hans", "fr", "de", "es", "it", "en",
]);

interface SpeciesResponse {
  genera?: { genus: string; language: { name: string } }[];
  names?: { name: string; language: { name: string } }[];
  flavor_text_entries?: {
    flavor_text: string;
    language: { name: string };
    version: { name: string };
  }[];
}
interface PokemonResponse {
  height?: number; // decimetres
}

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  return (await res.json()) as T;
}

/** Base species to cover: the Champions roster by default, all base species with
 *  POKEDEX_ALL=1. Mapped to { slug (@pkmn id), num (national dex) }. */
function targets(): { slug: string; num: number }[] {
  if (process.env.POKEDEX_ALL) {
    return Dex.species
      .all()
      .filter((s) => s.exists && s.num > 0 && s.baseSpecies === s.name && s.isNonstandard === null)
      .map((s) => ({ slug: s.id, num: s.num }));
  }
  const seen = new Set<string>();
  const out: { slug: string; num: number }[] = [];
  for (const p of (fixtureData as { pokemon: { external_id: string }[] }).pokemon) {
    const s = Dex.species.get(p.external_id);
    if (!s.exists) continue;
    const base = Dex.species.get(s.baseSpecies);
    if (!base.exists || seen.has(base.id)) continue;
    seen.add(base.id);
    out.push({ slug: base.id, num: base.num });
  }
  return out;
}

async function fetchOne(num: number): Promise<PokedexFlavor | null> {
  const sp = await getJson<SpeciesResponse>(`${BASE_URL}/pokemon-species/${num}`);
  if (!sp) return null;
  const out: PokedexFlavor = {};

  const genus = sp.genera?.find((g) => g.language.name === "en")?.genus;
  if (genus) out.genus = genus;

  const names: ForeignName[] = [];
  for (const n of sp.names ?? []) {
    if (KEEP_LANGS.has(n.language.name)) names.push({ lang: n.language.name, name: n.name });
  }
  if (names.length) out.names = names;

  // One English entry per game version, in first-seen order.
  const entries: PokedexEntryText[] = [];
  const seenVer = new Set<string>();
  for (const e of sp.flavor_text_entries ?? []) {
    if (e.language.name !== "en" || seenVer.has(e.version.name)) continue;
    seenVer.add(e.version.name);
    entries.push({ version: e.version.name, text: e.flavor_text.replace(/[\f\n\r]+/g, " ").trim() });
  }
  if (entries.length) out.entries = entries;

  const mon = await getJson<PokemonResponse>(`${BASE_URL}/pokemon/${num}`);
  if (mon?.height) out.heightM = mon.height / 10;

  return Object.keys(out).length > 0 ? out : null;
}

async function main() {
  const list = targets();
  const result: Record<string, PokedexFlavor> = {};
  const missing: string[] = [];
  let done = 0;
  for (const { slug, num } of list) {
    const flavor = await fetchOne(num).catch(() => null);
    if (flavor) result[slug] = flavor;
    else missing.push(slug);
    if (++done % 50 === 0) console.log(`  ${done}/${list.length}`);
  }
  writeFileSync(OUT, JSON.stringify(result, null, 2) + "\n");
  console.log(`pokedex flavor: wrote ${Object.keys(result).length} species, missing ${missing.length}`);
  if (missing.length) console.log(`  missing: ${missing.slice(0, 30).join(", ")}${missing.length > 30 ? " ..." : ""}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
