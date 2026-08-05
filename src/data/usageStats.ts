// Competitive usage stats for the Pokémon Champions format.
//
// Privacy/reliability posture: the running app makes NO external request for
// this data. It is served entirely from a snapshot committed inside this
// (private) repo, so nothing is fetched at runtime, no trail leads from the
// live site to any data source, and the aggregated data is never exposed
// publicly. The snapshot is refreshed out-of-band by scripts/refresh-usage.mjs
// (run on a schedule in CI, committing back to this private repo) — see
// .github/workflows/refresh-usage.yml. The raw file it aggregates is team
// compositions + battle counts, so we derive usage %, win rate, and teammates;
// per-move/item/ability/EV data is not present in that source.

import snapshot from "./fixtures/usage/gen9championsvgc2026regmbbo3.json";

/** The Champions format these cards describe. */
export const CHAMPIONS_FORMAT = "gen9championsvgc2026regmbbo3";
export const CHAMPIONS_FORMAT_LABEL = "Champions VGC 2026 Reg M-B (Bo3)";

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
  /** Distinct team compositions this Pokémon appears in. */
  teams: number;
  teammates: Teammate[];
}

export interface TeamRank {
  members: string[];
  battles: number;
  winRate: number;
  /** How many ladder entries share this exact composition. */
  count: number;
}

export interface CoreEntry {
  members: string[];
  size: number;
  battles: number;
  winRate: number;
}

export interface UsageData {
  format: string;
  totalBattles: number;
  mons: Record<string, MonUsage>;
  /** Highest-battle exact team compositions (populated by newer refreshes). */
  topTeams?: TeamRank[];
  /** Common 2/3/4-Pokémon cores (populated by newer refreshes). */
  cores?: CoreEntry[];
}

/** All k-sized combinations of a sorted list (small k, small lists). */
function combinations<T>(arr: T[], k: number): T[][] {
  const res: T[][] = [];
  const combo: T[] = [];
  const rec = (start: number) => {
    if (combo.length === k) {
      res.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]!);
      rec(i + 1);
      combo.pop();
    }
  };
  rec(0);
  return res;
}

interface RankingRow {
  team: string[];
  wins?: number;
  total_battles?: number;
}

/**
 * Aggregate raw team-ranking rows into per-Pokémon usage, win rate, teammates.
 * Pure (no I/O) — the refresh script feeds it fetched rows; runtime never calls
 * it (runtime serves the pre-aggregated snapshot only).
 */
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
      teams: 0, // filled from distinct team compositions below
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

  // --- Top exact teams -----------------------------------------------------
  const teamAcc: Record<string, { members: string[]; battles: number; wins: number; count: number }> = {};
  for (const row of rows) {
    const members = [...row.team].sort();
    const key = members.map(usageKey).join("|");
    const t = (teamAcc[key] ??= { members, battles: 0, wins: 0, count: 0 });
    t.battles += row.total_battles || 0;
    t.wins += row.wins || 0;
    t.count += 1;
  }
  // Distinct team compositions each Pokémon appears in.
  for (const t of Object.values(teamAcc)) {
    for (const name of t.members) {
      const mk = usageKey(name);
      if (mons[mk]) mons[mk].teams += 1;
    }
  }
  const topTeams: TeamRank[] = Object.values(teamAcc)
    .filter((t) => t.battles > 0)
    .sort((a, b) => b.battles - a.battles)
    .slice(0, 10)
    .map((t) => ({
      members: t.members,
      battles: t.battles,
      winRate: +((100 * t.wins) / t.battles).toFixed(1),
      count: t.count,
    }));

  // --- Common cores (2/3/4) ------------------------------------------------
  const coreAcc: Record<string, { members: string[]; size: number; battles: number; wins: number }> = {};
  for (const row of rows) {
    const battles = row.total_battles || 0;
    const wins = row.wins || 0;
    if (battles === 0) continue;
    const members = [...row.team].sort();
    for (const size of [2, 3, 4]) {
      for (const combo of combinations(members, size)) {
        const key = combo.map(usageKey).join("|");
        const c = (coreAcc[key] ??= { members: combo, size, battles: 0, wins: 0 });
        c.battles += battles;
        c.wins += wins;
      }
    }
  }
  const minCoreBattles = Math.max(20, totalBattles * 0.02);
  const cores: CoreEntry[] = Object.values(coreAcc)
    .filter((c) => c.battles >= minCoreBattles)
    .sort((a, b) => a.size - b.size || b.battles - a.battles)
    .reduce<CoreEntry[]>((out, c) => {
      // keep top 10 per size
      if (out.filter((x) => x.size === c.size).length < 10) {
        out.push({
          members: c.members,
          size: c.size,
          battles: c.battles,
          winRate: +((100 * c.wins) / c.battles).toFixed(1),
        });
      }
      return out;
    }, []);

  return { format: CHAMPIONS_FORMAT, totalBattles, mons, topTeams, cores };
}

const data = snapshot as UsageData;

/** Usage for one species by display name, or null if it has no recorded games. */
export async function getMonUsage(name: string): Promise<MonUsage | null> {
  return data.mons[usageKey(name)] ?? null;
}

const allMons = (): MonUsage[] => Object.values(data.mons);

/** Top N Pokémon by raw usage %. */
export function topMeta(n = 30): MonUsage[] {
  return [...allMons()].sort((a, b) => b.usage - a.usage).slice(0, n);
}

/** Top N Pokémon by win rate, filtered to a minimum usage for sample size. */
export function topWinRate(n = 30, minUsage = 1): MonUsage[] {
  return allMons()
    .filter((m) => m.usage >= minUsage)
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, n);
}

/** Top exact teams, if the snapshot carries them (newer refreshes). */
export function getTopTeams(n = 10): TeamRank[] {
  return (data.topTeams ?? []).slice(0, n);
}

/**
 * Common cores of a given size. Uses the snapshot's precomputed cores when
 * present; otherwise falls back to deriving 2-cores from the pairwise teammate
 * graph so the homepage card is never empty.
 */
export function getCores(size: 2 | 3 | 4, n = 6): CoreEntry[] {
  const stored = (data.cores ?? []).filter((c) => c.size === size);
  if (stored.length) return stored.slice(0, n);
  if (size !== 2) return [];
  // Fallback: pair each mon with its strongest mutual teammate.
  const seen = new Set<string>();
  const pairs: CoreEntry[] = [];
  for (const m of allMons()) {
    const mk = usageKey(m.name);
    for (const t of m.teammates) {
      const key = [mk, t.key].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({
        members: [m.name, t.name],
        size: 2,
        battles: 0,
        winRate: 0,
      });
    }
  }
  // Rank by combined usage of the two members as a proxy.
  return pairs
    .sort((a, b) => {
      const usageOf = (c: CoreEntry) =>
        c.members.reduce((s, n) => s + (data.mons[usageKey(n)]?.usage ?? 0), 0);
      return usageOf(b) - usageOf(a);
    })
    .slice(0, n);
}
