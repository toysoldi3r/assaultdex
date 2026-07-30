// Resolves a stored team snapshot into the inputs the pure domain functions
// need (reference stats/types/legal moves), then runs validation and analysis.
// Keeps the domain layer free of persistence and data-adapter imports.

import type { TeamSnapshotInput } from "@/data/schemas/team";
import { NATURES, natureByName } from "@/data/fixtures/natures";
import { analyzeTeam, type AnalysisMember, type TeamAnalysis } from "@/domain/team/analysis";
import {
  validateTeam,
  type ValidatableMember,
  type ValidationReport,
} from "@/domain/team/validate";
import type { MoveFixture } from "@/domain/types/pokemon";
import { getPokemonBySlug } from "./repositories/pokemonRepo";

const LEGAL_NATURES = Object.keys(NATURES);

export interface ResolvedTeam {
  validation: ValidationReport;
  analysis: TeamAnalysis | null;
  /** Species referenced by the snapshot but missing from the Pokédex. */
  missingSpecies: string[];
}

export async function resolveTeam(
  snapshot: TeamSnapshotInput,
): Promise<ResolvedTeam> {
  const refs = await Promise.all(
    snapshot.members.map((m) => getPokemonBySlug(m.species)),
  );

  const validatable: ValidatableMember[] = [];
  const analysable: AnalysisMember[] = [];
  const missingSpecies: string[] = [];

  snapshot.members.forEach((set, i) => {
    const ref = refs[i];
    if (!ref) {
      missingSpecies.push(set.species);
      validatable.push({
        set,
        legalMoves: [],
        legalNatures: LEGAL_NATURES,
        legalAbilities: [],
      });
      return;
    }
    const legalMoves = ref.moves.map((mv) => mv.name);
    validatable.push({
      set,
      legalMoves,
      legalNatures: LEGAL_NATURES,
      legalAbilities: ref.abilities,
    });

    const resolvedMoves: MoveFixture[] = set.moves
      .map((name) => ref.moves.find((mv) => mv.name === name))
      .filter((mv): mv is MoveFixture => Boolean(mv));

    analysable.push({
      species: ref.slug,
      name: ref.name,
      types: ref.types,
      baseStats: ref.baseStats,
      moves: resolvedMoves,
      level: set.level,
      ivs: set.spread.ivs,
      evs: set.spread.evs,
      nature: natureByName(set.nature),
    });
  });

  return {
    validation: validateTeam(validatable),
    analysis: analysable.length > 0 ? analyzeTeam(analysable) : null,
    missingSpecies,
  };
}
