import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/ui";
import { NATURES } from "@/data/fixtures/natures";
import { diffSnapshots } from "@/domain/team/versionDiff";
import { listCollections, getTeam } from "@/server/repositories/teamRepo";
import { addVersionAction, assignCollectionAction } from "../actions";

export const dynamic = "force-dynamic";

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
  const versionByNumber = new Map(team.versions.map((v) => [v.versionNumber, v]));
  const from = a ? versionByNumber.get(Number(a)) : team.versions[0];
  const to = b ? versionByNumber.get(Number(b)) : latest;
  const diff =
    from && to ? diffSnapshots(from.snapshot, to.snapshot) : null;

  return (
    <div className="space-y-6">
      <Link href="/teams" className="text-sm text-amber-400 hover:underline">
        ← Teams
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{team.name}</h1>
        <span className="text-xs text-slate-500">
          {team.collectionName ? `Collection: ${team.collectionName}` : "No collection"}
        </span>
      </div>

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
          <button
            type="submit"
            className="rounded border border-slate-600 px-3 py-2 text-sm hover:border-amber-500"
          >
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
          <button
            type="submit"
            className="rounded border border-slate-600 px-3 py-1 hover:border-amber-500"
          >
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

      <Panel title="Save a new version">
        <form action={addVersionAction} className="space-y-3">
          <input type="hidden" name="teamId" value={team.id} />
          <input
            name="label"
            placeholder="Version label (optional)"
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          />
          <div className="space-y-2">
            {latest.snapshot.members.map((m) => (
              <div
                key={m.species}
                className="grid grid-cols-1 gap-2 rounded border border-slate-800 p-2 sm:grid-cols-4"
              >
                <span className="self-center font-semibold capitalize">
                  {m.species}
                </span>
                <label className="text-xs text-slate-400">
                  Level
                  <input
                    type="number"
                    name={`level_${m.species}`}
                    defaultValue={m.level}
                    min={1}
                    max={100}
                    className="mt-0.5 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                  />
                </label>
                <label className="text-xs text-slate-400">
                  Item
                  <input
                    name={`item_${m.species}`}
                    defaultValue={m.item ?? ""}
                    placeholder="(none)"
                    className="mt-0.5 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                  />
                </label>
                <label className="text-xs text-slate-400">
                  Nature
                  <select
                    name={`nature_${m.species}`}
                    defaultValue={m.nature}
                    className="mt-0.5 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
                  >
                    {Object.keys(NATURES).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
          <button
            type="submit"
            className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
          >
            Save new version
          </button>
        </form>
      </Panel>
    </div>
  );
}
