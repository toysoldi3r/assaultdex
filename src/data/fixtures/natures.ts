// Nature fixture data (public, documented). Each nature boosts one stat 10%
// and lowers another 10%; five are neutral (boost === lower).

import type { Nature, StatKey } from "@/domain/types/pokemon";

const N = (name: string, boosted: StatKey, lowered: StatKey): Nature => ({
  name,
  boosted,
  lowered,
});

export const NATURES: Record<string, Nature> = {
  Hardy: N("Hardy", "atk", "atk"),
  Lonely: N("Lonely", "atk", "def"),
  Brave: N("Brave", "atk", "spe"),
  Adamant: N("Adamant", "atk", "spa"),
  Naughty: N("Naughty", "atk", "spd"),
  Bold: N("Bold", "def", "atk"),
  Docile: N("Docile", "def", "def"),
  Relaxed: N("Relaxed", "def", "spe"),
  Impish: N("Impish", "def", "spa"),
  Lax: N("Lax", "def", "spd"),
  Timid: N("Timid", "spe", "atk"),
  Hasty: N("Hasty", "spe", "def"),
  Serious: N("Serious", "spe", "spe"),
  Jolly: N("Jolly", "spe", "spa"),
  Naive: N("Naive", "spe", "spd"),
  Modest: N("Modest", "spa", "atk"),
  Mild: N("Mild", "spa", "def"),
  Quiet: N("Quiet", "spa", "spe"),
  Bashful: N("Bashful", "spa", "spa"),
  Rash: N("Rash", "spa", "spd"),
  Calm: N("Calm", "spd", "atk"),
  Gentle: N("Gentle", "spd", "def"),
  Sassy: N("Sassy", "spd", "spe"),
  Careful: N("Careful", "spd", "spa"),
  Quirky: N("Quirky", "spd", "spd"),
};

export function natureByName(name: string): Nature {
  return NATURES[name] ?? NATURES.Serious!;
}
