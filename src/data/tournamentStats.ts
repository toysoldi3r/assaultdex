// Tournament usage (Limitless TCG) for the Champions format. Same privacy model
// as usageStats: served from a committed snapshot only, refreshed out of band in
// CI (scripts/refreshTournaments.ts) — the app makes no external call. Open team
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

/** Whether the snapshot has been populated by a CI refresh yet. */
export function hasTournamentData(): boolean {
  return data.teams > 0;
}

export function tournamentMeta(): { label: string; teams: number; tournaments: number; updated: string } {
  return {
    label: data.label,
    teams: data.teams,
    tournaments: data.tournaments,
    updated: data.updated,
  };
}

/** Tournament usage for one species by display name, or null. */
export function getMonTournament(name: string): TournMon | null {
  return data.mons[usageKey(name)] ?? null;
}
