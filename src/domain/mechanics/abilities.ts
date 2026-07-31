// Ability effects (Phase: abilities/items/secondaries). A hand-coded registry of
// the common competitive abilities' documented mainline effects, applied as
// multipliers / immunities in the damage and speed engines. Provisional for
// Pokémon Champions like the rest of the mechanics (ASSUMPTIONS.abilityEffects).
//
// Only the mechanically-relevant, well-defined abilities are modeled; anything
// not listed simply has no effect (rather than a guessed one).

import type { Combatant, FieldState } from "../types/battle";
import type { MoveFixture, PokemonType } from "../types/pokemon";

export interface AbilityContext {
  attacker: Combatant;
  defender: Combatant;
  move: MoveFixture;
  moveType: PokemonType;
  field: FieldState;
  /** Type-effectiveness multiplier of the move on the defender. */
  effectiveness: number;
  isPhysical: boolean;
  attackerHpFraction: number;
  defenderAtFullHp: boolean;
}

function has(move: MoveFixture, flag: string): boolean {
  return move.flags?.includes(flag) ?? false;
}

/** Offensive damage multiplier from the ATTACKER's ability. */
export function abilityOffense(ctx: AbilityContext): number {
  const { attacker, move, moveType, isPhysical, field } = ctx;
  const stab = attacker.types.includes(moveType);
  const power = move.power ?? 0;
  switch (attacker.ability) {
    case "Adaptability":
      return stab ? 2 / 1.5 : 1; // total STAB 2.0 instead of 1.5
    case "Technician":
      return power > 0 && power <= 60 ? 1.5 : 1;
    case "Tough Claws":
      return has(move, "contact") ? 1.3 : 1;
    case "Iron Fist":
      return has(move, "punch") ? 1.2 : 1;
    case "Sharpness":
      return has(move, "slicing") ? 1.5 : 1;
    case "Punk Rock":
      return has(move, "sound") ? 1.3 : 1;
    case "Strong Jaw":
      return has(move, "bite") ? 1.5 : 1;
    case "Mega Launcher":
      return has(move, "pulse") ? 1.5 : 1;
    case "Sheer Force":
      return move.secondary ? 1.3 : 1;
    case "Huge Power":
    case "Pure Power":
      return isPhysical ? 2 : 1;
    case "Gorilla Tactics":
      return isPhysical ? 1.5 : 1;
    case "Guts":
      return isPhysical && attacker.status !== "none" ? 1.5 : 1;
    case "Transistor":
      return moveType === "electric" ? 1.5 : 1;
    case "Dragon's Maw":
      return moveType === "dragon" ? 1.5 : 1;
    case "Rocky Payload":
      return moveType === "rock" ? 1.5 : 1;
    case "Steelworker":
    case "Steely Spirit":
      return moveType === "steel" ? 1.5 : 1;
    case "Water Bubble":
      return moveType === "water" ? 2 : 1;
    case "Sand Force":
      return field.weather === "sand" &&
        (moveType === "rock" || moveType === "ground" || moveType === "steel")
        ? 1.3
        : 1;
    case "Overgrow":
      return moveType === "grass" && ctx.attackerHpFraction <= 1 / 3 ? 1.5 : 1;
    case "Blaze":
      return moveType === "fire" && ctx.attackerHpFraction <= 1 / 3 ? 1.5 : 1;
    case "Torrent":
      return moveType === "water" && ctx.attackerHpFraction <= 1 / 3 ? 1.5 : 1;
    case "Swarm":
      return moveType === "bug" && ctx.attackerHpFraction <= 1 / 3 ? 1.5 : 1;
    case "Analytic":
      return 1; // requires move-order context; omitted rather than guessed
    default:
      return 1;
  }
}

/** Defensive damage multiplier from the DEFENDER's ability. */
export function abilityDefense(ctx: AbilityContext): number {
  const { defender, move, moveType, isPhysical, effectiveness, defenderAtFullHp } = ctx;
  switch (defender.ability) {
    case "Thick Fat":
      return moveType === "fire" || moveType === "ice" ? 0.5 : 1;
    case "Heatproof":
    case "Water Bubble":
      return moveType === "fire" ? 0.5 : 1;
    case "Dry Skin":
      return moveType === "fire" ? 1.25 : 1;
    case "Multiscale":
    case "Shadow Shield":
      return defenderAtFullHp ? 0.5 : 1;
    case "Ice Scales":
      return !isPhysical ? 0.5 : 1;
    case "Fur Coat":
      return isPhysical ? 0.5 : 1;
    case "Fluffy":
      // Halves contact damage, doubles Fire damage.
      return (has(move, "contact") ? 0.5 : 1) * (moveType === "fire" ? 2 : 1);
    case "Filter":
    case "Solid Rock":
    case "Prism Armor":
      return effectiveness > 1 ? 0.75 : 1;
    case "Purifying Salt":
      return moveType === "ghost" ? 0.5 : 1;
    case "Marvel Scale":
      return isPhysical && defender.status !== "none" ? 2 / 3 : 1;
    default:
      return 1;
  }
}

/** True if the DEFENDER's ability makes it immune to this move. */
export function abilityImmune(ctx: AbilityContext): boolean {
  const { defender, move, moveType } = ctx;
  if (move.category === "status") return false;
  switch (defender.ability) {
    case "Levitate":
    case "Earth Eater":
      return moveType === "ground";
    case "Flash Fire":
    case "Well-Baked Body":
      return moveType === "fire";
    case "Water Absorb":
    case "Storm Drain":
    case "Dry Skin":
      return moveType === "water";
    case "Volt Absorb":
    case "Lightning Rod":
    case "Motor Drive":
      return moveType === "electric";
    case "Sap Sipper":
      return moveType === "grass";
    case "Bulletproof":
      return move.flags?.includes("bullet") ?? false;
    default:
      return false;
  }
}

/** Whether a combatant is grounded for terrain/Ground purposes. */
export function abilityUngrounds(ability: string | null): boolean {
  return ability === "Levitate";
}

/** Speed multiplier from a combatant's ability given the field. */
export function abilitySpeed(combatant: Combatant, field: FieldState): number {
  switch (combatant.ability) {
    case "Chlorophyll":
      return field.weather === "sun" ? 2 : 1;
    case "Swift Swim":
      return field.weather === "rain" ? 2 : 1;
    case "Sand Rush":
      return field.weather === "sand" ? 2 : 1;
    case "Slush Rush":
      return field.weather === "snow" ? 2 : 1;
    case "Surge Surfer":
      return field.terrain === "electric" ? 2 : 1;
    case "Quick Feet":
      return combatant.status !== "none" ? 1.5 : 1;
    default:
      return 1;
  }
}
