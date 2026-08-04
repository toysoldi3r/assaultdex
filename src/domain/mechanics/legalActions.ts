// Legal-action generation for doubles, target-aware (Phase 3). Uses each move's
// target semantics: single-target moves enumerate legal targets, spread moves
// produce one action that hits all relevant Pokémon, and self/ally moves target
// the user's own side. Also generates opponent legal actions from known moves.

import type { BattleState, Combatant, SideState } from "../types/battle";
import { isSpreadTarget } from "../types/pokemon";

export type SlotIndex = 0 | 1;
export type Side = "user" | "opponent";

export interface MoveAction {
  kind: "move";
  side: Side;
  slot: SlotIndex;
  moveName: string;
  /** Side of the primary target. For spread moves this is the foe side. */
  targetSide: Side;
  /** Target slot, or null for spread moves (hits all relevant Pokémon). */
  targetSlot: SlotIndex | null;
  spread: boolean;
}

export interface SwitchAction {
  kind: "switch";
  side: Side;
  slot: SlotIndex;
  switchTo: string; // bench species slug
}

export type Action = MoveAction | SwitchAction;
export type ActionCombination = Action[];

function activeCombatants(
  side: SideState,
): { combatant: Combatant; slot: SlotIndex }[] {
  const out: { combatant: Combatant; slot: SlotIndex }[] = [];
  side.active.forEach((c, i) => {
    if (c && !c.fainted) out.push({ combatant: c, slot: i as SlotIndex });
  });
  return out;
}

function opposing(side: Side): Side {
  return side === "user" ? "opponent" : "user";
}

export function slotActions(
  state: BattleState,
  side: Side,
  slot: SlotIndex,
): Action[] {
  const sideState = side === "user" ? state.user : state.opponent;
  const combatant = sideState.active[slot];
  if (!combatant || combatant.fainted) return [];

  const actions: Action[] = [];
  const foe = opposing(side);
  const foeState = foe === "user" ? state.user : state.opponent;
  const foeTargets = activeCombatants(foeState);
  const allySlot = (slot === 0 ? 1 : 0) as SlotIndex;
  const allyPresent = Boolean(
    sideState.active[allySlot] && !sideState.active[allySlot]!.fainted,
  );

  for (const move of combatant.moves) {
    const base = { kind: "move" as const, side, slot, moveName: move.name };

    switch (move.target) {
      case "self":
        actions.push({ ...base, targetSide: side, targetSlot: slot, spread: false });
        break;
      case "ally":
        actions.push({
          ...base,
          targetSide: side,
          targetSlot: allyPresent ? allySlot : slot,
          spread: false,
        });
        break;
      case "all-adjacent-foes":
      case "all-adjacent":
        actions.push({ ...base, targetSide: foe, targetSlot: null, spread: true });
        break;
      case "normal":
      default:
        if (foeTargets.length === 0) break;
        for (const target of foeTargets) {
          actions.push({
            ...base,
            targetSide: foe,
            targetSlot: target.slot,
            spread: isSpreadTarget(move.target),
          });
        }
        break;
    }
  }

  for (const benched of sideState.bench) {
    if (!benched.fainted) {
      actions.push({ kind: "switch", side, slot, switchTo: benched.species });
    }
  }

  return actions;
}

export function legalCombinations(
  state: BattleState,
  side: Side,
): ActionCombination[] {
  const sideState = side === "user" ? state.user : state.opponent;
  const active = activeCombatants(sideState);
  if (active.length === 0) return [];

  const perSlot = active.map(({ slot }) => slotActions(state, side, slot));

  let combos: ActionCombination[] = [[]];
  for (const options of perSlot) {
    const next: ActionCombination[] = [];
    for (const combo of combos) {
      for (const option of options) {
        next.push([...combo, option]);
      }
    }
    combos = next;
  }

  // Two active Pokémon cannot switch into the same benched Pokémon.
  return combos.filter((combo) => {
    const switchTargets = combo
      .filter((a): a is SwitchAction => a.kind === "switch")
      .map((a) => a.switchTo);
    return new Set(switchTargets).size === switchTargets.length;
  });
}

export function userLegalCombinations(state: BattleState): ActionCombination[] {
  return legalCombinations(state, "user");
}
