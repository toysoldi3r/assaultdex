// Effective speed and move-order resolution. Provisional
// (ASSUMPTIONS.speedOrder). Includes priority brackets, paralysis, stat stages,
// Trick Room, and honest speed-tie handling (50/50, never a fabricated winner).

import type { Combatant, FieldState } from "../types/battle";
import { DEFAULT_FIELD } from "../types/battle";
import type { AssumptionId } from "./assumptions";
import { abilitySpeed } from "./abilities";
import { itemSpeed } from "./items";

/** Multiplier for a stat stage (-6..+6). */
export function stageMultiplier(stage: number): number {
  const s = Math.max(-6, Math.min(6, stage));
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}

/** Round half down, as the mainline engine does (poke-round). */
function pokeRound(n: number): number {
  return n - Math.floor(n) > 0.5 ? Math.ceil(n) : Math.floor(n);
}

export interface SpeedResult {
  effectiveSpeed: number;
  assumptions: AssumptionId[];
}

export interface SpeedContext {
  /** The combatant's side has Tailwind up. */
  tailwind?: boolean;
  /** Field (for weather/terrain speed abilities). */
  field?: FieldState;
}

/** Effective in-battle Speed for a combatant. */
export function effectiveSpeed(
  combatant: Combatant,
  ctx: SpeedContext = {},
): SpeedResult {
  const assumptions: AssumptionId[] = ["speedOrder", "statFormula"];
  // Boosted Speed is floored before the multipliers, matching the game (a
  // fractional boosted stat truncates rather than carrying into the modifiers).
  let speed = Math.floor(combatant.stats.spe * stageMultiplier(combatant.stages.spe));

  // Speed multipliers (Tailwind, Choice Scarf, Iron Ball, weather/terrain
  // abilities) are chained and applied together with a single poke-round.
  let mod = 1;
  if (ctx.tailwind) {
    mod *= 2;
    assumptions.push("tailwind");
  }
  const item = itemSpeed(combatant);
  if (item !== 1) {
    mod *= item;
    assumptions.push("itemEffects");
  }
  const ability = abilitySpeed(combatant, ctx.field ?? DEFAULT_FIELD);
  if (ability !== 1) {
    mod *= ability;
    assumptions.push("abilityEffects");
  }
  if (mod !== 1) speed = pokeRound(speed * mod);

  // Paralysis is applied last, floored on its own. Quick Feet ignores the
  // paralysis Speed drop (and grants its 1.5x boost via abilitySpeed above),
  // so the two must not stack into a net 0.75x.
  if (combatant.status === "paralysis" && combatant.ability !== "Quick Feet") {
    speed = Math.floor(speed * 0.5); // provisional mainline paralysis modifier
  }

  return { effectiveSpeed: speed, assumptions };
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
