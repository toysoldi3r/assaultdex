// Stochastic turn transition for simulations (Phase 8). Applies both sides'
// move actions with random damage rolls and accuracy checks. Pure given the RNG;
// clones the input so originals never mutate. Provisional (same mechanics as the
// damage engine).

import { calculateDamage } from "../mechanics/damage";
import { effectiveSpeed } from "../mechanics/speed";
import type { ActionCombination } from "../mechanics/legalActions";
import type { BattleState, Combatant } from "../types/battle";

/** Deterministic PRNG (mulberry32) so simulations are reproducible by seed. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TurnResult {
  state: BattleState;
  faints: number;
  /** Damaging user hits that connected / that were attempted. */
  userLanded: number;
  userAttempts: number;
}

function sideConditions(state: BattleState, side: "user" | "opponent") {
  return (side === "user" ? state.user : state.opponent).conditions;
}

/** Resolve one turn from both combos with random rolls and accuracy. */
export function applyTurn(
  state: BattleState,
  userCombo: ActionCombination,
  oppCombo: ActionCombination,
  rng: () => number,
): TurnResult {
  const next = structuredClone(state);
  let faints = 0;
  let userLanded = 0;
  let userAttempts = 0;

  interface Exec {
    side: "user" | "opponent";
    attacker: Combatant;
    move: Combatant["moves"][number];
    spread: boolean;
    targetSlot: 0 | 1 | null;
    priority: number;
    speed: number;
    /** Stable random key so speed ties break fairly without an rng-in-sort. */
    tiebreak: number;
  }

  const execs: Exec[] = [];
  for (const combo of [userCombo, oppCombo]) {
    for (const action of combo) {
      if (action.kind !== "move") continue;
      if (action.targetSide === action.side) continue;
      const attacker = (action.side === "user" ? next.user : next.opponent)
        .active[action.slot];
      if (!attacker) continue;
      const move = attacker.moves.find((m) => m.name === action.moveName);
      if (!move || move.category === "status" || move.power === null) continue;
      execs.push({
        side: action.side,
        attacker,
        move,
        spread: action.spread || action.targetSlot === null,
        targetSlot: action.targetSlot,
        priority: move.priority,
        speed: effectiveSpeed(attacker, {
          tailwind: sideConditions(next, action.side).tailwind,
          field: next.field,
        }).effectiveSpeed,
        tiebreak: rng(),
      });
    }
  }

  // Priority, then Speed, then a stable random tiebreak. Using a precomputed key
  // (not rng() inside the comparator) keeps the comparator consistent.
  execs.sort(
    (a, b) => b.priority - a.priority || b.speed - a.speed || a.tiebreak - b.tiebreak,
  );

  const flinched = new Set<Combatant>();

  for (const exec of execs) {
    if (exec.attacker.fainted) continue;
    if (flinched.has(exec.attacker)) continue; // flinched: loses its action
    const foeSide = exec.side === "user" ? "opponent" : "user";
    const foeActive = (foeSide === "user" ? next.user : next.opponent).active;
    const targets = exec.spread
      ? foeActive.filter((c): c is Combatant => c !== null && !c.fainted)
      : [exec.targetSlot !== null ? foeActive[exec.targetSlot] : null].filter(
          (c): c is Combatant => c !== null && !c.fainted,
        );

    let landedAny = false;
    for (const target of targets) {
      if (target.fainted) continue;
      const dmg = calculateDamage(exec.attacker, target, exec.move, next.field, {
        spread: exec.move.target !== "normal",
        defenderConditions: sideConditions(next, foeSide),
        fast: true, // only the rolls are used here
      });
      if (exec.side === "user") userAttempts++;

      const accFrac = exec.move.accuracy === null ? 1 : exec.move.accuracy / 100;
      if (rng() >= accFrac) continue; // missed
      if (exec.side === "user") userLanded++;
      landedAny = true;

      const roll = dmg.rolls[Math.floor(rng() * dmg.rolls.length)] ?? 0;
      const preHp = target.currentHp;
      let newHp = Math.max(0, preHp - roll);
      // Focus Sash: survive a would-be KO from full HP with 1 HP (once).
      if (newHp === 0 && target.item === "Focus Sash" && preHp === target.stats.hp) {
        newHp = 1;
        target.item = null;
      }
      target.currentHp = newHp;
      if (target.currentHp <= 0 && !target.fainted) {
        target.fainted = true;
        faints++;
      }

      // Reactive held items (once, on a surviving target).
      if (!target.fainted) {
        // Weakness Policy: hit super-effectively → +2 Atk / +2 SpA.
        if (target.item === "Weakness Policy" && dmg.effectiveness.multiplier > 1) {
          applyBoosts(target, { atk: 2, spa: 2 });
          target.item = null;
        } else if (
          // Sitrus Berry: heal 25% max HP when at or below half.
          target.item === "Sitrus Berry" &&
          target.currentHp <= target.stats.hp / 2
        ) {
          target.currentHp = Math.min(
            target.stats.hp,
            target.currentHp + Math.floor(target.stats.hp / 4),
          );
          target.item = null;
        }
      }

      // Secondary effect (status / flinch / target stat drop), by chance.
      const sec = exec.move.secondary;
      if (sec && !target.fainted && rng() < sec.chance / 100) {
        if (sec.status && target.status === "none") target.status = sec.status;
        if (sec.flinch) flinched.add(target);
        if (sec.boosts) applyBoosts(target, sec.boosts);
      }
    }

    // Self stat changes (Close Combat −Def/−SpD, Draco Meteor −SpA) apply once.
    if (landedAny && exec.move.selfBoosts) {
      applyBoosts(exec.attacker, exec.move.selfBoosts);
    }
  }

  next.turn += 1;
  return { state: next, faints, userLanded, userAttempts };
}

/** Apply stat-stage changes to a combatant, clamped to ±6. */
function applyBoosts(
  combatant: Combatant,
  boosts: Partial<Record<keyof Combatant["stages"], number>>,
): void {
  for (const [key, delta] of Object.entries(boosts) as [
    keyof Combatant["stages"],
    number,
  ][]) {
    const next = Math.max(-6, Math.min(6, combatant.stages[key] + delta));
    combatant.stages[key] = next;
  }
}

export function activeCount(state: BattleState, side: "user" | "opponent"): number {
  return (side === "user" ? state.user : state.opponent).active.filter(
    (c): c is Combatant => c !== null && !c.fainted,
  ).length;
}
