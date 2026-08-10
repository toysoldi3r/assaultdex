"use client";

import { useState } from "react";
import Link from "next/link";
import { PokeIcon } from "@/components/PokeIcon";
import { TypeBadge } from "@/components/ui";
import { createTeamAction } from "@/app/teams/actions";
import type { PokemonType } from "@/domain/types/pokemon";
import type { MonUsage, TeamRank, CoreEntry } from "@/data/usageStats";

const uKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const grouped = (n: number) => Math.round(n).toLocaleString();

type Tab = "usage" | "winrate" | "teams";

/** Win-rate colour rule shared across the cards. */
function wrColor(w: number): string {
  return w >= 55 ? "text-pos" : w < 48 ? "text-neg" : "text-t2";
}

const LADDER_COLS = "24px 40px 1fr 110px 58px 74px";
const CAPTION: Record<Tab, (total: string) => string> = {
  usage: (t) =>
    `Usage % is the share of the ${t} recorded ladder battles a Pokémon appears in; Battles is that share as a count. The bar is the share against the most-used Pokémon.`,
  winrate: () =>
    "Win rate is wins ÷ battles for that Pokémon, among those on at least 3% of teams. The bar is that rate against the highest.",
  teams: () =>
    "Teams is the number of distinct team compositions the Pokémon appears in. The bar is that count against the highest.",
};
const BAR_LABEL: Record<Tab, string> = {
  usage: "Share of battles",
  winrate: "Wins ÷ battles",
  teams: "Distinct teams",
};
const VALUE_LABEL: Record<Tab, string> = { usage: "%", winrate: "%", teams: "Teams" };

export function MetaCards({
  usage,
  winrate,
  byTeams,
  teams,
  cores2,
  cores3,
  cores4,
  totalBattles,
  typesByKey,
}: {
  usage: MonUsage[];
  winrate: MonUsage[];
  byTeams: MonUsage[];
  teams: TeamRank[];
  cores2: CoreEntry[];
  cores3: CoreEntry[];
  cores4: CoreEntry[];
  totalBattles: number;
  typesByKey: Record<string, PokemonType[]>;
}) {
  const [tab, setTab] = useState<Tab>("usage");
  const [coreSize, setCoreSize] = useState<2 | 3 | 4>(2);

  const list = tab === "usage" ? usage : tab === "winrate" ? winrate : byTeams;
  const metricOf = (m: MonUsage) => (tab === "usage" ? m.usage : tab === "winrate" ? m.winRate : m.teams);
  const max = Math.max(1, ...list.map(metricOf));
  const cores = coreSize === 2 ? cores2 : coreSize === 3 ? cores3 : cores4;

  return (
    <div className="grid min-w-0 gap-[18px] lg:grid-cols-[1.35fr_1fr]">
      {/* Ladder */}
      <section className="overflow-hidden rounded-lg border border-line bg-panel">
        <div className="flex items-center gap-3 border-b border-line px-3.5 py-[9px]">
          <h2 className="text-[13px] font-semibold text-t1">Ladder</h2>
          <div className="ml-auto flex gap-1">
            {(["usage", "winrate", "teams"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded px-[9px] py-[3px] text-[11px] font-medium capitalize ${
                  tab === t ? "bg-accbg text-acc" : "bg-transparent text-t3 hover:text-t2"
                }`}
              >
                {t === "winrate" ? "Win rate" : t === "teams" ? "Teams" : "Usage"}
              </button>
            ))}
          </div>
        </div>
        <p className="border-b border-line px-3.5 py-[7px] text-[11px] leading-4 text-t3">
          {CAPTION[tab](grouped(totalBattles))}
        </p>
        <div className="max-h-[560px] overflow-y-auto overflow-x-hidden">
          <div
            className="sticky top-0 z-[1] grid items-center border-b border-line bg-panel px-3.5 py-1.5 text-[10px] uppercase tracking-[0.07em] text-t3"
            style={{ gridTemplateColumns: LADDER_COLS }}
          >
            <span>#</span>
            <span />
            <span>Pokémon</span>
            <span>{BAR_LABEL[tab]}</span>
            <span className="text-right">{VALUE_LABEL[tab]}</span>
            <span className="text-right">Battles</span>
          </div>
          {list.map((m, i) => {
            const v = metricOf(m);
            const types = typesByKey[uKey(m.name)] ?? [];
            return (
              <Link
                key={m.name}
                href={`/pokemon/${uKey(m.name)}`}
                title={`${m.usage}% usage · ${m.winRate}% win rate · ${m.teams} teams`}
                className="grid items-center border-b border-soft px-3.5 py-[5px] hover:bg-soft"
                style={{ gridTemplateColumns: LADDER_COLS }}
              >
                <span className="mono text-[11px] text-t3">{i + 1}</span>
                <PokeIcon species={m.name} />
                <span className="flex min-w-0 items-center gap-1 pr-2">
                  <span className="truncate text-[13px] font-medium text-t1">{m.name}</span>
                  <span className="flex flex-shrink-0 gap-1">
                    {types.map((t) => <TypeBadge key={t} type={t} />)}
                  </span>
                </span>
                <span className="h-[5px] rounded-[3px] bg-raise">
                  <span className="block h-full rounded-[3px] bg-acc" style={{ width: `${(v / max) * 100}%` }} />
                </span>
                <span className={`mono text-right text-xs ${tab === "winrate" ? wrColor(m.winRate) : "text-t1"}`}>
                  {tab === "teams" ? v : `${v}%`}
                </span>
                <span className="mono text-right text-[11px] text-t3">{grouped((m.usage / 100) * totalBattles)}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Right stack */}
      <div className="flex min-w-0 flex-col gap-[18px]">
        {/* Common cores */}
        <section className="overflow-hidden rounded-lg border border-line bg-panel">
          <div className="flex items-center gap-3 px-3.5 py-2">
            <h2 className="text-[13px] font-semibold text-t1">Common cores</h2>
            <div className="ml-auto flex gap-1">
              {([2, 3, 4] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setCoreSize(s)}
                  className={`rounded px-2 py-[3px] text-[11px] font-medium ${
                    coreSize === s ? "bg-accbg text-acc" : "bg-transparent text-t3 hover:text-t2"
                  }`}
                >
                  {s}-mon
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[330px] overflow-y-auto">
            <div className="sticky top-0 z-[1] flex items-center justify-between border-y border-line bg-panel px-3.5 py-1.5 text-[10px] uppercase tracking-[0.07em] text-t3">
              <span>Pairing</span>
              <span>Win rate</span>
            </div>
            {cores.length ? (
              cores.map((c, i) => (
                <div key={i} className="flex items-center gap-2.5 border-b border-soft px-3.5 py-1.5">
                  <span className="flex gap-px">
                    {c.members.map((n) => <PokeIcon key={n} species={n} />)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-t2">{c.members.join(" + ")}</span>
                  {c.battles > 0 && <span className={`mono w-11 flex-shrink-0 text-right text-xs ${wrColor(c.winRate)}`}>{c.winRate}%</span>}
                </div>
              ))
            ) : (
              <p className="px-3.5 py-3 text-xs text-t3">No core data yet.</p>
            )}
          </div>
        </section>

        {/* Top teams */}
        <section className="overflow-hidden rounded-lg border border-line bg-panel">
          <div className="px-3.5 py-[11px]">
            <h2 className="text-[13px] font-semibold text-t1">Top teams</h2>
          </div>
          <div className="max-h-[330px] overflow-y-auto">
            <div className="sticky top-0 z-[1] flex items-center gap-2 border-y border-line bg-panel px-3.5 py-1.5 text-[10px] uppercase tracking-[0.07em] text-t3">
              <span className="flex-1">Exact composition</span>
              <span className="w-9 text-right">Entries</span>
              <span className="w-[46px] text-right">Win rate</span>
            </div>
            {teams.length ? (
              teams.map((t, i) => (
                <div key={i} className="flex items-center gap-2 border-b border-soft px-3.5 py-1.5">
                  <span className="mono w-3.5 text-[11px] text-t3">{i + 1}</span>
                  <span className="flex flex-1 flex-wrap gap-px">
                    {t.members.map((n) => <PokeIcon key={n} species={n} />)}
                  </span>
                  <span className="mono w-9 flex-shrink-0 text-right text-[11px] text-t3">×{t.count}</span>
                  <span className={`mono w-[46px] flex-shrink-0 text-right text-xs ${wrColor(t.winRate)}`}>{t.winRate}%</span>
                  <form action={createTeamAction}>
                    <input type="hidden" name="name" value={`Meta team #${i + 1}`} />
                    {t.members.map((n) => (
                      <input key={n} type="hidden" name="species" value={uKey(n)} />
                    ))}
                    <button className="rounded border border-line px-2 py-0.5 text-[10px] text-t2 hover:border-accln" title="Add to your Teams">
                      Open
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <p className="px-3.5 py-3 text-xs text-t3">No team data yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
