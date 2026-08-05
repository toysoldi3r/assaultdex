import { DatabaseApp } from "@/components/database/DatabaseApp";
import { listDbItems, listDbAbilities, listDbMoves } from "@/data/dexDatabase";
import type { PokemonRef } from "@/lib/choicedexBuild";
import { listPokemon } from "@/server/repositories/pokemonRepo";

export const dynamic = "force-dynamic";

export const metadata = { title: "Database — AssaultDex" };

export default async function DatabasePage() {
  const [items, abilities, moves, pokemon] = await Promise.all([
    Promise.resolve(listDbItems()),
    Promise.resolve(listDbAbilities()),
    Promise.resolve(listDbMoves()),
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
  // Abilities / moves that appear in the Champions roster, for the default filter.
  const championsAbilities = [...new Set(pokemon.flatMap((p) => p.abilities))];
  const championsMoves = [
    ...new Set(pokemon.flatMap((p) => (p.movepool.length ? p.movepool : p.moves.map((m) => m.name)))),
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Database</h1>
      <p className="max-w-2xl text-sm text-slate-400">
        Reference data for items, abilities, moves, and a two-Pokémon battle
        calculator, plus a terminology glossary. Calculations are provisional for
        Pokémon Champions.
      </p>
      <DatabaseApp
        items={items}
        abilities={abilities}
        moves={moves}
        pokemon={refs}
        championsAbilities={championsAbilities}
        championsMoves={championsMoves}
      />
    </div>
  );
}
