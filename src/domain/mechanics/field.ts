// Field-state mechanics: grounding and weather/terrain damage multipliers.
// All provisional (mainline-derived), flagged via the assumptions registry.

import type { FieldState } from "../types/battle";
import type { PokemonType } from "../types/pokemon";

/**
 * Grounded unless Flying-type. Item/ability grounding (Air Balloon, Levitate,
 * Iron Ball, Roost) is not modeled in Phase 3 (ASSUMPTIONS.grounding).
 */
export function isGrounded(
  types: readonly PokemonType[],
): boolean {
  return !types.includes("flying");
}

/** Weather multiplier on a move's type (sun/rain only). */
export function weatherMultiplier(
  moveType: PokemonType,
  weather: FieldState["weather"],
): number {
  if (weather === "sun") {
    if (moveType === "fire") return 1.5;
    if (moveType === "water") return 0.5;
  } else if (weather === "rain") {
    if (moveType === "water") return 1.5;
    if (moveType === "fire") return 0.5;
  }
  return 1;
}

/** Terrain multiplier, given who is grounded. */
export function terrainMultiplier(
  moveType: PokemonType,
  terrain: FieldState["terrain"],
  attackerGrounded: boolean,
  defenderGrounded: boolean,
): number {
  switch (terrain) {
    case "electric":
      return attackerGrounded && moveType === "electric" ? 1.3 : 1;
    case "grassy":
      return attackerGrounded && moveType === "grass" ? 1.3 : 1;
    case "psychic":
      return attackerGrounded && moveType === "psychic" ? 1.3 : 1;
    case "misty":
      return defenderGrounded && moveType === "dragon" ? 0.5 : 1;
    default:
      return 1;
  }
}
