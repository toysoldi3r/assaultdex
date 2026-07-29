// Team legality validation. Pure: takes resolved member sets plus each
// species' legal move list, returns a structured report. Rules that depend on
// Champions-specific legality (e.g. which abilities/items are legal) are marked
// provisional and only checked when reference data is supplied.

import { STAT_KEYS, type PokemonSet } from "../types/pokemon";

export const MAX_EV_TOTAL = 508;
export const MAX_EV_PER_STAT = 252;
export const MAX_TEAM_SIZE = 6;

export interface ValidationIssue {
  memberIndex: number | null; // null = team-level
  species: string | null;
  field: string;
  message: string;
}

export interface ValidationReport {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidatableMember {
  set: PokemonSet;
  /** Move names legal for this species (from reference data). */
  legalMoves: string[];
  /** Known nature names. */
  legalNatures: string[];
}

export function validateTeam(members: ValidatableMember[]): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (members.length === 0) {
    errors.push({
      memberIndex: null,
      species: null,
      field: "team",
      message: "A team needs at least one Pokémon.",
    });
  }
  if (members.length > MAX_TEAM_SIZE) {
    errors.push({
      memberIndex: null,
      species: null,
      field: "team",
      message: `A team may have at most ${MAX_TEAM_SIZE} Pokémon.`,
    });
  }

  // Species clause (doubles): no duplicate species.
  const seen = new Map<string, number>();
  members.forEach((m, i) => {
    const prev = seen.get(m.set.species);
    if (prev !== undefined) {
      errors.push({
        memberIndex: i,
        species: m.set.species,
        field: "species",
        message: `Duplicate species (also slot ${prev + 1}).`,
      });
    } else {
      seen.set(m.set.species, i);
    }
  });

  members.forEach((m, i) => {
    const { set } = m;
    const issue = (field: string, message: string, warn = false) =>
      (warn ? warnings : errors).push({
        memberIndex: i,
        species: set.species,
        field,
        message,
      });

    if (set.level < 1 || set.level > 100) {
      issue("level", "Level must be between 1 and 100.");
    }

    // Moves: 1..4, unique, legal for the species.
    if (set.moves.length === 0) issue("moves", "At least one move is required.");
    if (set.moves.length > 4) issue("moves", "A set may have at most 4 moves.");
    if (new Set(set.moves).size !== set.moves.length) {
      issue("moves", "Duplicate moves are not allowed.");
    }
    if (m.legalMoves.length > 0) {
      for (const mv of set.moves) {
        if (!m.legalMoves.includes(mv)) {
          issue("moves", `“${mv}” is not a legal move for this species.`);
        }
      }
    }

    if (m.legalNatures.length > 0 && !m.legalNatures.includes(set.nature)) {
      issue("nature", `Unknown nature “${set.nature}”.`);
    }

    // EVs / IVs.
    let evTotal = 0;
    for (const k of STAT_KEYS) {
      const ev = set.spread.evs[k];
      const iv = set.spread.ivs[k];
      evTotal += ev;
      if (ev < 0 || ev > MAX_EV_PER_STAT) {
        issue("evs", `${k.toUpperCase()} EVs must be 0–${MAX_EV_PER_STAT}.`);
      }
      if (ev % 4 !== 0) {
        issue("evs", `${k.toUpperCase()} EVs should be a multiple of 4.`, true);
      }
      if (iv < 0 || iv > 31) {
        issue("ivs", `${k.toUpperCase()} IVs must be 0–31.`);
      }
    }
    if (evTotal > MAX_EV_TOTAL) {
      issue("evs", `Total EVs ${evTotal} exceed the ${MAX_EV_TOTAL} cap.`);
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}
