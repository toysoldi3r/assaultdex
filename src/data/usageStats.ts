// Competitive usage stats for the Pokémon Champions format, aggregated from
// MunchStats' public replay-data branch on GitHub.
//
// Freshness: MunchStats regenerates that branch ~every 6h. We fetch the raw
// team-rankings file with a 1-hour revalidate (Next.js data cache: cold boot
// pulls fresh, then background-revalidates hourly, stale-while-revalidate). If
// the fetch ever fails we fall back to a snapshot committed in the repo, so the
// cards never break. The raw file is team compositions + battle counts + wins,
// so we can derive per-Pokémon usage %, win rate, and teammates — but not
// per-move/item/ability/EV data (that lives behind the Limitless API / Smogon
// chaos stats, neither reachable from this build environment).

import fallback from "./fixtures/usage/gen9championsvgc2026regmbbo3.json";

/** The Champions format these cards describe. */
export const CHAMPIONS_FORMAT = "gen9championsvgc2026regmbbo3";
export const CHAMPIONS_FORMAT_LABEL = "Champions VGC 2026 Reg M-B (Bo3)";

const RAW_BASE =
  process.env.USAGE_DATA_URL ||
  "https://raw.githubusercontent.com/PizzaTimeJoshua/munchstats/replay-data/stats/replays/";

// The raw team-rankings file is several MB — past Next.js's 2MB fetch-cache
// ceiling — so we can't lean on `revalidate`. Instead we memoise the small
// aggregated result in-process and re-fetch when it ages past this TTL: the
// first request after a cold boot (or after an hour) pulls fresh, the rest
// reuse the ~90KB aggregate. Upstream itself only regenerates every ~6h.
const TTL_MS = 60 * 60 * 1000;

/** Cross-source join key: "Urshifu-Rapid-Strike" → "urshifurapidstrike" (== @pkmn id). */
export function usageKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export interface Teammate {
  key: string;
  name: string;
  pct: number;
}

export interface MonUsage {
  name: string;
  usage: number;
  winRate: number;
  teammates: Teammate[];
}

export interface UsageData {
  format: string;
  totalBattles: number;
  mons: Record<string, MonUsage>;
}

interface RankingRow {
  team: string[];
  wins?: number;
  total_battles?: number;
}

/** Aggregate raw team-ranking rows into per-Pokémon usage, win rate, teammates. */
export function aggregateRankings(rows: RankingRow[]): UsageData {
  const names: Record<string, string> = {};
  const acc: Record<
    string,
    { battles: number; wins: number; mates: Record<string, number> }
  > = {};
  let totalBattles = 0;

  for (const row of rows) {
    const battles = row.total_battles || 0;
    const wins = row.wins || 0;
    totalBattles += battles;
    for (const name of row.team) {
      const k = usageKey(name);
      names[k] ??= name;
      const m = (acc[k] ??= { battles: 0, wins: 0, mates: {} });
      m.battles += battles;
      m.wins += wins;
      for (const other of row.team) {
        if (other === name) continue;
        const ok = usageKey(other);
        m.mates[ok] = (m.mates[ok] || 0) + battles;
      }
    }
  }

  const mons: Record<string, MonUsage> = {};
  for (const [k, m] of Object.entries(acc)) {
    if (m.battles === 0) continue;
    mons[k] = {
      name: names[k] ?? k,
      usage: +((100 * m.battles) / totalBattles).toFixed(2),
      winRate: +((100 * m.wins) / m.battles).toFixed(1),
      teammates: Object.entries(m.mates)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([mk, v]) => ({
          key: mk,
          name: names[mk] ?? mk,
          pct: +((100 * v) / m.battles).toFixed(1),
        })),
    };
  }

  return { format: CHAMPIONS_FORMAT, totalBattles, mons };
}

let cache: { data: UsageData; at: number } | null = null;

/** Load usage data: fresh from GitHub (hourly TTL), stale cache, else snapshot. */
export async function loadUsage(): Promise<UsageData> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  try {
    const res = await fetch(`${RAW_BASE}team-rankings-${CHAMPIONS_FORMAT}.json`, {
      cache: "no-store",
    });
    if (res.ok) {
      const rows = (await res.json()) as RankingRow[];
      if (Array.isArray(rows) && rows.length > 0) {
        cache = { data: aggregateRankings(rows), at: Date.now() };
        return cache.data;
      }
    }
  } catch {
    // fall through to stale cache / committed snapshot
  }
  // Prefer a previously fetched (now-stale) copy over the bundled snapshot;
  // don't cache the snapshot so the next request retries the fetch.
  return cache?.data ?? (fallback as UsageData);
}

/** Usage for one species by display name, or null if it has no recorded games. */
export async function getMonUsage(name: string): Promise<MonUsage | null> {
  const data = await loadUsage();
  return data.mons[usageKey(name)] ?? null;
}
