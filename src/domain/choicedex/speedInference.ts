// Opponent speed/spread inference (Phase 6). Enumerate an opponent's possible
// Speed across a uniform spread grid, then narrow it with observed move-order
// evidence. Pure and mechanics-driven - no usage data. Provisional.

import { type AssumptionId } from "../mechanics/assumptions";
import { computeStat } from "../mechanics/stats";
import type { Nature } from "../types/pokemon";

export type NatureSign = "+" | "0" | "-";

const SPE_NATURES: Record<NatureSign, Nature> = {
  "+": { name: "spe+", boosted: "spe", lowered: "atk" },
  "0": { name: "neutral", boosted: "spe", lowered: "spe" },
  "-": { name: "spe-", boosted: "atk", lowered: "spe" },
};

export interface SpeedCandidate {
  ev: number;
  iv: number;
  nature: NatureSign;
  speed: number;
}

export type SpeedObservation =
  | { kind: "faster-than"; speed: number; note?: string }
  | { kind: "slower-than"; speed: number; note?: string }
  | { kind: "speed-tie"; speed: number; note?: string };

export interface SpeedInference {
  baseSpeed: number;
  level: number;
  total: number;
  remaining: number;
  eliminated: number;
  minSpeed: number | null;
  maxSpeed: number | null;
  /** Share of surviving candidates by nature sign. */
  natureShare: Record<NatureSign, number>;
  /** Whether a max-Speed investment (252 EV, 31 IV, + nature) is still possible. */
  maxInvestmentPossible: boolean;
  observations: SpeedObservation[];
  confidence: number;
  assumptions: AssumptionId[];
}

/** Enumerate the spread grid for Speed (EV steps of 4, IV 0/31, nature ±/0). */
export function speedCandidates(
  baseSpeed: number,
  level = 50,
): SpeedCandidate[] {
  const out: SpeedCandidate[] = [];
  for (const nature of ["+", "0", "-"] as NatureSign[]) {
    for (const iv of [0, 31]) {
      for (let ev = 0; ev <= 252; ev += 4) {
        const speed = computeStat(
          baseSpeed,
          iv,
          ev,
          level,
          "spe",
          SPE_NATURES[nature],
        );
        out.push({ ev, iv, nature, speed });
      }
    }
  }
  return out;
}

function satisfies(c: SpeedCandidate, obs: SpeedObservation): boolean {
  switch (obs.kind) {
    case "faster-than":
      return c.speed > obs.speed;
    case "slower-than":
      return c.speed < obs.speed;
    case "speed-tie":
      return c.speed === obs.speed;
  }
}

/** Narrow the spread grid by all observations and summarize. */
export function inferSpeed(
  baseSpeed: number,
  observations: SpeedObservation[],
  level = 50,
): SpeedInference {
  const all = speedCandidates(baseSpeed, level);
  const remaining = all.filter((c) =>
    observations.every((o) => satisfies(c, o)),
  );

  const speeds = remaining.map((c) => c.speed);
  const minSpeed = speeds.length ? Math.min(...speeds) : null;
  const maxSpeed = speeds.length ? Math.max(...speeds) : null;

  const counts: Record<NatureSign, number> = { "+": 0, "0": 0, "-": 0 };
  for (const c of remaining) counts[c.nature]++;
  const denom = remaining.length || 1;
  const natureShare: Record<NatureSign, number> = {
    "+": round(counts["+"] / denom),
    "0": round(counts["0"] / denom),
    "-": round(counts["-"] / denom),
  };

  const maxInvestmentPossible = remaining.some(
    (c) => c.ev === 252 && c.iv === 31 && c.nature === "+",
  );

  const eliminated = all.length - remaining.length;
  // Confidence rises with the fraction of the grid ruled out; capped while
  // mechanics are provisional and never certain unless one candidate remains.
  const confidence =
    remaining.length <= 1
      ? remaining.length === 1
        ? 0.9
        : 0
      : round(Math.min(0.85, eliminated / all.length));

  return {
    baseSpeed,
    level,
    total: all.length,
    remaining: remaining.length,
    eliminated,
    minSpeed,
    maxSpeed,
    natureShare,
    maxInvestmentPossible,
    observations,
    confidence,
    assumptions: ["spreadGridPrior", "statFormula", "speedOrder"],
  };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
