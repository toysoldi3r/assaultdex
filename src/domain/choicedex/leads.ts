// Lead analysis (Phase 4). Before battle, rank the user's candidate lead pairs
// against the opponent's likely lead pairs, using the existing recommendation
// and speed engines. Pure and deterministic; provisional like everything that
// touches mechanics.
//
// Factors implemented from the spec's lead criteria that are computable without
// metagame data: damage pressure, defensive position, speed control, and
// knockout risk. Criteria that need usage data (common opponent strategies) are
// intentionally omitted - that is Phase 5.

import type { AssumptionId } from "../mechanics/assumptions";
import { effectiveSpeed } from "../mechanics/speed";
import type {
  BattleState,
  Combatant,
  FieldState,
  SideConditions,
} from "../types/battle";
import { NO_SIDE_CONDITIONS } from "../types/battle";
import { recommend } from "./recommend";
import type { ProfileName } from "./scoring";

export interface LeadAnalysisInput {
  userCandidates: Combatant[];
  opponentCandidates: Combatant[];
  field: FieldState;
  userConditions?: SideConditions;
  opponentConditions?: SideConditions;
  profile?: ProfileName;
}

export interface LeadFactor {
  name: "damagePressure" | "defensivePosition" | "speedControl" | "koSafety";
  value: number; // 0..1
}

export interface LeadPairScore {
  lead: [string, string];
  score: number;
  factors: LeadFactor[];
  bestAgainst: string;
  worstAgainst: string;
  explanation: string;
  assumptions: AssumptionId[];
}

type Pair = [Combatant, Combatant];

function pairs(list: Combatant[]): Pair[] {
  const out: Pair[] = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      out.push([list[i]!, list[j]!]);
    }
  }
  return out;
}

function stateFor(
  user: Pair,
  opponent: Pair,
  field: FieldState,
  userConditions: SideConditions,
  opponentConditions: SideConditions,
): BattleState {
  return {
    turn: 0,
    field,
    user: { active: [user[0], user[1]], bench: [], conditions: userConditions },
    opponent: {
      active: [opponent[0], opponent[1]],
      bench: [],
      conditions: opponentConditions,
    },
  };
}

function fasterSpeed(pair: Pair, tailwind: boolean): number {
  return Math.max(
    effectiveSpeed(pair[0], { tailwind }).effectiveSpeed,
    effectiveSpeed(pair[1], { tailwind }).effectiveSpeed,
  );
}

export function analyzeLeads(input: LeadAnalysisInput): LeadPairScore[] {
  const profile = input.profile ?? "balanced";
  const field = input.field;
  const uCond = input.userConditions ?? NO_SIDE_CONDITIONS;
  const oCond = input.opponentConditions ?? NO_SIDE_CONDITIONS;

  const userPairs = pairs(input.userCandidates);
  const oppPairs = pairs(input.opponentCandidates);
  if (userPairs.length === 0 || oppPairs.length === 0) return [];

  const results: LeadPairScore[] = userPairs.map((up) => {
    let damageSum = 0;
    let threatSum = 0;
    let koRiskSum = 0;
    let speedSum = 0;
    let best = { label: "", offense: -1 };
    let worst = { label: "", offense: Infinity };

    for (const op of oppPairs) {
      const offenseState = stateFor(up, op, field, uCond, oCond);
      const ourBest = recommend(offenseState, { profile, limit: 1 })[0];
      const offense = ourBest?.breakdown.total ?? 0;

      // Threat: opponent attacking us (swap sides + side conditions).
      const threatState = stateFor(op, up, field, oCond, uCond);
      const theirBest = recommend(threatState, { profile, limit: 1 })[0];
      const threat = theirBest?.breakdown.total ?? 0;
      const koRisk = theirBest?.koProbability ?? 0;

      const oppFast = fasterSpeed(op, oCond.tailwind);
      const outspeed =
        [up[0], up[1]].filter(
          (c) => effectiveSpeed(c, { tailwind: uCond.tailwind }).effectiveSpeed > oppFast,
        ).length / 2;

      damageSum += offense;
      threatSum += threat;
      koRiskSum += koRisk;
      speedSum += outspeed;

      const label = `${op[0].name} + ${op[1].name}`;
      if (offense > best.offense) best = { label, offense };
      if (offense < worst.offense) worst = { label, offense };
    }

    const n = oppPairs.length;
    const damagePressure = damageSum / n;
    const defensivePosition = Math.max(0, 1 - threatSum / n);
    const speedControl = speedSum / n;
    const koSafety = Math.max(0, 1 - koRiskSum / n);

    const factors: LeadFactor[] = [
      { name: "damagePressure", value: round(damagePressure) },
      { name: "defensivePosition", value: round(defensivePosition) },
      { name: "speedControl", value: round(speedControl) },
      { name: "koSafety", value: round(koSafety) },
    ];
    const score = round(
      (damagePressure + defensivePosition + speedControl + koSafety) / 4,
    );

    return {
      lead: [up[0].name, up[1].name] as [string, string],
      score,
      factors,
      bestAgainst: best.label,
      worstAgainst: worst.label,
      explanation:
        `Averaged over ${n} likely opponent lead(s): best offense vs ${best.label}, ` +
        `worst vs ${worst.label}. All values provisional.`,
      assumptions: ["damageFormula", "statFormula", "speedOrder", "typeChart"],
    };
  });

  results.sort((a, b) => b.score - a.score);
  return results;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
