import { PokedexBrowser } from "@/components/PokedexBrowser";
import { listDexEntries } from "@/data/pokedexSource";

export const dynamic = "force-dynamic";

export default async function PokedexPage() {
  // Full national dex (all species incl. formes) straight from @pkmn/dex.
  const entries = listDexEntries();
  return <PokedexBrowser pokemon={entries} />;
}
