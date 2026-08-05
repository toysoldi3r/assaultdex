import { PokedexBrowser } from "@/components/PokedexBrowser";
import { listDexEntries } from "@/data/pokedexSource";
import { listPokemon } from "@/server/repositories/pokemonRepo";

export const dynamic = "force-dynamic";

export default async function PokedexPage() {
  const all = listDexEntries();
  // Attach the Champions roster's legal movepools so the advanced filter can
  // query "learns move X" without shipping every species' full learnset.
  const dbMons = await listPokemon();
  const moveBySlug = new Map(dbMons.map((p) => [p.slug, p.moves.map((m) => m.name)]));
  const champions = all
    .filter((e) => e.champions)
    .map((e) => ({ ...e, moves: moveBySlug.get(e.slug) ?? [] }));
  return <PokedexBrowser champions={champions} fullCount={all.length} />;
}
