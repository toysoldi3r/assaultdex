import { Panel, ProvisionalTag } from "@/components/ui";
import { BattleEditor } from "@/components/choicedex/BattleEditor";
import { LeadAnalyzer } from "@/components/choicedex/LeadAnalyzer";
import type { PokemonRef } from "@/lib/choicedexBuild";
import { listPokemon } from "@/server/repositories/pokemonRepo";

export const dynamic = "force-dynamic";

export default async function ChoiceDexPage() {
  const pokemon = await listPokemon();
  const refs: PokemonRef[] = pokemon.map((p) => ({
    slug: p.slug,
    name: p.name,
    types: p.types,
    baseStats: p.baseStats,
    moves: p.moves,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">ChoiceDex</h1>
        <ProvisionalTag />
      </div>
      <p className="max-w-2xl text-sm text-slate-400">
        Interactive doubles decision support. Edit the battle state live —
        recommendations update as you change HP, status, stat stages, and field —
        record turns to build a history you can undo or return to, and rank leads
        before the battle. All calculations are provisional and unverified for
        Pokémon Champions.
      </p>

      {refs.length === 0 ? (
        <Panel>
          <p className="text-sm text-slate-400">
            Import Pokémon first: <code>pnpm db:seed</code>.
          </p>
        </Panel>
      ) : (
        <>
          <Panel title="Lead analysis">
            <LeadAnalyzer pokemon={refs} />
          </Panel>
          <Panel title="Battle editor">
            <BattleEditor pokemon={refs} />
          </Panel>
        </>
      )}
    </div>
  );
}
