import Link from "next/link";
import { Panel } from "@/components/ui";
import { ChoiceDexApp, type KnownSet, type SavedTeam } from "@/components/choicedex/ChoiceDexApp";
import { HitInference } from "@/components/choicedex/HitInference";
import { OpponentInference } from "@/components/choicedex/OpponentInference";
import { Simulator } from "@/components/choicedex/Simulator";
import { toPokemonRefs, type PokemonRef } from "@/lib/choicedexBuild";
import { buildVariants, buildMegaForms } from "@/data/battleFormes";
import { listPokemon } from "@/server/repositories/pokemonRepo";
import { listTeams } from "@/server/repositories/teamRepo";
import { listDbItems } from "@/data/dexDatabase";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ChoiceDex",
  description: "Live battle recommendations for Pokémon Champions doubles - enter what happens and get the best options each round.",
};

export default async function ChoiceDexPage() {
  const [pokemon, teams] = await Promise.all([listPokemon(), listTeams()]);
  const refs: PokemonRef[] = toPokemonRefs(pokemon);

  const savedTeams: SavedTeam[] = teams
    .filter((t) => !t.isBox) // boxes are holding lists, not battle teams
    .map((t) => {
      const latest = t.versions[t.versions.length - 1];
      const members = latest?.snapshot.members ?? [];
      const sets: Record<string, KnownSet> = {};
      for (const m of members) {
        sets[m.species] ??= {
          evs: m.spread.evs,
          nature: m.nature,
          item: m.item ?? "None",
          ability: m.ability ?? "",
          moves: m.moves,
        };
      }
      return {
        id: t.id,
        name: t.name,
        members: members.map((m) => m.species),
        sets,
      };
    })
    .filter((t) => t.members.length > 0);

  // Only Champions-legal items are selectable (matching the Database's legal
  // set), including the Champions-specific mega stones the full catalog dropped.
  const itemNames = ["None", ...listDbItems().filter((i) => i.competitive).map((i) => i.name)];
  const megaForms = buildMegaForms(refs);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">ChoiceDex</h1>
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
          <ChoiceDexApp pokemon={refs} teams={savedTeams} items={itemNames} megaForms={megaForms} />

          <details className="rounded-lg border border-slate-800 bg-slate-900/40">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-300">
              Advanced tools
            </summary>
            <div className="space-y-6 border-t border-slate-800 p-4">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-400">Opponent stats from a hit</h3>
                <HitInference pokemon={refs} variants={buildVariants(refs)} />
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
                <h3 className="mb-2 text-sm font-semibold text-slate-400">Battle analysis</h3>
                <p className="text-sm text-slate-400">
                  Import a finished battle and review each turn - actual vs
                  recommended play, a personal dashboard, and confidence
                  calibration.{" "}
                  <Link href="/battles" className="text-amber-400 hover:underline">Open Battles →</Link>
                </p>
              </section>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
