import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel, ProvisionalTag } from "@/components/ui";
import { TeamEditor, type EditorMember } from "@/components/TeamEditor";
import { NATURES } from "@/data/fixtures/natures";
import { diffSnapshots } from "@/domain/team/versionDiff";
import { getPokemonBySlug } from "@/server/repositories/pokemonRepo";
import { listCollections, getTeam } from "@/server/repositories/teamRepo";
import { resolveTeam } from "@/server/teamResolve";
import {
  assignCollectionAction,
  deleteTeamAction,
  duplicateTeamAction,
  restoreVersionAction,
  updateNotesAction,
} from "../actions";

export const dynamic = "force-dynamic";

const NATURE_NAMES = Object.keys(NATURES);

export default async function TeamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { id } = await params;
  const { a, b } = await searchParams;
  const [team, collections] = await Promise.all([getTeam(id), listCollections()]);
  if (!team) notFound();

  const latest = team.versions[team.versions.length - 1]!;
  const { validation, analysis, missingSpecies } = await resolveTeam(
    latest.snapshot,
  );

  // Editor needs each member's reference name + legal moves.
  const refs = await Promise.all(
    latest.snapshot.members.map((m) => getPokemonBySlug(m.species)),
  );
  const editorMembers: EditorMember[] = latest.snapshot.members.map((set, i) => {
    const ref = refs[i];
    return {
      species: set.species,
      name: ref?.name ?? set.species,
      legalMoves: ref ? ref.moves.map((mv) => mv.name) : set.moves,
      set,
    };
  });

  const versionByNumber = new Map(team.versions.map((v) => [v.versionNumber, v]));
  const from = a ? versionByNumber.get(Number(a)) : team.versions[0];
  const to = b ? versionByNumber.get(Number(b)) : latest;
  const diff = from && to ? diffSnapshots(from.snapshot, to.snapshot) : null;

  return (
    <div className="space-y-6">
      <Link href="/teams" className="text-sm text-amber-400 hover:underline">
        ← Teams
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{team.name}</h1>
        <div className="flex items-center gap-2 text-sm">
          <a
            href={`/teams/${team.id}/export`}
            className="rounded border border-slate-600 px-3 py-1 hover:border-amber-500"
          >
            Export JSON
          </a>
          <form action={duplicateTeamAction}>
            <input type="hidden" name="teamId" value={team.id} />
            <button className="rounded border border-slate-600 px-3 py-1 hover:border-amber-500">
              Duplicate
            </button>
          </form>
          <form action={deleteTeamAction}>
            <input type="hidden" name="teamId" value={team.id} />
            <button className="rounded border border-rose-800 px-3 py-1 text-rose-300 hover:border-rose-500">
              Delete
            </button>
          </form>
        </div>
      </div>

      {/* Validation of the latest version */}
      <Panel title="Legality">
        {missingSpecies.length > 0 && (
          <p className="mb-2 text-xs text-amber-300">
            Missing from Pokédex: {missingSpecies.join(", ")}
          </p>
        )}
        {validation.valid ? (
          <p className="text-sm text-emerald-400">
            Latest version (v{latest.versionNumber}) is legal.
          </p>
        ) : (
          <div>
            <p className="text-sm text-rose-400">
              Latest version has {validation.errors.length} error(s).
            </p>
            <ul className="mt-1 list-disc pl-5 text-xs text-rose-400">
              {validation.errors.map((e, i) => (
                <li key={i}>
                  {e.species ? `${e.species}: ` : ""}
                  {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        {validation.warnings.length > 0 && (
          <ul className="mt-1 list-disc pl-5 text-xs text-amber-300">
            {validation.warnings.map((w, i) => (
              <li key={i}>
                {w.species ? `${w.species}: ` : ""}
                {w.message}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Basic team analysis */}
      {analysis && (
        <Panel title="Team analysis">
          <div className="mb-3">
            <ProvisionalTag />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase text-slate-500">
                Defensive weaknesses
              </h3>
              <ul className="mt-1 space-y-0.5 text-xs">
                {analysis.weaknesses.slice(0, 8).map((w) => (
                  <li
                    key={w.type}
                    className={w.shared ? "text-rose-300" : "text-slate-400"}
                  >
                    <span className="capitalize">{w.type}</span> ×
                    {w.members.length}
                    {w.shared ? " (shared)" : ""}: {w.members.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase text-slate-500">
                Offensive coverage gaps
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {analysis.offensiveGaps.length === 0
                  ? "No super-effective gaps against single types."
                  : `No super-effective answer to: ${analysis.offensiveGaps.join(", ")}.`}
              </p>
              <h3 className="mt-3 text-xs font-semibold uppercase text-slate-500">
                Speed tiers
              </h3>
              <ul className="mt-1 text-xs text-slate-400">
                {analysis.speedTiers.map((s) => (
                  <li key={s.name}>
                    {s.name}: {s.speed}
                  </li>
                ))}
              </ul>
              <h3 className="mt-3 text-xs font-semibold uppercase text-slate-500">
                Speed control
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {analysis.speedControl.missing
                  ? "None detected (no priority or speed-control moves)."
                  : [
                      analysis.speedControl.hasPriority ? "priority moves" : null,
                      analysis.speedControl.controlMoves.length
                        ? `${analysis.speedControl.controlMoves.length} control move(s)`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(", ")}
              </p>
              {analysis.dependence.note && (
                <p className="mt-2 text-xs text-amber-300">
                  {analysis.dependence.note}
                </p>
              )}
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Notes">
        <form action={updateNotesAction} className="space-y-2">
          <input type="hidden" name="teamId" value={team.id} />
          <textarea
            name="notes"
            defaultValue={team.notes}
            rows={3}
            placeholder="Team notes…"
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          />
          <button className="rounded border border-slate-600 px-3 py-1 text-sm hover:border-amber-500">
            Save notes
          </button>
        </form>
      </Panel>

      <Panel title="Assign to collection">
        <form action={assignCollectionAction} className="flex gap-2">
          <input type="hidden" name="teamId" value={team.id} />
          <select
            name="collectionId"
            defaultValue={team.collectionId ?? ""}
            className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          >
            <option value="">No collection</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="rounded border border-slate-600 px-3 py-2 text-sm hover:border-amber-500">
            Save
          </button>
        </form>
      </Panel>

      <Panel title={`Versions (${team.versions.length})`}>
        <ul className="space-y-1 text-sm">
          {team.versions.map((v) => (
            <li key={v.id} className="flex items-center gap-3">
              <span className="font-mono text-amber-400">v{v.versionNumber}</span>
              <span className="text-slate-300">{v.label ?? "—"}</span>
              <span className="text-xs text-slate-500">
                {v.snapshot.members.length} members ·{" "}
                {new Date(v.createdAt).toLocaleString()}
              </span>
              {v.versionNumber !== latest.versionNumber && (
                <form action={restoreVersionAction} className="ml-auto">
                  <input type="hidden" name="teamId" value={team.id} />
                  <input type="hidden" name="versionNumber" value={v.versionNumber} />
                  <button className="rounded border border-slate-700 px-2 py-0.5 text-xs hover:border-amber-500">
                    Restore
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Compare versions">
        <form method="get" className="mb-3 flex items-end gap-2 text-sm">
          <label className="flex flex-col">
            <span className="text-xs text-slate-500">From</span>
            <select
              name="a"
              defaultValue={String(from?.versionNumber ?? "")}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1"
            >
              {team.versions.map((v) => (
                <option key={v.id} value={v.versionNumber}>
                  v{v.versionNumber}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-slate-500">To</span>
            <select
              name="b"
              defaultValue={String(to?.versionNumber ?? "")}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1"
            >
              {team.versions.map((v) => (
                <option key={v.id} value={v.versionNumber}>
                  v{v.versionNumber}
                </option>
              ))}
            </select>
          </label>
          <button className="rounded border border-slate-600 px-3 py-1 hover:border-amber-500">
            Compare
          </button>
        </form>

        {diff ? (
          diff.changedCount === 0 ? (
            <p className="text-sm text-slate-500">
              No differences between v{from!.versionNumber} and v
              {to!.versionNumber}.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {diff.members
                .filter((m) => m.status !== "unchanged")
                .map((m) => (
                  <li key={m.species} className="rounded bg-slate-800/40 p-2">
                    <span className="font-semibold capitalize">{m.species}</span>{" "}
                    <span className="text-xs uppercase text-amber-400">
                      {m.status}
                    </span>
                    {m.changes.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-xs text-slate-400">
                        {m.changes.map((c) => (
                          <li key={c.field}>
                            {c.field}: {JSON.stringify(c.from)} →{" "}
                            {JSON.stringify(c.to)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
            </ul>
          )
        ) : (
          <p className="text-sm text-slate-500">Select two versions to compare.</p>
        )}
      </Panel>

      <Panel title="Edit sets → save as new version">
        <TeamEditor
          teamId={team.id}
          members={editorMembers}
          natures={NATURE_NAMES}
        />
      </Panel>
    </div>
  );
}
