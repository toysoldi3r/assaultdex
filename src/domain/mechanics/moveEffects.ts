// Human-readable descriptions of a move's mechanical effects (stat overrides,
// multi-hit, and secondary/self stat/status/flinch effects). Pure formatting of
// MoveFixture data — no I/O. Used to surface move effects in the UI.

import type { MoveFixture, StageStatKey } from "../types/pokemon";

const STAT_LABEL: Record<StageStatKey, string> = {
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

const STATUS_LABEL: Record<string, string> = {
  burn: "burn",
  paralysis: "paralysis",
  poison: "poison",
  toxic: "badly poison",
  sleep: "sleep",
  freeze: "freeze",
};

function signed(n: number): string {
  return `${n > 0 ? "+" : "−"}${Math.abs(n)}`;
}

/** Format a stat-boost map like { spa: -2, atk: 1 } → "−2 SpA, +1 Atk". */
function boostText(boosts: Partial<Record<StageStatKey, number>>): string {
  return (Object.entries(boosts) as [StageStatKey, number][])
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => `${signed(v)} ${STAT_LABEL[k]}`)
    .join(", ");
}

/**
 * Short effect chips for a move (empty when the move has no special mechanics).
 * Order: stat mechanics first, then multi-hit, then the target secondary, then
 * self effects.
 */
export function describeMoveEffects(move: MoveFixture): string[] {
  const out: string[] = [];

  if (move.overrideOffensiveStat) {
    out.push(`Uses ${STAT_LABEL[move.overrideOffensiveStat]} to attack`);
  }
  if (move.useTargetOffense) {
    out.push("Uses target's Attack");
  }
  if (move.overrideDefensiveStat) {
    out.push(`Hits ${STAT_LABEL[move.overrideDefensiveStat]}`);
  }
  if (move.hits && move.hits > 1) {
    out.push(`Hits ${move.hits}×`);
  }

  const sec = move.secondary;
  if (sec) {
    const parts: string[] = [];
    if (sec.status && STATUS_LABEL[sec.status]) parts.push(STATUS_LABEL[sec.status]!);
    if (sec.flinch) parts.push("flinch");
    if (sec.boosts) {
      const b = boostText(sec.boosts);
      if (b) parts.push(b);
    }
    if (parts.length > 0) out.push(`${sec.chance}% ${parts.join(" + ")}`);
  }

  if (move.selfBoosts) {
    const b = boostText(move.selfBoosts);
    if (b) out.push(`${b} (self)`);
  }

  return out;
}
