// Provisional replay types (Phase 9). No confirmed Champions replay format
// exists, so this internal shape is used for fixtures/testing and is replaced
// when a real format is confirmed. A ReplayTurn stores the pre-decision battle
// state plus the actions actually taken by each side.

import type { ActionCombination } from "../mechanics/legalActions";
import type { BattleState } from "../types/battle";

export interface ReplayTurn {
  state: BattleState;
  userAction: ActionCombination;
  opponentAction: ActionCombination;
}

export interface Replay {
  format: string;
  players: [string, string];
  userTeam: string[];
  opponentTeam: string[];
  turns: ReplayTurn[];
}
