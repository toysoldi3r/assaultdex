// On-entry ability effects (Phase: abilities/items/secondaries). Applied once
// when an initial battle state is built: Intimidate lowers the opposing side's
// Attack, and weather/terrain-setting abilities set the field. Provisional for
// Pokémon Champions (ASSUMPTIONS.entryEffects); a manually-selected weather or
// terrain is never overridden.

import type {
  BattleState,
  Combatant,
  SideState,
  Terrain,
  Weather,
} from "../types/battle";

/** Abilities that set weather on entry → the weather they set. */
export const WEATHER_SETTERS: Record<string, Weather> = {
  Drought: "sun",
  "Orichalcum Pulse": "sun",
  Drizzle: "rain",
  "Sand Stream": "sand",
  "Snow Warning": "snow",
};

/** Abilities that set terrain on entry → the terrain they set. */
export const TERRAIN_SETTERS: Record<string, Terrain> = {
  "Electric Surge": "electric",
  "Hadron Engine": "electric",
  "Grassy Surge": "grassy",
  "Misty Surge": "misty",
  "Psychic Surge": "psychic",
};

/** Abilities that block Intimidate's Attack drop. */
const INTIMIDATE_IMMUNE = new Set([
  "Clear Body",
  "White Smoke",
  "Full Metal Body",
  "Hyper Cutter",
  "Inner Focus",
  "Oblivious",
  "Own Tempo",
  "Scrappy",
  "Guard Dog",
]);

function actives(side: SideState): Combatant[] {
  return side.active.filter((c): c is Combatant => c !== null && !c.fainted);
}

/**
 * Apply on-entry ability effects to a freshly-built state. Pure: mutates only
 * the passed-in state (callers pass a fresh clone) and returns a human-readable
 * log of what fired.
 */
export function applyEntryEffects(state: BattleState): {
  state: BattleState;
  log: string[];
} {
  const log: string[] = [];

  // Intimidate: each entering Pokémon lowers the opposing actives' Attack by 1.
  for (const [selfKey, foeKey] of [
    ["user", "opponent"],
    ["opponent", "user"],
  ] as const) {
    for (const c of actives(state[selfKey])) {
      if (c.ability !== "Intimidate") continue;
      for (const foe of actives(state[foeKey])) {
        if (foe.ability && INTIMIDATE_IMMUNE.has(foe.ability)) continue;
        if (foe.stages.atk <= -6) continue;
        foe.stages.atk = Math.max(-6, foe.stages.atk - 1);
        log.push(`Intimidate (${c.name}) −1 Atk → ${foe.name}`);
      }
    }
  }

  // Weather/terrain setters. Only fill an unset field, so a manual choice wins.
  // Iterate user first, then opponent, for a deterministic result.
  const all = [...actives(state.user), ...actives(state.opponent)];
  if (state.field.weather === "none") {
    for (const c of all) {
      const w = c.ability ? WEATHER_SETTERS[c.ability] : undefined;
      if (w) {
        state.field.weather = w;
        log.push(`${c.ability} (${c.name}) → ${w}`);
        break;
      }
    }
  }
  if (state.field.terrain === "none") {
    for (const c of all) {
      const t = c.ability ? TERRAIN_SETTERS[c.ability] : undefined;
      if (t) {
        state.field.terrain = t;
        log.push(`${c.ability} (${c.name}) → ${t} terrain`);
        break;
      }
    }
  }

  return { state, log };
}
