// ChoiceDex recommendation engine (Phase 1, deterministic single turn).
//
// Ranks complete user action combinations. Each recommendation exposes both
// user actions, damage/KO/survival probabilities, expected position, main
// risk, assumptions, confidence, an alternative, and a plain-language
// explanation (spec). Nothing uncertain is described as guaranteed.

import type { AssumptionId } from "../mechanics/assumptions";
import { calculateDamage, type DamageResult } from "../mechanics/damage";
import { describeMoveEffects } from "../mechanics/moveEffects";
import {
  legalCombinations,
  type Action,
  type ActionCombination,
} from "../mechanics/legalActions";
import { effectiveSpeed, moveOrder } from "../mechanics/speed";
import type { BattleState, Combatant } from "../types/battle";
import {
  PROFILE_LABELS,
  PROFILE_WEIGHTS,
  scoreFactors,
  type ProfileName,
  type ScoreBreakdown,
  type ScoreFactorName,
} from "./scoring";

/** Damage evaluated for a single move action within a combination. */
export interface ActionDamage {
  attacker: string;
  moveName: string;
  target: string;
  /** The target's current HP (for combined multi-hit KO math). */
  targetHp: number;
  damage: DamageResult;
  /** Attacker moves before the target this turn. */
  movesFirst: boolean;
  /** Human-readable move-effect chips (secondaries, self drops, multi-hit, …). */
  effects: string[];
}

export interface Recommendation {
  combination: ActionCombination;
  /** Human-readable action lines, one per slot. */
  actionLines: string[];
  breakdown: ScoreBreakdown;
  damage: ActionDamage[];
  koProbability: number;
  survivalProbability: number;
  expectedPosition: string;
  mainRisk: string;
  assumptions: AssumptionId[];
  /** 0..1. Capped below 1 while mechanics are provisional. */
  confidence: number;
  explanation: string;
}

/** Confidence ceiling while Champions mechanics are unverified. */
const PROVISIONAL_CONFIDENCE_CAP = 0.6;

function sideOf(state: BattleState, side: "user" | "opponent") {
  return side === "user" ? state.user : state.opponent;
}

function activeAt(
  state: BattleState,
  side: "user" | "opponent",
  slot: 0 | 1,
): Combatant | null {
  return sideOf(state, side).active[slot];
}

function sideConditions(state: BattleState, side: "user" | "opponent") {
  return sideOf(state, side).conditions;
}

function activeFoes(state: BattleState, foe: "user" | "opponent"): Combatant[] {
  return sideOf(state, foe).active.filter(
    (c): c is Combatant => c !== null && !c.fainted,
  );
}

function describeAction(state: BattleState, action: Action): string {
  const attacker = activeAt(state, action.side, action.slot);
  const who = attacker?.name ?? `Slot ${action.slot + 1}`;
  if (action.kind === "switch") {
    return `${who}: switch to ${action.switchTo}`;
  }
  if (action.spread || action.targetSlot === null) {
    return `${who}: ${action.moveName} → both foes`;
  }
  const target = activeAt(state, action.targetSide, action.targetSlot);
  return `${who}: ${action.moveName} → ${target?.name ?? "target"}`;
}

/** Human-readable labels for a combination (cheap — no damage evaluation). */
export function describeCombination(
  state: BattleState,
  combination: ActionCombination,
): string[] {
  return combination.map((a) => describeAction(state, a));
}

function opponentInfoCompleteness(state: BattleState): number {
  const actives = state.opponent.active.filter(
    (c): c is Combatant => c !== null && !c.fainted,
  );
  if (actives.length === 0) return 1;
  const known = actives.filter(
    (c) => c.tier === "confirmed" || c.tier === "entered",
  ).length;
  return known / actives.length;
}

/** Probability a target is KO'd by the combined hits it receives this turn. */
function targetKoProbability(hitRolls: number[][], hp: number): number {
  if (hitRolls.length === 0) return 0;
  if (hitRolls.length === 1) {
    const rolls = hitRolls[0]!;
    return rolls.filter((d) => d >= hp).length / rolls.length;
  }
  if (hitRolls.length === 2) {
    const [a, b] = hitRolls as [number[], number[]];
    let ko = 0;
    for (const x of a) for (const y of b) if (x + y >= hp) ko++;
    return ko / (a.length * b.length);
  }
  // >2 hits (not reachable in 2v2 doubles): combine as independent single hits.
  return (
    1 -
    hitRolls.reduce(
      (s, r) => s * (1 - r.filter((d) => d >= hp).length / r.length),
      1,
    )
  );
}

/** Evaluate one user combination into a full Recommendation. */
export function evaluateCombination(
  state: BattleState,
  combination: ActionCombination,
  profile: ProfileName,
): Recommendation {
  const actionDamage: ActionDamage[] = [];
  const assumptions = new Set<AssumptionId>();

  for (const action of combination) {
    if (action.kind !== "move") continue;
    const attacker = activeAt(state, action.side, action.slot);
    if (!attacker) continue;
    const move = attacker.moves.find((m) => m.name === action.moveName);
    if (!move) continue;
    // Only offensive moves against the foe side contribute damage factors.
    if (move.category === "status" || move.power === null) continue;
    if (action.targetSide === action.side) continue;

    const foe = action.targetSide;
    const targets =
      action.spread || action.targetSlot === null
        ? activeFoes(state, foe)
        : [activeAt(state, foe, action.targetSlot)].filter(
            (c): c is Combatant => c !== null && !c.fainted,
          );

    const aSpeed = effectiveSpeed(attacker, {
      tailwind: sideConditions(state, action.side).tailwind,
      field: state.field,
    });
    aSpeed.assumptions.forEach((a) => assumptions.add(a));

    for (const target of targets) {
      const damage = calculateDamage(attacker, target, move, state.field, {
        spread: action.spread,
        defenderConditions: sideConditions(state, foe),
      });
      damage.assumptions.forEach((a) => assumptions.add(a));

      const tSpeed = effectiveSpeed(target, {
        tailwind: sideConditions(state, foe).tailwind,
        field: state.field,
      });
      const order = moveOrder(
        { speed: aSpeed.effectiveSpeed, priority: move.priority },
        { speed: tSpeed.effectiveSpeed, priority: 0 },
        state.field,
      );

      if (move.secondary) assumptions.add("secondaryEffects");
      actionDamage.push({
        attacker: attacker.name,
        moveName: move.name,
        target: target.name,
        targetHp: target.currentHp,
        damage,
        movesFirst: order.probabilityAFirst >= 0.5,
        effects: describeMoveEffects(move),
      });
    }
  }

  // ---- Factors ------------------------------------------------------------
  const expectedDamageRaw = actionDamage.reduce(
    (a, d) => a + d.damage.expectedPercent,
    0,
  );
  // KO probability: group hits by target so two hits on the SAME foe combine as
  // one damage total (not two independent OHKOs), then combine across foes.
  const hitsByTarget = new Map<string, { hp: number; rolls: number[][] }>();
  for (const d of actionDamage) {
    const g = hitsByTarget.get(d.target) ?? { hp: d.targetHp, rolls: [] };
    g.rolls.push(d.damage.rolls);
    hitsByTarget.set(d.target, g);
  }
  const koRaw =
    1 -
    [...hitsByTarget.values()].reduce(
      (surv, g) => surv * (1 - targetKoProbability(g.rolls, g.hp)),
      1,
    );
  const speedRaw = actionDamage.length
    ? actionDamage.filter((d) => d.movesFirst).length / actionDamage.length
    : 0;
  const typeRaw = actionDamage.length
    ? actionDamage.reduce((a, d) => a + d.damage.effectiveness.multiplier, 0) /
      actionDamage.length
    : 1;

  const normalized: Record<
    ScoreFactorName,
    { raw: number; normalized: number }
  > = {
    expectedDamage: {
      raw: Math.round(expectedDamageRaw * 100) / 100,
      normalized: Math.min(expectedDamageRaw / 200, 1),
    },
    koProbability: { raw: Math.round(koRaw * 1000) / 1000, normalized: koRaw },
    speedControl: { raw: speedRaw, normalized: speedRaw },
    typeAdvantage: {
      raw: Math.round(typeRaw * 100) / 100,
      normalized: Math.min(typeRaw / 4, 1),
    },
  };

  const breakdown = scoreFactors(normalized, PROFILE_WEIGHTS[profile]);

  // ---- Narrative ----------------------------------------------------------
  const survivalProbability = Math.round((1 - koRaw) * 1000) / 1000; // opponent survival
  const koProbability = normalized.koProbability.raw;

  const switches = combination.filter((a) => a.kind === "switch").length;
  let mainRisk: string;
  if (koProbability < 0.15 && switches === 0) {
    mainRisk = "No knockout expected this turn; the opponent can act freely in response.";
  } else if (switches > 0) {
    mainRisk = "Switching Pokémon may take an incoming hit before acting.";
  } else if (speedRaw < 0.5) {
    mainRisk = "The opponent likely moves first; expected damage may not land as calculated.";
  } else {
    mainRisk = "The opponent may switch to a resist, reducing the expected result.";
  }

  const expectedPosition =
    actionDamage.length > 0
      ? `Deal about ${normalized.expectedDamage.raw}% total across targets` +
        (koProbability > 0
          ? `, with a ${Math.round(koProbability * 100)}% chance of at least one knockout.`
          : ", no knockout expected.")
      : "No damage this turn (switch/positioning).";

  const confidence =
    Math.round(
      PROVISIONAL_CONFIDENCE_CAP * opponentInfoCompleteness(state) * 1000,
    ) / 1000;

  const topFactor = [...breakdown.factors].sort(
    (a, b) => b.contribution - a.contribution,
  )[0];
  const explanation = topFactor
    ? `Ranked mainly on ${PROFILE_LABELS[profile]} weighting of ${topFactor.name}` +
      ` (normalized ${topFactor.normalized.toFixed(2)}). All values are provisional.`
    : "No scoreable actions.";

  return {
    combination,
    actionLines: combination.map((a) => describeAction(state, a)),
    breakdown,
    damage: actionDamage,
    koProbability,
    survivalProbability,
    expectedPosition,
    mainRisk,
    assumptions: [...assumptions],
    confidence,
    explanation,
  };
}

export interface RecommendOptions {
  profile?: ProfileName;
  limit?: number;
}

/** Rank the user's legal action combinations, best first. */
export function recommend(
  state: BattleState,
  options: RecommendOptions = {},
): Recommendation[] {
  const profile = options.profile ?? "balanced";
  const limit = options.limit ?? 5;
  const combos = legalCombinations(state, "user");
  const evaluated = combos.map((c) => evaluateCombination(state, c, profile));
  evaluated.sort((a, b) => b.breakdown.total - a.breakdown.total);
  return evaluated.slice(0, limit);
}
