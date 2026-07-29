// Parse and validate a provisional replay, reporting unsupported/contradictory
// data (spec). Validation (Zod) lives in the data layer; the reconstructed
// Replay is a domain type consumed by the analysis engine.

import type { Replay } from "@/domain/replay/types";
import { replaySchema } from "./schemas/battle";

export interface ParseReplayResult {
  ok: boolean;
  replay?: Replay;
  errors: string[];
  warnings: string[];
}

export function parseReplay(raw: unknown): ParseReplayResult {
  const parsed = replaySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(
        (i) => `${i.path.join(".") || "root"}: ${i.message}`,
      ),
      warnings: [],
    };
  }

  const data = parsed.data;
  const warnings: string[] = [];

  data.turns.forEach((turn, i) => {
    const sides = { user: turn.state.user, opponent: turn.state.opponent };
    for (const action of [...turn.userAction, ...turn.opponentAction]) {
      const side = sides[action.side];
      const actor = side.active[action.slot];
      if (!actor) {
        warnings.push(`Turn ${i + 1}: ${action.side} slot ${action.slot} action references an empty slot.`);
        continue;
      }
      if (actor.fainted) {
        warnings.push(`Turn ${i + 1}: ${actor.name} acted while fainted.`);
      }
      if (action.kind === "move" && !actor.moves.some((m) => m.name === action.moveName)) {
        warnings.push(`Turn ${i + 1}: ${actor.name} used unknown move “${action.moveName}”.`);
      }
    }
  });

  return {
    ok: true,
    replay: data as unknown as Replay,
    errors: [],
    warnings,
  };
}
