import Link from "next/link";
import { Panel } from "@/components/ui";
import { listPokemon } from "@/server/repositories/pokemonRepo";
import { listCollections, listTeams } from "@/server/repositories/teamRepo";
import {
  createCollectionAction,
  createTeamAction,
  importTeamAction,
} from "./actions";

export const dynamic = "force-dynamic";

const IMPORT_MESSAGES: Record<string, string> = {
  "invalid-json": "Import failed: the pasted text is not valid JSON.",
  "invalid-shape": "Import failed: JSON does not match the team snapshot shape.",
};

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ import?: string }>;
}) {
  const { import: importError } = await searchParams;
  const [pokemon, teams, collections] = await Promise.all([
    listPokemon(),
    listTeams(),
    listCollections(),
  ]);

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
        <div className="grid gap-6 md:grid-cols-2">
          <Panel title="Create a team">
            <form action={createTeamAction} className="space-y-3">
              <input
                name="name"
                required
                placeholder="Team name"
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <select
                name="collectionId"
                defaultValue=""
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="">No collection</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <fieldset className="rounded border border-slate-800 p-3">
                <legend className="px-1 text-xs uppercase text-slate-500">
                  Pick up to 6
                </legend>
                <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto text-sm">
                  {pokemon.map((p) => (
                    <label key={p.slug} className="flex items-center gap-2">
                      <input type="checkbox" name="species" value={p.slug} />
                      {p.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button
                type="submit"
                className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
              >
                Create team
              </button>
            </form>
          </Panel>

          <Panel title="Collections">
            <form action={createCollectionAction} className="mb-4 flex gap-2">
              <input
                name="name"
                placeholder="New collection name"
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded border border-slate-600 px-3 py-2 text-sm hover:border-amber-500"
              >
                Add
              </button>
            </form>
            {collections.length === 0 ? (
              <p className="text-sm text-slate-500">
                No collections yet. Collections are private by default.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {collections.map((c) => (
                  <li key={c.id} className="flex justify-between">
                    <span>{c.name}</span>
                    <span className="text-xs text-slate-500">
                      {c.isPrivate ? "private" : "public"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      <Panel title="Import a team">
        {importError && IMPORT_MESSAGES[importError] && (
          <p className="mb-2 text-xs text-rose-400">
            {IMPORT_MESSAGES[importError]}
          </p>
        )}
        <form action={importTeamAction} className="space-y-2">
          <input
            name="name"
            placeholder="Imported team name"
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          />
          <textarea
            name="json"
            rows={4}
            placeholder='{"members":[ … ]}  (paste an exported team snapshot)'
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs"
          />
          <button className="rounded border border-slate-600 px-3 py-1 text-sm hover:border-amber-500">
            Import
          </button>
        </form>
      </Panel>

      <Panel title="Saved teams">
        {teams.length === 0 ? (
          <p className="text-sm text-slate-500">No teams saved yet.</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {teams.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2">
                <Link
                  href={`/teams/${t.id}`}
                  className="text-amber-400 hover:underline"
                >
                  {t.name}
                </Link>
                <span className="text-xs text-slate-500">
                  {t.versions.length} version{t.versions.length === 1 ? "" : "s"}
                  {t.collectionName ? ` · ${t.collectionName}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
