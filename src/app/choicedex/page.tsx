import { Panel, ProvisionalTag } from "@/components/ui";
import { ChoiceDexApp, type SavedTeam } from "@/components/choicedex/ChoiceDexApp";
import { HitInference } from "@/components/choicedex/HitInference";
import { OpponentInference } from "@/components/choicedex/OpponentInference";
import { Practice } from "@/components/choicedex/Practice";
import { Simulator } from "@/components/choicedex/Simulator";
import type { PokemonRef } from "@/lib/choicedexBuild";
import { listPokemon } from "@/server/repositories/pokemonRepo";
import { listTeams } from "@/server/repositories/teamRepo";

export const dynamic = "force-dynamic";

export default async function ChoiceDexPage() {
  const [pokemon, teams] = await Promise.all([listPokemon(), listTeams()]);
  const refs: PokemonRef[] = pokemon.map((p) => ({
    slug: p.slug,
    name: p.name,
    types: p.types,
    baseStats: p.baseStats,
    abilities: p.abilities,
    moves: p.moves,
  }));

  const savedTeams: SavedTeam[] = teams
    .filter((t) => !t.isBox) // boxes are holding lists, not battle teams
    .map((t) => {
      const latest = t.versions[t.versions.length - 1];
      return {
        id: t.id,
        name: t.name,
        members: latest ? latest.snapshot.members.map((m) => m.species) : [],
      };
    })
    .filter((t) => t.members.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">ChoiceDex</h1>
        <ProvisionalTag />
      </div>
      <p className="max-w-2xl text-sm text-slate-400">
        Set up both teams, start the battle, and get the best options each round
        as you enter what happened. All calculations are provisional and
        unverified for Pokémon Champions.
      </p>

      {refs.length === 0 ? (
        <Panel>
          <p className="text-sm text-slate-400">
            Import Pokémon first: <code>pnpm db:seed</code>.
          </p>
        </Panel>
      ) : (
        <>
          <ChoiceDexApp pokemon={refs} teams={savedTeams} />

          <details className="rounded-lg border border-slate-800 bg-slate-900/40">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-300">
              Advanced tools
            </summary>
            <div className="space-y-6 border-t border-slate-800 p-4">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-400">Opponent stats from a hit</h3>
                <HitInference pokemon={refs} />
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-400">Opponent Speed inference</h3>
                <OpponentInference pokemon={refs} />
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-400">Simulation mode</h3>
                <Simulator pokemon={refs} />
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-400">Practice opponent</h3>
                <Practice pokemon={refs} />
              </section>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
