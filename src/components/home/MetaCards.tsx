"use client";

import { useState } from "react";
import Link from "next/link";
import { PokeIcon } from "@/components/PokeIcon";
import { TypeBadge } from "@/components/ui";
import { createTeamAction } from "@/app/teams/actions";
import type { PokemonType } from "@/domain/types/pokemon";
import type { MonUsage, TeamRank, CoreEntry } from "@/data/usageStats";

const uKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
// Locale-independent thousands grouping. `toLocaleString()` picks the runtime
// locale, so it renders "10,662" on the server and "10.662" in a nl/de browser,
// which triggers a hydration mismatch. This is deterministic on both sides.
const grouped = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

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

  // Height tracks the viewport so the Ladder and Top-teams cards fill the space
  // below the banner/stat strip exactly, without pushing the page into a scroll.
  // Inner lists scroll within each card.
  return (
    <div className="grid min-w-0 items-stretch gap-[18px] lg:h-[calc(100dvh-408px)] lg:min-h-[400px] lg:grid-cols-[1.35fr_1fr] lg:[grid-template-rows:minmax(0,1fr)]">
      {/* Ladder */}
      <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-panel lg:h-full">
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
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden max-h-[560px] lg:max-h-none">
          <div
            className="sticky top-0 z-[1] hidden items-center border-b border-line bg-panel px-3.5 py-1.5 text-[10px] uppercase tracking-[0.07em] text-t3 md:grid"
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
                className="block border-b border-soft px-3.5 py-2 hover:bg-soft md:grid md:items-center md:py-[5px]"
                style={{ gridTemplateColumns: LADDER_COLS }}
              >
                {/* Mobile: rank · icon · name+badges · metric on one line, bar below.
                    Desktop (md+): the grid cells below flow into LADDER_COLS. */}
                <span className="mono hidden text-[11px] text-t3 md:inline">{i + 1}</span>
                <span className="hidden md:inline">
                  <PokeIcon species={m.name} />
                </span>
                <div className="flex items-center gap-2 md:contents">
                  <span className="mono w-4 flex-shrink-0 text-[11px] text-t3 md:hidden">{i + 1}</span>
                  <span className="flex-shrink-0 md:hidden">
                    <PokeIcon species={m.name} />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-1 md:pr-2">
                    <span className="truncate text-[13px] font-medium text-t1">{m.name}</span>
                    <span className="flex flex-shrink-0 gap-1">
                      {types.map((t) => <TypeBadge key={t} type={t} />)}
                    </span>
                  </span>
                  <span className={`mono flex-shrink-0 text-right text-xs md:hidden ${tab === "winrate" ? wrColor(m.winRate) : "text-t1"}`}>
                    {tab === "teams" ? v : `${v}%`}
                  </span>
                </div>
                <span className="mt-1.5 block h-[5px] rounded-[3px] bg-raise md:mt-0">
                  <span className="block h-full rounded-[3px] bg-acc" style={{ width: `${(v / max) * 100}%` }} />
                </span>
                <span className={`mono hidden text-right text-xs md:inline ${tab === "winrate" ? wrColor(m.winRate) : "text-t1"}`}>
                  {tab === "teams" ? v : `${v}%`}
                </span>
                <span className="mono hidden text-right text-[11px] text-t3 md:inline">{grouped((m.usage / 100) * totalBattles)}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Right stack */}
      <div className="flex min-w-0 flex-col gap-[18px] lg:h-full">
        {/* Common cores — shares the column height with Top teams so neither
            collapses to a sliver. */}
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-line bg-panel">
          <div className="flex shrink-0 items-center gap-3 px-3.5 py-2">
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
          <div className="min-h-0 flex-1 overflow-y-auto max-h-[330px] lg:max-h-none">
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

        {/* Top teams — grows to fill so its bottom aligns with the Ladder card */}
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-line bg-panel">
          <div className="px-3.5 py-[11px]">
            <h2 className="text-[13px] font-semibold text-t1">Top teams</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto max-h-[330px] lg:max-h-none">
            <div className="sticky top-0 z-[1] flex items-center gap-2 border-y border-line bg-panel px-3.5 py-1.5 text-[10px] uppercase tracking-[0.07em] text-t3">
              <span className="flex-1">Exact composition</span>
              <span className="w-9 text-right">Entries</span>
              <span className="w-[46px] text-right">Win rate</span>
            </div>
            {teams.length ? (
              teams.map((t, i) => (
                <div key={i} className="flex items-center gap-2 border-b border-soft px-3.5 py-1.5">
                  <span className="mono w-3.5 shrink-0 text-[11px] text-t3">{i + 1}</span>
                  {/* Keep all six members on one row - compact fixed-width slots,
                      no wrapping, so a team never spills into a second line. */}
                  <span className="flex min-w-0 flex-1 flex-nowrap gap-px">
                    {t.members.map((n) => (
                      // The 40x30 pixel icon is scaled to fit the compact slot so
                      // it isn't cropped at the right/bottom; six still fit a row.
                      <span key={n} className="grid h-[30px] w-[32px] shrink-0 place-items-center overflow-hidden">
                        <span style={{ transform: "scale(0.8)" }}>
                          <PokeIcon species={n} />
                        </span>
                      </span>
                    ))}
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
