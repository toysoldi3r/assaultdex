import { TeamsHome, type TeamCard } from "@/components/teams/TeamsHome";
import { listCollections, listTeams } from "@/server/repositories/teamRepo";
import { importTeamAction } from "./actions";

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
  const [teams, collections] = await Promise.all([listTeams(), listCollections()]);

  const cards: TeamCard[] = teams.map((t) => ({
    id: t.id,
    name: t.name,
    isBox: t.isBox,
    collectionId: t.collectionId,
    members: t.members.map((m) => ({ species: m.species })),
  }));

  const folders = collections.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Teams</h1>

      <TeamsHome teams={cards} folders={folders} />

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
    </div>
  );
}
