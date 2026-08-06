import Link from "next/link";
import { Panel, ProvisionalTag } from "@/components/ui";
import { Simulator } from "@/components/choicedex/Simulator";
import { toNameOptions, toPokemonRefs, type PokemonRef } from "@/lib/choicedexBuild";
import { buildDashboard } from "@/domain/analysis/dashboard";
import { listPokemon } from "@/server/repositories/pokemonRepo";
import { listBattles } from "@/server/repositories/battleRepo";
import {
  deleteAllBattlesAction,
  generateBattleAction,
  importBattleAction,
} from "./actions";

export const dynamic = "force-dynamic";

const ERR_MESSAGES: Record<string, string> = {
  missing: "Pick a Pokémon in every slot.",
  build: "Could not build the battle — re-run the seed.",
  json: "Import failed: not valid JSON.",
  shape: "Import failed: JSON is not a valid provisional replay.",
  rate: "Too many requests — please wait a moment and try again.",
};

export default async function BattlesPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await searchParams;
  const [battles, pokemon] = await Promise.all([listBattles(), listPokemon()]);
  const dashboard = buildDashboard(battles.map((b) => b.summary));
  const opts = toNameOptions(pokemon);
  const d = (i: number) => opts[i % opts.length]?.slug;
  const refs: PokemonRef[] = toPokemonRefs(pokemon);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Battles</h1>
        <ProvisionalTag />
      </div>
      <p className="max-w-2xl text-sm text-slate-400">
        Post-battle analysis, a personal dashboard, and confidence calibration.
        No confirmed Pokémon Champions replay format exists yet, so replays use a
        provisional internal format — generate a sample battle against the
        practice AI, or import a provisional replay JSON.
      </p>

      {err && ERR_MESSAGES[err] && (
        <p className="text-sm text-rose-400">{ERR_MESSAGES[err]}</p>
      )}

      <Panel title="Batch simulation — run many outcomes">
        <p className="mb-3 text-sm text-slate-400">
          In a tricky spot? Pick the four active Pokémon and run dozens or hundreds
          of Monte-Carlo rollouts at once (with a progress bar) to see the win/loss
          distribution and what is realistically possible.
        </p>
        {refs.length > 0 ? (
          <Simulator pokemon={refs} />
        ) : (
          <p className="text-sm text-slate-500">Import Pokémon first: <code>pnpm db:seed</code>.</p>
        )}
      </Panel>

      <Panel title="Dashboard">
        {dashboard.battles === 0 ? (
          <p className="text-sm text-slate-500">
            No battles yet. Generate or import one below.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Stat label="Battles" value={String(dashboard.battles)} />
              <Stat
                label="Win rate"
                value={
                  dashboard.winRate === null
                    ? "—"
                    : `${(dashboard.winRate * 100).toFixed(0)}%`
                }
              />
              <Stat
                label="Decision quality"
                value={dashboard.avgDecisionQuality.toFixed(3)}
              />
              <Stat label="Missed KOs" value={String(dashboard.totalMissedKos)} />
            </div>
            {dashboard.smallSample && (
              <p className="mt-2 text-xs text-amber-300">
                Small sample ({dashboard.battles} battles): treat these numbers as
                indicative, not conclusive.
              </p>
            )}

            <h3 className="mt-4 text-xs font-semibold uppercase text-slate-500">
              KO-probability calibration
              {dashboard.koCalibration.brierScore !== null
                ? ` · Brier ${dashboard.koCalibration.brierScore}`
                : ""}
            </h3>
            <div className="mt-1 overflow-x-auto">
              <table className="text-xs">
                <thead className="text-slate-500">
                  <tr>
                    <th className="px-2 text-left">bucket</th>
                    {dashboard.koCalibration.buckets.map((b) => (
                      <th key={b.lower} className="px-2">
                        {b.lower.toFixed(1)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 text-slate-500">observed</td>
                    {dashboard.koCalibration.buckets.map((b) => (
                      <td key={b.lower} className="px-2 text-center text-slate-300">
                        {b.count === 0 ? "—" : b.observedFrequency.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-2 text-slate-500">n</td>
                    {dashboard.koCalibration.buckets.map((b) => (
                      <td key={b.lower} className="px-2 text-center text-slate-500">
                        {b.count}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Generate a sample battle">
          <form action={generateBattleAction} className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              {(["u1", "u2", "o1", "o2"] as const).map((k, i) => (
                <label key={k} className="text-xs text-slate-400">
                  {k.startsWith("u") ? "You" : "Opp"} {k[1]}
                  <select
                    name={k}
                    defaultValue={d(i)}
                    className="mt-0.5 block w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
                  >
                    {opts.map((o) => (
                      <option key={o.slug} value={o.slug}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <label className="block text-xs text-slate-400">
              Difficulty
              <select
                name="difficulty"
                defaultValue="standard"
                className="mt-0.5 block rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
              >
                {["basic", "standard", "competitive", "highVariance"].map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>
            <button className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400">
              Generate &amp; analyze
            </button>
          </form>
        </Panel>

        <Panel title="Import a provisional replay">
          <form action={importBattleAction} className="space-y-2">
            <input
              name="label"
              placeholder="Battle label"
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            />
            <textarea
              name="json"
              rows={4}
              placeholder='{"format":"assaultdex-provisional-v1", …}'
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs"
            />
            <button className="rounded border border-slate-600 px-3 py-1 text-sm hover:border-amber-500">
              Import &amp; analyze
            </button>
          </form>
        </Panel>
      </div>

      <Panel title="History">
        {battles.length === 0 ? (
          <p className="text-sm text-slate-500">No battles recorded.</p>
        ) : (
          <>
            <ul className="divide-y divide-slate-800">
              {battles.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-2">
                  <Link
                    href={`/battles/${b.id}`}
                    className="text-amber-400 hover:underline"
                  >
                    {b.label || "Battle"}
                  </Link>
                  <span className="text-xs text-slate-500">
                    {b.result} · {b.turns} turns · quality{" "}
                    {b.summary.decisionQuality} · {b.source}
                  </span>
                </li>
              ))}
            </ul>
            <form action={deleteAllBattlesAction} className="mt-3">
              <button className="rounded border border-rose-800 px-3 py-1 text-xs text-rose-300 hover:border-rose-500">
                Delete all history
              </button>
            </form>
          </>
        )}
      </Panel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-900/40 p-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-100">{value}</p>
    </div>
  );
}
