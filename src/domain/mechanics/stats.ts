// Stat computation from base/IV/EV/level/nature. Provisional
// (ASSUMPTIONS.statFormula): uses the documented mainline stat formula as a
// placeholder until Champions mechanics are confirmed.

import type { BaseStats, Nature, StatKey } from "../types/pokemon";

function natureMultiplier(stat: StatKey, nature: Nature): number {
  if (stat === "hp") return 1;
  if (nature.boosted === nature.lowered) return 1; // neutral
  if (stat === nature.boosted) return 1.1;
  if (stat === nature.lowered) return 0.9;
  return 1;
}

/** Compute a single non-HP stat. */
export function computeStat(
  base: number,
  iv: number,
  ev: number,
  level: number,
  stat: StatKey,
  nature: Nature,
): number {
  const inner = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100);
  if (stat === "hp") {
    return inner + level + 10;
  }
  return Math.floor((inner + 5) * natureMultiplier(stat, nature));
}

/** Compute all six stats for a set. */
export function computeStats(
  base: BaseStats,
  ivs: BaseStats,
  evs: BaseStats,
  level: number,
  nature: Nature,
): BaseStats {
  const out = {} as BaseStats;
  (Object.keys(base) as StatKey[]).forEach((k) => {
    out[k] = computeStat(base[k], ivs[k], evs[k], level, k, nature);
  });
  return out;
}
