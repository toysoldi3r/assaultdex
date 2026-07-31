import Link from "next/link";
import { TeamCreate, type PickEntry } from "@/components/teams/TeamCreate";
import { Panel } from "@/components/ui";
import { listPokemon } from "@/server/repositories/pokemonRepo";
import { listTeams } from "@/server/repositories/teamRepo";
import { createTeamAction, importTeamAction } from "./actions";

export const dynamic = "force-dynamic";

const IMPORT_MESSAGES: Record<string, string> = {
  empty: "Import failed: no Pokémon found in the pasted text.",
  unresolved: "Import failed: none of the pasted Pokémon are in the Champions pool.",
};

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ import?: string }>;
}) {
  const { import: importError } = await searchParams;
  const [pokemon, teams] = await Promise.all([listPokemon(), listTeams()]);

  const picks: PickEntry[] = pokemon.map((p) => ({
    slug: p.slug,
    name: p.name,
    types: p.types,
    abilities: p.abilities,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Teams</h1>

      {pokemon.length === 0 ? (
        <Panel>
          <p className="text-sm text-slate-400">
            Import Pokémon first: <code>pnpm db:seed</code>.
          </p>
        </Panel>
      ) : (
        <>
          <Panel title="Build a team">
            <TeamCreate pokemon={picks} createAction={createTeamAction} />
          </Panel>

          <Panel title="Saved teams">
            {teams.length === 0 ? (
              <p className="text-sm text-slate-500">No teams saved yet.</p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {teams.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                    <Link
                      href={`/teams/${t.id}`}
                      className="font-medium text-amber-400 hover:underline"
                    >
                      {t.name}
                    </Link>
                    <span className="flex items-center gap-3 text-xs text-slate-500">
                      <span>
                        {t.versions.length} version{t.versions.length === 1 ? "" : "s"}
                      </span>
                      <a
                        href={`/teams/${t.id}/export`}
                        className="rounded border border-slate-700 px-2 py-0.5 hover:border-amber-500 hover:text-amber-300"
                      >
                        Export
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <details className="rounded-lg border border-slate-800 bg-slate-900/40">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-300">
              Import a team (Showdown format)
            </summary>
            <div className="border-t border-slate-800 p-4">
              {importError && IMPORT_MESSAGES[importError] && (
                <p className="mb-2 text-xs text-rose-400">{IMPORT_MESSAGES[importError]}</p>
              )}
              <form action={importTeamAction} className="space-y-2">
                <input
                  name="name"
                  placeholder="Imported team name"
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                />
                <textarea
                  name="text"
                  rows={8}
                  placeholder={"Paste a Showdown export, e.g.\n\nPelipper @ Damp Rock\nAbility: Drizzle\nLevel: 50\nEVs: 252 HP / 252 SpD\nCalm Nature\n- Hurricane\n- Hydro Pump\n- Tailwind\n- Protect"}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs"
                />
                <button className="rounded border border-slate-600 px-3 py-1 text-sm hover:border-amber-500">
                  Import
                </button>
              </form>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
