import { PokedexBrowser } from "@/components/PokedexBrowser";
import { listDexEntries } from "@/data/pokedexSource";

// Static: the dex comes from @pkmn/dex (build-time constant), no per-request
// state — so this prerenders once and serves from cache.
export const dynamic = "force-static";

export default function PokedexPage() {
  const all = listDexEntries();
  // Ship only the Champions roster up front (default view); the full dex is
  // fetched lazily from /pokemon/all when the visitor toggles to it.
  const champions = all.filter((e) => e.champions);
  return <PokedexBrowser champions={champions} fullCount={all.length} />;
}
