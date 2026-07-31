// End-of-turn residual effects and multi-turn countdowns (Phase: field/status
// durations). Applied after both sides act, each turn: weather chip damage,
// Leftovers healing, burn/poison/badly-poisoned (Toxic) residual damage, Perish
// Song, and countdown/expiry of weather, terrain, Trick Room, screens, and
// Tailwind. Provisional for Pokémon Champions (ASSUMPTIONS.residualEffects).

import type { BattleState, Combatant, SideState } from "../types/battle";
import type { PokemonType } from "../types/pokemon";

/** Abilities that ignore all residual chip damage. */
const RESIDUAL_IMMUNE_ABILITIES = new Set(["Magic Guard"]);
/** Abilities/items that grant immunity to sandstorm chip. */
const SAND_IMMUNE_ABILITIES = new Set([
  "Sand Veil",
  "Sand Rush",
  "Sand Force",
  "Overcoat",
  "Magic Guard",
]);
const SAND_IMMUNE_TYPES: PokemonType[] = ["rock", "ground", "steel"];

export interface ResidualLogEntry {
  name: string;
  effect: string;
}

export interface ResidualResult {
  faints: number;
  log: ResidualLogEntry[];
}

function actives(side: SideState): Combatant[] {
  return side.active.filter((c): c is Combatant => c !== null && !c.fainted);
}

function fraction(max: number, num: number, den: number): number {
  return Math.max(1, Math.floor((max * num) / den));
}

/**
 * Apply all end-of-turn residual effects to `state` (mutates it) and count how
 * many Pokémon fainted. Field/side countdowns are decremented and expired.
 */
export function applyResidual(state: BattleState): ResidualResult {
  const log: ResidualLogEntry[] = [];
  let faints = 0;

  const damage = (c: Combatant, amount: number, effect: string): void => {
    if (c.fainted || amount <= 0) return;
    c.currentHp = Math.max(0, c.currentHp - amount);
    log.push({ name: c.name, effect });
    if (c.currentHp <= 0) {
      c.fainted = true;
      faints++;
    }
  };

  const heal = (c: Combatant, amount: number, effect: string): void => {
    if (c.fainted || c.currentHp >= c.stats.hp) return;
    c.currentHp = Math.min(c.stats.hp, c.currentHp + amount);
    log.push({ name: c.name, effect });
  };

  const all = [...actives(state.user), ...actives(state.opponent)];

  // 1. Weather chip damage (sandstorm only; snow/hail deal none in this model).
  if (state.field.weather === "sand") {
    for (const c of all) {
      if (RESIDUAL_IMMUNE_ABILITIES.has(c.ability ?? "")) continue;
      if (c.ability && SAND_IMMUNE_ABILITIES.has(c.ability)) continue;
      if (c.item === "Safety Goggles") continue;
      if (c.types.some((t) => SAND_IMMUNE_TYPES.includes(t))) continue;
      damage(c, fraction(c.stats.hp, 1, 16), "sandstorm −1/16");
    }
  }

  // 2. Leftovers healing.
  for (const c of all) {
    if (c.item === "Leftovers") heal(c, fraction(c.stats.hp, 1, 16), "Leftovers +1/16");
  }

  // 3. Status residual (skipped by Magic Guard).
  for (const c of all) {
    if (RESIDUAL_IMMUNE_ABILITIES.has(c.ability ?? "")) continue;
    if (c.ability === "Poison Heal" && (c.status === "poison" || c.status === "toxic")) {
      heal(c, fraction(c.stats.hp, 1, 8), "Poison Heal +1/8");
      continue;
    }
    switch (c.status) {
      case "burn":
        damage(c, fraction(c.stats.hp, 1, 16), "burn −1/16");
        break;
      case "poison":
        damage(c, fraction(c.stats.hp, 1, 8), "poison −1/8");
        break;
      case "toxic": {
        const n = c.toxicCounter ?? 1;
        damage(c, fraction(c.stats.hp, n, 16), `badly poisoned −${n}/16`);
        if (!c.fainted) c.toxicCounter = n + 1;
        break;
      }
      default:
        break;
    }
  }

  // 4. Perish Song: count down, faint at 0.
  for (const c of all) {
    if (c.perish == null || c.fainted) continue;
    c.perish -= 1;
    if (c.perish <= 0) {
      c.currentHp = 0;
      c.fainted = true;
      faints++;
      log.push({ name: c.name, effect: "Perish Song faint" });
    } else {
      log.push({ name: c.name, effect: `Perish ${c.perish}` });
    }
  }

  // 5. Field / side countdowns.
  countdownField(state);
  countdownSide(state.user, log, "your side");
  countdownSide(state.opponent, log, "opponent side");

  return { faints, log };
}

function tick(turns: number | undefined): { turns: number | undefined; expired: boolean } {
  if (turns == null || turns <= 0) return { turns, expired: false };
  const next = turns - 1;
  return { turns: next, expired: next <= 0 };
}

function countdownField(state: BattleState): void {
  const f = state.field;
  {
    const t = tick(f.weatherTurns);
    f.weatherTurns = t.turns;
    if (t.expired) {
      f.weather = "none";
      f.weatherTurns = undefined;
    }
  }
  {
    const t = tick(f.terrainTurns);
    f.terrainTurns = t.turns;
    if (t.expired) {
      f.terrain = "none";
      f.terrainTurns = undefined;
    }
  }
  {
    const t = tick(f.trickRoomTurns);
    f.trickRoomTurns = t.turns;
    if (t.expired) {
      f.trickRoom = false;
      f.trickRoomTurns = undefined;
    }
  }
}

function countdownSide(side: SideState, log: ResidualLogEntry[], label: string): void {
  const c = side.conditions;
  const step = (
    turnsKey: "tailwindTurns" | "reflectTurns" | "lightScreenTurns" | "auroraVeilTurns",
    flagKey: "tailwind" | "reflect" | "lightScreen" | "auroraVeil",
    name: string,
  ): void => {
    const t = tick(c[turnsKey]);
    c[turnsKey] = t.turns;
    if (t.expired) {
      c[flagKey] = false;
      c[turnsKey] = undefined;
      log.push({ name: label, effect: `${name} ended` });
    }
  };
  step("tailwindTurns", "tailwind", "Tailwind");
  step("reflectTurns", "reflect", "Reflect");
  step("lightScreenTurns", "lightScreen", "Light Screen");
  step("auroraVeilTurns", "auroraVeil", "Aurora Veil");
}
