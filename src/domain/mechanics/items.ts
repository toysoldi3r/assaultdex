// Item effects. A hand-coded registry of common competitive items' documented
// mainline effects, applied as multipliers in the damage and speed engines.
// Provisional for Champions (ASSUMPTIONS.itemEffects). Unlisted items have no
// modeled effect.

import type { Combatant } from "../types/battle";
import type { MoveFixture, PokemonType } from "../types/pokemon";

/** Type-boosting held items → the type they boost by ×1.2. */
const TYPE_BOOST_ITEMS: Record<string, PokemonType> = {
  Charcoal: "fire",
  "Mystic Water": "water",
  "Miracle Seed": "grass",
  Magnet: "electric",
  "Never-Melt Ice": "ice",
  "Black Belt": "fighting",
  "Poison Barb": "poison",
  "Soft Sand": "ground",
  "Sharp Beak": "flying",
  "Twisted Spoon": "psychic",
  "Silver Powder": "bug",
  "Hard Stone": "rock",
  "Spell Tag": "ghost",
  "Dragon Fang": "dragon",
  "Black Glasses": "dark",
  "Metal Coat": "steel",
  "Fairy Feather": "fairy",
  "Silk Scarf": "normal",
};

export interface ItemContext {
  attacker: Combatant;
  defender: Combatant;
  move: MoveFixture;
  moveType: PokemonType;
  isPhysical: boolean;
  effectiveness: number;
}

/** Offensive damage multiplier from the attacker's held item. */
export function itemOffense(ctx: ItemContext): number {
  const { attacker, moveType, isPhysical, effectiveness } = ctx;
  const item = attacker.item;
  if (!item) return 1;

  if (TYPE_BOOST_ITEMS[item] === moveType) return 1.2;

  switch (item) {
    case "Choice Band":
      return isPhysical ? 1.5 : 1;
    case "Choice Specs":
      return !isPhysical ? 1.5 : 1;
    case "Life Orb":
      return 1.3;
    case "Muscle Band":
      return isPhysical ? 1.1 : 1;
    case "Wise Glasses":
      return !isPhysical ? 1.1 : 1;
    case "Expert Belt":
      return effectiveness > 1 ? 1.2 : 1;
    default:
      return 1;
  }
}

/** Defensive damage multiplier from the defender's held item. */
export function itemDefense(ctx: ItemContext): number {
  const { defender, isPhysical } = ctx;
  switch (defender.item) {
    case "Assault Vest":
      return !isPhysical ? 2 / 3 : 1; // ×1.5 SpD ⇒ ×2/3 damage
    default:
      return 1;
  }
}

/** Speed multiplier from a combatant's held item. */
export function itemSpeed(combatant: Combatant): number {
  switch (combatant.item) {
    case "Choice Scarf":
      return 1.5;
    case "Iron Ball":
      return 0.5;
    default:
      return 1;
  }
}
