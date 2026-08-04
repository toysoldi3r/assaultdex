import { DatabaseApp } from "@/components/database/DatabaseApp";
import { listDbItems, listDbAbilities } from "@/data/dexDatabase";
import type { PokemonRef } from "@/lib/choicedexBuild";
import { listPokemon } from "@/server/repositories/pokemonRepo";

export const dynamic = "force-dynamic";

export const metadata = { title: "Database — AssaultDex" };

export default async function DatabasePage() {
  const [items, abilities, pokemon] = await Promise.all([
    Promise.resolve(listDbItems()),
    Promise.resolve(listDbAbilities()),
    listPokemon(),
  ]);
  const refs: PokemonRef[] = pokemon.map((p) => ({
    slug: p.slug,
    name: p.name,
    types: p.types,
    baseStats: p.baseStats,
    abilities: p.abilities,
    moves: p.moves,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Database</h1>
      <p className="max-w-2xl text-sm text-slate-400">
        Reference data for items, abilities, type matchups, and a two-Pokémon
        battle calculator. Calculations are provisional for Pokémon Champions.
      </p>
      <DatabaseApp items={items} abilities={abilities} pokemon={refs} />
    </div>
  );
}
