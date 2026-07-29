// Branching turn explorer (Phase 7). Builds a bounded decision tree of future
// turns: the user's best action lines (beam search), the opponent's best
// response, and the damage-roll chance outcomes, with per-node probability and
// expected value. Bounded by depth, beam width, probability threshold, and a
// node budget (spec: control tree size). Pure and provisional.

import type { AssumptionId } from "../mechanics/assumptions";
import { calculateDamage } from "../mechanics/damage";
import {
  legalCombinations,
  type ActionCombination,
} from "../mechanics/legalActions";
import { effectiveSpeed } from "../mechanics/speed";
import type { BattleState, Combatant } from "../types/battle";
import { evaluateCombination } from "./recommend";
import type { ProfileName } from "./scoring";

export interface ExploreLimits {
  maxDepth: number;
  beamWidth: number;
  probabilityThreshold: number;
  maxNodes: number;
}

export const DEFAULT_LIMITS: ExploreLimits = {
  maxDepth: 3,
  beamWidth: 2,
  probabilityThreshold: 0.05,
  maxNodes: 200,
};

export interface TurnNode {
  depth: number;
  userActions: string[];
  opponentActions: string[];
  rollLabel: "low" | "high";
  probability: number;
  score: number;
  hpSummary: string;
  fainted: string[];
  terminal: boolean;
  children: TurnNode[];
}

export interface ExploreResult {
  roots: TurnNode[];
  nodesExpanded: number;
  truncated: boolean;
  assumptions: AssumptionId[];
}

function activeMons(state: BattleState, side: "user" | "opponent"): Combatant[] {
  const s = side === "user" ? state.user : state.opponent;
  return s.active.filter((c): c is Combatant => c !== null && !c.fainted);
}

function sideConditions(state: BattleState, side: "user" | "opponent") {
  return (side === "user" ? state.user : state.opponent).conditions;
}

function moveOnly(combos: ActionCombination[]): ActionCombination[] {
  return combos.filter((c) => c.every((a) => a.kind === "move"));
}

function bestCombo(
  state: BattleState,
  side: "user" | "opponent",
  profile: ProfileName,
): { combo: ActionCombination; score: number } | null {
  const combos = moveOnly(legalCombinations(state, side));
  if (combos.length === 0) return null;
  let best: { combo: ActionCombination; score: number } | null = null;
  for (const combo of combos) {
    const score = evaluateCombination(state, combo, profile).breakdown.total;
    if (!best || score > best.score) best = { combo, score };
  }
  return best;
}

function topUserCombos(
  state: BattleState,
  profile: ProfileName,
  beamWidth: number,
): { combo: ActionCombination; score: number }[] {
  const combos = moveOnly(legalCombinations(state, "user"));
  return combos
    .map((combo) => ({
      combo,
      score: evaluateCombination(state, combo, profile).breakdown.total,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, beamWidth);
}

/** Apply both sides' move actions to a clone, ordered by priority then Speed. */
function applyActions(
  state: BattleState,
  userCombo: ActionCombination,
  oppCombo: ActionCombination,
  roll: "low" | "high",
): BattleState {
  const next = structuredClone(state);

  const resolve = (side: "user" | "opponent", slot: 0 | 1) =>
    (side === "user" ? next.user : next.opponent).active[slot];

  interface Exec {
    side: "user" | "opponent";
    attacker: Combatant;
    move: NonNullable<Combatant["moves"][number]>;
    targets: Combatant[];
    priority: number;
    speed: number;
  }

  const execs: Exec[] = [];
  for (const combo of [userCombo, oppCombo]) {
    for (const action of combo) {
      if (action.kind !== "move") continue;
      if (action.targetSide === action.side) continue; // self/ally, non-damaging
      const attacker = resolve(action.side, action.slot);
      if (!attacker) continue;
      const move = attacker.moves.find((m) => m.name === action.moveName);
      if (!move || move.category === "status" || move.power === null) continue;

      const foe = action.targetSide;
      const foeActive = (foe === "user" ? next.user : next.opponent).active;
      const targets =
        action.spread || action.targetSlot === null
          ? foeActive.filter((c): c is Combatant => c !== null && !c.fainted)
          : [foeActive[action.targetSlot]].filter(
              (c): c is Combatant => c !== null && !c.fainted,
            );

      execs.push({
        side: action.side,
        attacker,
        move,
        targets,
        priority: move.priority,
        speed: effectiveSpeed(attacker, {
          tailwind: sideConditions(next, action.side).tailwind,
        }).effectiveSpeed,
      });
    }
  }

  execs.sort((a, b) => b.priority - a.priority || b.speed - a.speed);

  for (const exec of execs) {
    if (exec.attacker.fainted) continue;
    const foe = exec.side === "user" ? "opponent" : "user";
    for (const target of exec.targets) {
      if (target.fainted) continue;
      const dmg = calculateDamage(exec.attacker, target, exec.move, next.field, {
        spread: exec.move.target !== "normal",
        defenderConditions: sideConditions(next, foe),
      });
      const amount = roll === "low" ? dmg.minDamage : dmg.maxDamage;
      target.currentHp = Math.max(0, target.currentHp - amount);
      if (target.currentHp <= 0) target.fainted = true;
    }
  }

  next.turn += 1;
  return next;
}

function hpSummary(state: BattleState): string {
  const fmt = (c: Combatant | null) =>
    c ? `${c.name} ${Math.round((c.currentHp / c.stats.hp) * 100)}%` : "—";
  return (
    `You: ${state.user.active.map(fmt).join(", ")} | ` +
    `Opp: ${state.opponent.active.map(fmt).join(", ")}`
  );
}

function faintedNames(state: BattleState): string[] {
  return [...state.user.active, ...state.opponent.active]
    .filter((c): c is Combatant => c !== null && c.fainted)
    .map((c) => c.name);
}

/** Explore future turns into a bounded decision tree. */
export function exploreTurns(
  state: BattleState,
  profile: ProfileName = "balanced",
  limits: Partial<ExploreLimits> = {},
): ExploreResult {
  const cfg = { ...DEFAULT_LIMITS, ...limits };
  const counter = { nodes: 0, truncated: false };

  function expand(
    current: BattleState,
    depth: number,
    prob: number,
  ): TurnNode[] {
    if (depth >= cfg.maxDepth) return [];
    if (activeMons(current, "user").length === 0) return [];
    if (activeMons(current, "opponent").length === 0) return [];

    const userChoices = topUserCombos(current, profile, cfg.beamWidth);
    const nodes: TurnNode[] = [];

    for (const choice of userChoices) {
      const oppBest = bestCombo(current, "opponent", profile);
      const oppCombo = oppBest?.combo ?? [];

      for (const roll of ["low", "high"] as const) {
        const childProb = prob * 0.5;
        if (childProb < cfg.probabilityThreshold) continue;
        if (counter.nodes >= cfg.maxNodes) {
          counter.truncated = true;
          break;
        }
        counter.nodes += 1;

        const nextState = applyActions(current, choice.combo, oppCombo, roll);
        const node: TurnNode = {
          depth,
          userActions: evaluateCombination(current, choice.combo, profile)
            .actionLines,
          opponentActions: oppBest
            ? evaluateCombination(current, oppCombo, profile).actionLines
            : [],
          rollLabel: roll,
          probability: Math.round(childProb * 1000) / 1000,
          score: choice.score,
          hpSummary: hpSummary(nextState),
          fainted: faintedNames(nextState),
          terminal:
            depth + 1 >= cfg.maxDepth ||
            activeMons(nextState, "user").length === 0 ||
            activeMons(nextState, "opponent").length === 0,
          children: [],
        };
        node.children = node.terminal
          ? []
          : expand(nextState, depth + 1, childProb);
        nodes.push(node);
      }
    }
    return nodes;
  }

  const roots = expand(state, 0, 1);
  return {
    roots,
    nodesExpanded: counter.nodes,
    truncated: counter.truncated,
    assumptions: ["damageFormula", "statFormula", "speedOrder", "typeChart"],
  };
}
