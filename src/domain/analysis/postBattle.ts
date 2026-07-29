// Post-battle analysis (Phase 9). For each turn, compare the action actually
// taken against the engine's recommendation, on EXPECTED value — which separates
// decision quality from the random result and from information learned later
// (spec). Pure and provisional.

import type { AssumptionId } from "../mechanics/assumptions";
import { evaluateCombination, recommend } from "../choicedex/recommend";
import type { ProfileName } from "../choicedex/scoring";
import type { Combatant } from "../types/battle";
import type { Replay } from "../replay/types";

export interface TurnAnalysis {
  turn: number;
  actualActions: string[];
  recommendedActions: string[];
  actualScore: number;
  recommendedScore: number;
  /** How much worse the actual action was, in score (≥0). */
  decisionValueLoss: number;
  missedKo: boolean;
  highUncertainty: boolean;
  turningPoint: boolean;
  /** KO probability the recommendation predicted for this turn. */
  predictedKoProbability: number;
  /** Whether a foe actually fainted this turn (from the next turn's state). */
  observedKo: boolean;
}

export interface BattleAnalysis {
  result: "win" | "loss" | "draw" | "timeout" | "unknown";
  turns: TurnAnalysis[];
  avgDecisionValueLoss: number;
  decisionQuality: number; // 1 - avg loss, clamped
  missedKos: number;
  turningPoints: number;
  highUncertaintyTurns: number;
  /** Prediction/outcome pairs for KO calibration (predicted vs observed). */
  koCalibration: { predicted: number; outcome: 0 | 1 }[];
  assumptions: AssumptionId[];
}

const TURNING_POINT_LOSS = 0.2;
const UNCERTAINTY_CONFIDENCE = 0.35;

function faintedFoeCount(replayTurn: Replay["turns"][number] | undefined): number {
  if (!replayTurn) return 0;
  return replayTurn.state.opponent.active.filter(
    (c): c is Combatant => c !== null && c.fainted,
  ).length;
}

export function analyzeReplay(
  replay: Replay,
  profile: ProfileName = "balanced",
): BattleAnalysis {
  const turns: TurnAnalysis[] = [];
  const koCalibration: { predicted: number; outcome: 0 | 1 }[] = [];

  replay.turns.forEach((rt, i) => {
    const rec = recommend(rt.state, { profile, limit: 1 })[0];
    const actual = evaluateCombination(rt.state, rt.userAction, profile);

    const recommendedScore = rec?.breakdown.total ?? 0;
    const actualScore = actual.breakdown.total;
    const decisionValueLoss = Math.max(0, round(recommendedScore - actualScore));

    // Observed KO: fainted foes increased from this turn to the next. On the
    // final turn there is no post-turn state, so the outcome is unavailable.
    const next = replay.turns[i + 1];
    const observedKo = next
      ? faintedFoeCount(next) > faintedFoeCount(rt)
      : false;

    const predictedKoProbability = rec?.koProbability ?? 0;
    koCalibration.push({
      predicted: predictedKoProbability,
      outcome: observedKo ? 1 : 0,
    });

    turns.push({
      turn: rt.state.turn,
      actualActions: actual.actionLines,
      recommendedActions: rec?.actionLines ?? [],
      actualScore: round(actualScore),
      recommendedScore: round(recommendedScore),
      decisionValueLoss,
      missedKo: predictedKoProbability >= 0.5 && !observedKo && actual.koProbability < 0.5,
      highUncertainty: (rec?.confidence ?? 0) < UNCERTAINTY_CONFIDENCE,
      turningPoint: decisionValueLoss >= TURNING_POINT_LOSS,
      predictedKoProbability,
      observedKo,
    });
  });

  const avgLoss =
    turns.length > 0
      ? turns.reduce((a, t) => a + t.decisionValueLoss, 0) / turns.length
      : 0;

  return {
    result: finalResult(replay),
    turns,
    avgDecisionValueLoss: round(avgLoss),
    decisionQuality: round(Math.max(0, 1 - avgLoss)),
    missedKos: turns.filter((t) => t.missedKo).length,
    turningPoints: turns.filter((t) => t.turningPoint).length,
    highUncertaintyTurns: turns.filter((t) => t.highUncertainty).length,
    koCalibration,
    assumptions: ["damageFormula", "statFormula", "speedOrder", "typeChart"],
  };
}

function finalResult(replay: Replay): BattleAnalysis["result"] {
  const last = replay.turns[replay.turns.length - 1];
  if (!last) return "unknown";
  const userAlive = last.state.user.active.some((c) => c && !c.fainted);
  const oppAlive = last.state.opponent.active.some((c) => c && !c.fainted);
  if (userAlive && !oppAlive) return "win";
  if (!userAlive && oppAlive) return "loss";
  if (!userAlive && !oppAlive) return "draw";
  return "unknown";
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
