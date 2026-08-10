// Basic team analysis (Phase 2). Pure functions over resolved team members.
// Everything that touches mechanics is provisional (type chart, stat formula).
// Analyses that would require metagame/usage data (common leads, cores) are
// intentionally omitted here - that is Phase 5 and must not be fabricated.

import { computeStats } from "../mechanics/stats";
import { type AssumptionId } from "../mechanics/assumptions";
import { typeEffectiveness } from "../mechanics/typeEffectiveness";
import {
  POKEMON_TYPES,
  type BaseStats,
  type MoveFixture,
  type Nature,
  type PokemonType,
} from "../types/pokemon";

export interface AnalysisMember {
  species: string;
  name: string;
  types: [PokemonType] | [PokemonType, PokemonType];
  baseStats: BaseStats;
  /** Resolved selected moves. */
  moves: MoveFixture[];
  level: number;
  ivs: BaseStats;
  evs: BaseStats;
  nature: Nature;
  ability?: string | null;
}

export interface WeatherSetter {
  member: string;
  /** The exact ability or move that sets the weather. */
  source: string;
  kind: "ability" | "move";
  weather: string;
}

export interface WeaknessEntry {
  type: PokemonType;
  members: string[]; // member names weak to this type
  shared: boolean;
}

export interface CoverageEntry {
  type: PokemonType; // defending type
  providers: string[]; // member names that hit it super-effectively
}

export interface SpeedTier {
  name: string;
  speed: number;
}

export interface TeamAnalysis {
  size: number;
  weaknesses: WeaknessEntry[];
  offensiveGaps: PokemonType[];
  coverage: CoverageEntry[];
  speedTiers: SpeedTier[];
  speedControl: {
    hasPriority: boolean;
    priorityMoves: { member: string; move: string }[];
    controlMoves: { member: string; move: string }[];
    missing: boolean;
  };
  weatherControl: {
    setters: WeatherSetter[];
    missing: boolean;
  };
  fieldControl: {
    /** Entry hazards the team can set. */
    hazards: { member: string; move: string }[];
    /** Screens / veils / Wide Guard-style protection. */
    protection: { member: string; move: string }[];
  };
  dependence: {
    soleProviderCounts: { member: string; types: number }[];
    note: string | null;
  };
  assumptions: AssumptionId[];
}

const SPEED_CONTROL_MOVES = new Set([
  "Tailwind",
  "Trick Room",
  "Thunder Wave",
  "Icy Wind",
  "Electroweb",
  "Sticky Web",
  "Scary Face",
]);

const WEATHER_ABILITIES: Record<string, string> = {
  Drought: "sun",
  "Orichalcum Pulse": "sun",
  Drizzle: "rain",
  "Sand Stream": "sand",
  "Sand Spit": "sand",
  "Snow Warning": "snow",
};

const HAZARD_MOVES = new Set(["Stealth Rock", "Spikes", "Toxic Spikes", "Sticky Web"]);
const PROTECTION_MOVES = new Set([
  "Reflect", "Light Screen", "Aurora Veil", "Wide Guard", "Quick Guard",
  "Protect", "Detect", "Spiky Shield", "King's Shield", "Baneful Bunker",
  "Silk Trap", "Crafty Shield", "Mat Block",
]);

const WEATHER_MOVES: Record<string, string> = {
  "Sunny Day": "sun",
  "Rain Dance": "rain",
  Sandstorm: "sand",
  Snowscape: "snow",
  Hail: "snow",
  "Chilly Reception": "snow",
};

function memberWeakTo(
  types: [PokemonType] | [PokemonType, PokemonType],
  attacking: PokemonType,
): boolean {
  return typeEffectiveness(attacking, types).multiplier > 1;
}

export function analyzeTeam(members: AnalysisMember[]): TeamAnalysis {
  const size = members.length;
  const sharedThreshold = Math.max(2, Math.ceil(size / 2));

  // Defensive weaknesses per attacking type.
  const weaknesses: WeaknessEntry[] = [];
  for (const attacking of POKEMON_TYPES) {
    const weak = members
      .filter((m) => memberWeakTo(m.types, attacking))
      .map((m) => m.name);
    if (weak.length > 0) {
      weaknesses.push({
        type: attacking,
        members: weak,
        shared: weak.length >= sharedThreshold,
      });
    }
  }
  weaknesses.sort((a, b) => b.members.length - a.members.length);

  // Offensive coverage by defending type (which members hit it ≥2×).
  const coverage: CoverageEntry[] = [];
  const offensiveGaps: PokemonType[] = [];
  for (const defType of POKEMON_TYPES) {
    const providers = members
      .filter((m) =>
        m.moves.some(
          (mv) =>
            mv.category !== "status" &&
            mv.power !== null &&
            typeEffectiveness(mv.type, [defType]).multiplier > 1,
        ),
      )
      .map((m) => m.name);
    if (providers.length > 0) {
      coverage.push({ type: defType, providers });
    } else {
      offensiveGaps.push(defType);
    }
  }

  // Speed tiers at each member's own spread.
  const speedTiers: SpeedTier[] = members
    .map((m) => ({
      name: m.name,
      speed: computeStats(m.baseStats, m.ivs, m.evs, m.level, m.nature).spe,
    }))
    .sort((a, b) => b.speed - a.speed);

  // Speed control.
  const priorityMoves: { member: string; move: string }[] = [];
  const controlMoves: { member: string; move: string }[] = [];
  for (const m of members) {
    for (const mv of m.moves) {
      if (mv.priority > 0 && mv.category !== "status") {
        priorityMoves.push({ member: m.name, move: mv.name });
      }
      if (SPEED_CONTROL_MOVES.has(mv.name)) {
        controlMoves.push({ member: m.name, move: mv.name });
      }
    }
  }
  const hasPriority = priorityMoves.length > 0;
  const missing = controlMoves.length === 0 && !hasPriority;

  // Weather control: abilities (Drought, Drizzle, …) and moves (Sunny Day, …).
  const setters: WeatherSetter[] = [];
  const hazards: { member: string; move: string }[] = [];
  const protection: { member: string; move: string }[] = [];
  for (const m of members) {
    const wa = m.ability ? WEATHER_ABILITIES[m.ability] : undefined;
    if (wa) setters.push({ member: m.name, source: m.ability!, kind: "ability", weather: wa });
    for (const mv of m.moves) {
      const wm = WEATHER_MOVES[mv.name];
      if (wm) setters.push({ member: m.name, source: mv.name, kind: "move", weather: wm });
      if (HAZARD_MOVES.has(mv.name)) hazards.push({ member: m.name, move: mv.name });
      if (PROTECTION_MOVES.has(mv.name)) protection.push({ member: m.name, move: mv.name });
    }
  }

  // Dependence: defending types only one member can hit super-effectively.
  const soleCounts = new Map<string, number>();
  for (const c of coverage) {
    if (c.providers.length === 1) {
      const only = c.providers[0]!;
      soleCounts.set(only, (soleCounts.get(only) ?? 0) + 1);
    }
  }
  const soleProviderCounts = [...soleCounts.entries()]
    .map(([member, types]) => ({ member, types }))
    .sort((a, b) => b.types - a.types);
  const top = soleProviderCounts[0];
  const note =
    top && top.types >= 3
      ? `${top.member} is the only super-effective answer to ${top.types} types - losing it narrows coverage.`
      : null;

  return {
    size,
    weaknesses,
    offensiveGaps,
    coverage,
    speedTiers,
    speedControl: { hasPriority, priorityMoves, controlMoves, missing },
    weatherControl: { setters, missing: setters.length === 0 },
    fieldControl: { hazards, protection },
    dependence: { soleProviderCounts, note },
    assumptions: ["typeChart", "statFormula", "moveData"],
  };
}
