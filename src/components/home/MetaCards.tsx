"use client";

import Link from "next/link";
import { PokeIcon } from "@/components/PokeIcon";
import { createTeamAction } from "@/app/teams/actions";
import type { MonUsage, TeamRank, CoreEntry } from "@/data/usageStats";

const uKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

function MonList({ mons, metric }: { mons: MonUsage[]; metric: "usage" | "winRate" }) {
  return (
    <ol className="space-y-0.5 text-sm">
      {mons.map((m, i) => (
        <li key={m.name} className="flex items-center gap-2">
          <span className="w-5 text-right text-xs tabular-nums text-slate-600">{i + 1}</span>
          <Link href={`/pokemon/${uKey(m.name)}`} className="flex flex-1 items-center gap-1.5 hover:text-amber-300">
            <PokeIcon species={m.name} className="scale-125" />
            <span className="truncate">{m.name}</span>
          </Link>
          <span className="w-24 text-right text-xs text-slate-500" title="teams this Pokémon appears in">
            {m.teams} teams
          </span>
          <span className="w-12 text-right tabular-nums text-slate-300">
            {metric === "usage" ? `${m.usage}%` : `${m.winRate}%`}
          </span>
        </li>
      ))}
    </ol>
  );
}

const cardClass = "rounded-lg border border-slate-800 bg-slate-900/40 p-4";
const headClass = "text-sm font-semibold uppercase tracking-wide text-slate-400";

/** One core-size card: icon rows only (no names), sized by member count. */
function CoreCard({ title, cores }: { title: string; cores: CoreEntry[] }) {
  return (
    <section className={cardClass}>
      <h2 className={headClass}>{title}</h2>
      <p className="mb-2 text-[11px] text-slate-500">% = win rate.</p>
      {cores.length ? (
        <ul className="space-y-1">
          {cores.map((c, i) => (
            <li key={i} className="flex items-center justify-between gap-2 rounded bg-slate-800/40 px-2 py-1">
              <span className="flex flex-wrap gap-1">
                {c.members.map((n) => <PokeIcon key={n} species={n} className="scale-125" />)}
              </span>
              {c.battles > 0 && (
                <span className="shrink-0 tabular-nums text-xs text-slate-500" title="win rate">{c.winRate}%</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">No core data yet.</p>
      )}
    </section>
  );
}

export function MetaCards({
  meta,
  winrate,
  teams,
  cores2,
  cores3,
  cores4,
}: {
  meta: MonUsage[];
  winrate: MonUsage[];
  teams: TeamRank[];
  cores2: CoreEntry[];
  cores3: CoreEntry[];
  cores4: CoreEntry[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className={cardClass}>
        <h2 className={headClass}>Top 20 in the meta</h2>
        <p className="mb-2 text-[11px] text-slate-500">% = share of ladder battles the Pokémon appears in.</p>
        <div className="max-h-96 overflow-y-auto pr-1">
          <MonList mons={meta} metric="usage" />
        </div>
      </section>

      <section className={cardClass}>
        <h2 className={headClass}>Top 20 by win rate</h2>
        <p className="mb-2 text-[11px] text-slate-500">% = wins ÷ battles for that Pokémon.</p>
        <div className="max-h-96 overflow-y-auto pr-1">
          <MonList mons={winrate} metric="winRate" />
        </div>
      </section>

      <section className={cardClass}>
        <h2 className={headClass}>Top 20 teams</h2>
        <p className="mb-2 text-[11px] text-slate-500">count = ladder entries with this exact team · % = win rate.</p>
        {teams.length ? (
          <div className="max-h-96 overflow-y-auto pr-1">
            <ol className="space-y-1">
              {teams.map((t, i) => (
                <li key={i} className="flex items-center gap-2 rounded bg-slate-800/40 px-2 py-1">
                  <span className="w-4 text-xs tabular-nums text-slate-600">{i + 1}</span>
                  <span className="flex flex-1 flex-wrap gap-1">
                    {t.members.map((n) => <PokeIcon key={n} species={n} className="scale-125" />)}
                  </span>
                  <span className="w-8 text-right text-[10px] text-slate-500" title="teams with this exact composition">
                    ×{t.count}
                  </span>
                  <span className="w-10 text-right tabular-nums text-xs text-slate-400" title="win rate">{t.winRate}%</span>
                  <form action={createTeamAction}>
                    <input type="hidden" name="name" value={`Meta team #${i + 1}`} />
                    {t.members.map((n) => (
                      <input key={n} type="hidden" name="species" value={uKey(n)} />
                    ))}
                    <button
                      className="rounded border border-slate-600 px-2 py-0.5 text-[10px] hover:border-amber-500"
                      title="Add this team to your Teams and open it in the builder"
                    >
                      Open
                    </button>
                  </form>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No team data yet.</p>
        )}
      </section>

      <CoreCard title="Common 2-mon cores" cores={cores2} />
      <CoreCard title="Common 3-mon cores" cores={cores3} />
      <CoreCard title="Common 4-mon cores" cores={cores4} />
    </div>
  );
}
