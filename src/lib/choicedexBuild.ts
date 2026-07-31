// Client-safe helpers to turn reference Pokémon + editor form state into a
// domain BattleState. Pure aside from reading fixture natures; safe to import
// into client components (no persistence / no framework).

import { natureByName } from "@/data/fixtures/natures";
import { buildCombatant, DEFAULT_EVS, DEFAULT_IVS } from "@/domain/battle/build";
import { applyEntryEffects } from "@/domain/mechanics/entry";
import type {
  BattleState,
  Combatant,
  StageStats,
  StatusCondition,
  Terrain,
  Weather,
} from "@/domain/types/battle";
import { NEUTRAL_STAGES } from "@/domain/types/battle";
import type { Pokemon } from "@/domain/types/pokemon";

export type PokemonRef = Pick<
  Pokemon,
  "slug" | "name" | "types" | "baseStats" | "abilities" | "moves"
>;

export interface SlotForm {
  species: string;
  hpPct: number;
  status: StatusCondition;
  stages: StageStats;
  /** Ability name; "" means use the species' first ability. */
  ability: string;
  /** Item name; "None" means no item. */
  item: string;
}

/** Items with a modeled effect, offered in the editor. */
export const COMMON_ITEMS = [
  "None",
  "Choice Band",
  "Choice Specs",
  "Choice Scarf",
  "Life Orb",
  "Assault Vest",
  "Muscle Band",
  "Wise Glasses",
  "Expert Belt",
  // Reactive items — trigger during simulations, not in a single-turn calc.
  "Sitrus Berry",
  "Weakness Policy",
  "Focus Sash",
] as const;

export interface SideForm {
  slots: [SlotForm, SlotForm];
  tailwind: boolean;
}

export interface TurnForm {
  user: SideForm;
  opponent: SideForm;
  weather: Weather;
  terrain: Terrain;
  trickRoom: boolean;
  note: string;
}

export function emptySlot(species: string): SlotForm {
  return {
    species,
    hpPct: 100,
    status: "none",
    stages: { ...NEUTRAL_STAGES },
    ability: "",
    item: "None",
  };
}

export function combatantFromRef(
  ref: PokemonRef,
  slot: SlotForm,
): Combatant {
  const ability =
    slot.ability && ref.abilities.includes(slot.ability)
      ? slot.ability
      : (ref.abilities[0] ?? null);
  const item = slot.item && slot.item !== "None" ? slot.item : null;
  const c = buildCombatant({
    species: ref.slug,
    name: ref.name,
    types: ref.types,
    baseStats: ref.baseStats,
    moves: ref.moves,
    level: 50,
    ivs: DEFAULT_IVS,
    evs: DEFAULT_EVS,
    nature: natureByName("Serious"),
    hpFraction: slot.hpPct / 100,
    status: slot.status,
    ability,
    item,
    tier: "entered",
  });
  return { ...c, stages: { ...slot.stages } };
}

/** Build the raw (pre-entry-effect) state from form + references. */
function buildRawState(
  form: TurnForm,
  refBySlug: Map<string, PokemonRef>,
): BattleState | null {
  function side(sideForm: SideForm): {
    active: [Combatant | null, Combatant | null];
  } | null {
    const built = sideForm.slots.map((s) => {
      const ref = refBySlug.get(s.species);
      return ref ? combatantFromRef(ref, s) : null;
    });
    if (!built[0] || !built[1]) return null;
    return { active: [built[0], built[1]] };
  }

  const u = side(form.user);
  const o = side(form.opponent);
  if (!u || !o) return null;

  return {
    turn: 1,
    field: { weather: form.weather, terrain: form.terrain, trickRoom: form.trickRoom },
    user: { active: u.active, bench: [], conditions: sideConditions(form.user) },
    opponent: {
      active: o.active,
      bench: [],
      conditions: sideConditions(form.opponent),
    },
  };
}

/**
 * Build a battle state with on-entry ability effects (Intimidate, weather /
 * terrain setters) applied, plus a log of what fired. Deterministic and
 * idempotent — always computed fresh from the form.
 */
export function buildStateWithEntry(
  form: TurnForm,
  refBySlug: Map<string, PokemonRef>,
): { state: BattleState; entryLog: string[] } | null {
  const raw = buildRawState(form, refBySlug);
  if (!raw) return null;
  const { state, log } = applyEntryEffects(raw);
  return { state, entryLog: log };
}

export function buildState(
  form: TurnForm,
  refBySlug: Map<string, PokemonRef>,
): BattleState | null {
  return buildStateWithEntry(form, refBySlug)?.state ?? null;
}

function sideConditions(side: SideForm) {
  return {
    tailwind: side.tailwind,
    reflect: false,
    lightScreen: false,
    auroraVeil: false,
  };
}
