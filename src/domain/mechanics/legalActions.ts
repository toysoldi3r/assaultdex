// Legal-action generation for doubles. Phase 1 covers moves (with targets) and
// switches for both active user Pokémon, plus enumeration of the opponent's
// legal actions from known moves. Champions-specific actions (e.g. any
// mechanic gimmick) are deferred and not fabricated.

import type { BattleState, Combatant, SideState } from "../types/battle";

export type SlotIndex = 0 | 1;
export type Side = "user" | "opponent";

export interface MoveAction {
  kind: "move";
  side: Side;
  slot: SlotIndex;
  moveName: string;
  targetSide: Side;
  targetSlot: SlotIndex;
}

export interface SwitchAction {
  kind: "switch";
  side: Side;
  slot: SlotIndex;
  switchTo: string; // bench species slug
}

export type Action = MoveAction | SwitchAction;

/** One legal action per active slot on a side. */
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

/** All legal actions for a single active slot. */
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

  for (const move of combatant.moves) {
    if (move.category === "status") {
      // Provisional: status moves default to targeting self's slot.
      actions.push({
        kind: "move",
        side,
        slot,
        moveName: move.name,
        targetSide: side,
        targetSlot: slot,
      });
      continue;
    }
    for (const target of foeTargets) {
      actions.push({
        kind: "move",
        side,
        slot,
        moveName: move.name,
        targetSide: foe,
        targetSlot: target.slot,
      });
    }
  }

  for (const benched of sideState.bench) {
    if (!benched.fainted) {
      actions.push({ kind: "switch", side, slot, switchTo: benched.species });
    }
  }

  return actions;
}

/** Cartesian product of per-slot actions, dropping illegal combinations. */
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

/** The user's legal action combinations. */
export function userLegalCombinations(state: BattleState): ActionCombination[] {
  return legalCombinations(state, "user");
}

/** The opponent's legal action combinations from currently known moves. */
export function opponentLegalCombinations(
  state: BattleState,
): ActionCombination[] {
  return legalCombinations(state, "opponent");
}
