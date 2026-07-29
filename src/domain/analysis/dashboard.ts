// Personal dashboard aggregation (Phase 9). Combine per-battle summaries into
// record, decision-quality, mistake, and calibration statistics. Flags small
// samples so strong conclusions are not drawn from too little data (spec). Pure.

import { calibrate, type Calibration, type CalibrationPair } from "./calibration";

export interface BattleSummary {
  result: "win" | "loss" | "draw" | "timeout" | "unknown";
  decisionQuality: number;
  missedKos: number;
  turningPoints: number;
  turns: number;
  koCalibration: CalibrationPair[];
}

export interface Dashboard {
  battles: number;
  wins: number;
  losses: number;
  decisiveGames: number;
  winRate: number | null;
  /** True when there are too few battles to draw strong conclusions. */
  smallSample: boolean;
  avgDecisionQuality: number;
  totalMissedKos: number;
  totalTurningPoints: number;
  avgTurns: number;
  koCalibration: Calibration;
}

const SMALL_SAMPLE_THRESHOLD = 10;

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function buildDashboard(summaries: BattleSummary[]): Dashboard {
  const battles = summaries.length;
  const wins = summaries.filter((s) => s.result === "win").length;
  const losses = summaries.filter((s) => s.result === "loss").length;
  const decisiveGames = wins + losses;

  const allPairs = summaries.flatMap((s) => s.koCalibration);

  return {
    battles,
    wins,
    losses,
    decisiveGames,
    winRate: decisiveGames > 0 ? round(wins / decisiveGames) : null,
    smallSample: battles < SMALL_SAMPLE_THRESHOLD,
    avgDecisionQuality: battles
      ? round(summaries.reduce((a, s) => a + s.decisionQuality, 0) / battles)
      : 0,
    totalMissedKos: summaries.reduce((a, s) => a + s.missedKos, 0),
    totalTurningPoints: summaries.reduce((a, s) => a + s.turningPoints, 0),
    avgTurns: battles
      ? round(summaries.reduce((a, s) => a + s.turns, 0) / battles)
      : 0,
    koCalibration: calibrate(allPairs),
  };
}
