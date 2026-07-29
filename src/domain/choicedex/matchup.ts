// Matchup matrix (Phase 7). For each of the user's Pokémon against each opponent
// Pokémon, the best single-target offensive result and speed relationship. Pure
// and provisional. (Matrices against "common" Pokémon/cores are deferred with
// the statistics phase; the caller supplies the opponent set — e.g. a saved
// opponent team.)

import type { AssumptionId } from "../mechanics/assumptions";
import { calculateDamage } from "../mechanics/damage";
import { effectiveSpeed } from "../mechanics/speed";
import type { Combatant, FieldState } from "../types/battle";

export interface MatchupCell {
  attacker: string;
  defender: string;
  bestMove: string | null;
  expectedPercent: number;
  ohkoProbability: number;
  /** Attacker outspeeds the defender (no field speed effects assumed). */
  outspeeds: boolean;
}

export interface MatchupMatrix {
  attackers: string[];
  defenders: string[];
  cells: MatchupCell[][]; // [attackerIndex][defenderIndex]
  assumptions: AssumptionId[];
}

function bestOffense(
  attacker: Combatant,
  defender: Combatant,
  field: FieldState,
): { move: string | null; expectedPercent: number; ohko: number } {
  let best = { move: null as string | null, expectedPercent: -1, ohko: 0 };
  for (const move of attacker.moves) {
    if (move.category === "status" || move.power === null) continue;
    // Single-target evaluation for the matrix.
    const dmg = calculateDamage(attacker, defender, move, field, { spread: false });
    if (dmg.expectedPercent > best.expectedPercent) {
      best = {
        move: move.name,
        expectedPercent: dmg.expectedPercent,
        ohko: dmg.ohkoProbability,
      };
    }
  }
  // A move that deals no damage (immune matchup) is not a meaningful "best".
  if (best.move === null || best.expectedPercent <= 0) {
    return { move: null, expectedPercent: 0, ohko: 0 };
  }
  return best;
}

export function buildMatchupMatrix(
  attackers: Combatant[],
  defenders: Combatant[],
  field: FieldState,
): MatchupMatrix {
  const cells: MatchupCell[][] = attackers.map((atk) =>
    defenders.map((def) => {
      const off = bestOffense(atk, def, field);
      const outspeeds =
        effectiveSpeed(atk).effectiveSpeed > effectiveSpeed(def).effectiveSpeed;
      return {
        attacker: atk.name,
        defender: def.name,
        bestMove: off.move,
        expectedPercent: off.expectedPercent,
        ohkoProbability: off.ohko,
        outspeeds,
      };
    }),
  );
  return {
    attackers: attackers.map((a) => a.name),
    defenders: defenders.map((d) => d.name),
    cells,
    assumptions: ["damageFormula", "statFormula", "typeChart", "speedOrder"],
  };
}
