// Base-stat bar colour + width. Six discrete tiers keyed to real stat breakpoints
// (top of the scale is 255 — Blissey's HP). Shared by the Pokédex, teambuilder,
// and team-analysis stat bars so colours mean the same thing everywhere.
//
//   <=29 red · <=59 orange · <=89 yellow · <=119 green · <=149 dark green · <=255 blue

/** Max base stat in the games (Blissey HP). Bars scale against this. */
export const STAT_MAX = 255;

/** Colour for a base-stat value, in six tiers. */
export function statColor(v: number): string {
  if (v <= 29) return "#ef4444"; // red
  if (v <= 59) return "#f97316"; // orange
  if (v <= 89) return "#eab308"; // yellow
  if (v <= 119) return "#22c55e"; // green
  if (v <= 149) return "#15803d"; // dark green
  return "#3b82f6"; // blue
}

/** Bar fill percentage (0..100) for a stat value against the 255 scale. */
export function statBarPct(v: number): number {
  return Math.max(0, Math.min(100, (v / STAT_MAX) * 100));
}
