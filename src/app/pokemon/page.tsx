import { PokedexBrowser, type PokedexEntry } from "@/components/PokedexBrowser";
import { Panel } from "@/components/ui";
import dexNumbers from "@/data/fixtures/dexNumbers.json";
import { listPokemon } from "@/server/repositories/pokemonRepo";

export const dynamic = "force-dynamic";

export default async function PokedexPage() {
  const pokemon = await listPokemon();
  if (pokemon.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Pokédex</h1>
        <Panel>
          <p className="text-sm text-slate-400">
            No Pokémon imported yet. Run the seed: <code>pnpm db:seed</code>.
          </p>
        </Panel>
      </div>
    );
  }

  const nums = dexNumbers as Record<string, number>;
  const entries: PokedexEntry[] = pokemon.map((p) => ({
    slug: p.slug,
    name: p.name,
    num: nums[p.slug] ?? 99999,
    types: p.types,
    abilities: p.abilities,
    movepool: p.movepool,
    baseStats: p.baseStats,
  }));

  return <PokedexBrowser pokemon={entries} />;
}
