import { Dex } from "@pkmn/dex";
import { PokedexBrowser, type PokedexEntry } from "@/components/PokedexBrowser";
import { listDexEntries } from "@/data/pokedexSource";
import { listPokemon } from "@/server/repositories/pokemonRepo";

// ISR: the Champions pool comes from the build-time seed, so render once and
// regenerate hourly rather than querying the DB on every request.
export const revalidate = 3600;

export const metadata = {
  title: "Pokédex",
  description: "Browse the Pokémon Champions roster and the full National Dex - types, abilities, base stats, and legal movepools.",
};

export default async function PokedexPage() {
  // Champions view is the real 235-mon pool (formes included, e.g. Rotom-Wash),
  // each carrying its full legal movepool so the advanced "learns move" filter
  // and variant lookups work. The full-dex view is the base-species reference.
  const dbMons = await listPokemon();
  const champions: PokedexEntry[] = dbMons.map((p) => ({
    slug: p.slug,
    name: p.name,
    num: Dex.species.get(p.slug).num || 0,
    types: p.types,
    abilities: p.abilities,
    baseStats: p.baseStats,
    champions: true,
    moves: p.movepool,
  }));
  const fullCount = listDexEntries().length;
  return <PokedexBrowser champions={champions} fullCount={fullCount} />;
}
