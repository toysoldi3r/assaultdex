// Effective speed and move-order resolution. Provisional
// (ASSUMPTIONS.speedOrder). Includes priority brackets, paralysis, stat stages,
// Trick Room, and honest speed-tie handling (50/50, never a fabricated winner).

import type { Combatant, FieldState } from "../types/battle";
import type { AssumptionId } from "./assumptions";

/** Multiplier for a stat stage (-6..+6). */
export function stageMultiplier(stage: number): number {
  const s = Math.max(-6, Math.min(6, stage));
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}

export interface SpeedResult {
  effectiveSpeed: number;
  assumptions: AssumptionId[];
}

/** Effective in-battle Speed for a combatant. */
export function effectiveSpeed(combatant: Combatant): SpeedResult {
  let speed = combatant.stats.spe * stageMultiplier(combatant.stages.spe);
  if (combatant.status === "paralysis") {
    speed *= 0.5; // provisional mainline paralysis modifier
  }
  return {
    effectiveSpeed: Math.floor(speed),
    assumptions: ["speedOrder", "statFormula"],
  };
}

export type OrderWinner = "a" | "b" | "tie";

export interface OrderResult {
  first: OrderWinner;
  /** Probability that A moves first (0.5 on a true speed tie). */
  probabilityAFirst: number;
  assumptions: AssumptionId[];
}

/**
 * Resolve which of two actions moves first from priority then effective speed.
 * Trick Room reverses the speed comparison (not the priority comparison).
 */
export function moveOrder(
  a: { speed: number; priority: number },
  b: { speed: number; priority: number },
  field: FieldState,
): OrderResult {
  const assumptions: AssumptionId[] = ["speedOrder"];
  if (a.priority !== b.priority) {
    const aFirst = a.priority > b.priority;
    return {
      first: aFirst ? "a" : "b",
      probabilityAFirst: aFirst ? 1 : 0,
      assumptions,
    };
  }
  if (a.speed === b.speed) {
    return { first: "tie", probabilityAFirst: 0.5, assumptions };
  }
  const aFasterWins = field.trickRoom ? a.speed < b.speed : a.speed > b.speed;
  return {
    first: aFasterWins ? "a" : "b",
    probabilityAFirst: aFasterWins ? 1 : 0,
    assumptions,
  };
}
