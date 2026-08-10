// Tournament usage (Limitless TCG) for the Champions format. Same privacy model
// as usageStats: served from a committed snapshot only, refreshed out of band in
// CI (scripts/refreshTournaments.ts) - the app makes no external call. Open team
// sheets carry item/ability/tera/nature/moves but no EV spreads, so there is no
// spread data here.

import snapshot from "./fixtures/usage/tournaments-gen9championsvgc2026regmbbo3.json";
import { usageKey } from "./usageStats";

export interface TournEntry {
  name: string;
  pct: number;
}

export interface TournMon {
  name: string;
  usage: number;
  items: TournEntry[];
  abilities: TournEntry[];
  moves: TournEntry[];
  tera: TournEntry[];
  natures: TournEntry[];
}

export interface TournData {
  format: string;
  label: string;
  source: string;
  tournaments: number;
  teams: number;
  updated: string;
  mons: Record<string, TournMon>;
}

const data = snapshot as TournData;

/** Tournament usage for one species by display name, or null. */
export function getMonTournament(name: string): TournMon | null {
  return data.mons[usageKey(name)] ?? null;
}

/** True when the committed tournament snapshot actually carries data. */
export function hasTournamentData(): boolean {
  return Object.keys(data.mons).length > 0;
}

export interface ItemHolder {
  /** Display name of the Pokémon that holds the item. */
  name: string;
  /** That Pokémon's overall tournament usage (%). */
  monUsage: number;
  /** Share of that Pokémon's sets that run this item (%). */
  pct: number;
}

/**
 * Champions Pokémon that commonly hold a given item, inverted from the per-mon
 * tournament snapshot. Ranked by prominence (mon usage × item share), so the
 * top entries are the Pokémon most of the metagame actually runs it on. Empty
 * until the snapshot is populated in CI.
 */
export function itemHolders(itemName: string): ItemHolder[] {
  const key = usageKey(itemName);
  const out: ItemHolder[] = [];
  for (const m of Object.values(data.mons)) {
    const e = m.items.find((x) => usageKey(x.name) === key);
    if (e) out.push({ name: m.name, monUsage: m.usage, pct: e.pct });
  }
  return out.sort((a, b) => b.monUsage * b.pct - a.monUsage * a.pct);
}
