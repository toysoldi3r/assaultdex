import type { PokemonType } from "@/domain/types/pokemon";

export type MoveCategory = "physical" | "special" | "status";

export interface MoveMeta {
  type: PokemonType;
  category: MoveCategory;
  power: number | null;
  /** null = bypasses accuracy (never misses). */
  accuracy: number | null;
  pp: number | null;
  desc?: string;
}
