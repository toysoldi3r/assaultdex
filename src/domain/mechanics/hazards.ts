// Entry-hazard mechanics (Stealth Rock, Spikes, Toxic Spikes, Sticky Web).
// A Pokémon takes these when it switches in on the side the hazards are set on.
// Pure and mainline-derived, provisional for Champions (ASSUMPTIONS.hazards).

import type { Combatant, FieldState, SideConditions, StatusCondition } from "../types/battle";
import type { PokemonType } from "../types/pokemon";
import { isGrounded } from "./field";
import { typeEffectiveness } from "./typeEffectiveness";

const SPIKES_FRACTION = [0, 1 / 8, 1 / 6, 1 / 4];

/** True if a Pokémon is grounded for hazard purposes (Gravity grounds all). */
export function hazardGrounded(
  types: readonly PokemonType[],
  ability: string | null,
  field: FieldState,
): boolean {
  if (field.gravity) return true;
  if (ability === "Levitate") return false;
  return isGrounded(types);
}

export interface HazardEntry {
  /** Fraction of max HP lost on entry (0–…; can exceed 0.25 with 4× Stealth Rock). */
  hpFraction: number;
  /** Speed stages dropped on entry (Sticky Web). */
  speedDrop: number;
  /** Status inflicted on entry (Toxic Spikes), or "none". */
  status: StatusCondition;
  /** Human-readable parts, e.g. ["Stealth Rock −25%", "Sticky Web −1 Spe"]. */
  notes: string[];
}

/**
 * Compute what a Pokémon takes when switching in against `side`'s hazards.
 * Heavy-Duty Boots grant full immunity; Magic Guard ignores the chip damage.
 */
export function hazardEntry(
  combatant: Combatant,
  side: SideConditions,
  field: FieldState,
): HazardEntry {
  const empty: HazardEntry = { hpFraction: 0, speedDrop: 0, status: "none", notes: [] };
  if (combatant.item === "Heavy-Duty Boots") return empty;

  const grounded = hazardGrounded(combatant.types, combatant.ability, field);
  const magicGuard = combatant.ability === "Magic Guard";
  const notes: string[] = [];
  let hpFraction = 0;
  let speedDrop = 0;
  let status: StatusCondition = "none";

  // Stealth Rock: 1/8 scaled by Rock effectiveness; not grounding-dependent.
  if (side.stealthRock) {
    const eff = typeEffectiveness("rock", combatant.types).multiplier;
    const frac = 0.125 * eff;
    if (!magicGuard && frac > 0) {
      hpFraction += frac;
      notes.push(`Stealth Rock −${Math.round(frac * 100)}%`);
    }
  }

  // Spikes: grounded only.
  const spikes = side.spikes ?? 0;
  if (grounded && spikes > 0) {
    const frac = SPIKES_FRACTION[Math.min(3, spikes)]!;
    if (!magicGuard) {
      hpFraction += frac;
      notes.push(`Spikes −${Math.round(frac * 100)}%`);
    }
  }

  // Toxic Spikes: grounded, not immune. Poison types absorb (no effect here);
  // Steel/Flying/Levitate are immune via grounding or type.
  const tSpikes = side.toxicSpikes ?? 0;
  if (grounded && tSpikes > 0) {
    const isPoison = combatant.types.includes("poison");
    const isSteel = combatant.types.includes("steel");
    if (!isPoison && !isSteel) {
      status = tSpikes >= 2 ? "toxic" : "poison";
      notes.push(tSpikes >= 2 ? "Toxic Spikes → badly poisoned" : "Toxic Spikes → poisoned");
    }
  }

  // Sticky Web: grounded → −1 Speed.
  if (grounded && side.stickyWeb) {
    speedDrop = 1;
    notes.push("Sticky Web −1 Spe");
  }

  return { hpFraction, speedDrop, status, notes };
}

/** True when the side has any entry hazard set. */
export function hasHazards(side: SideConditions): boolean {
  return Boolean(side.stealthRock || side.spikes || side.toxicSpikes || side.stickyWeb);
}
