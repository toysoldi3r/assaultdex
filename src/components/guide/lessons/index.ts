// Lesson id → lesson body. Ids match src/data/guideLessons.ts.

import type { ComponentType } from "react";
import { AbilitiesItemsLesson } from "./abilities-items";
import { StartHereLesson, StatsLesson, TypingLesson } from "./basics";
import { DamageLesson } from "./damage";
import { StatusLesson, TurnOrderLesson } from "./moves-turns";
import {
  BuildingATeamLesson, CoresArchetypesLesson, FieldHazardsLesson, PositioningPredictionLesson,
  ProtectionTargetingLesson, RolesSynergyLesson, WinConditionsLesson,
} from "./simple";
import { SwitchingLesson } from "./switching";

export const LESSON_BODIES: Record<string, ComponentType> = {
  "start-here": StartHereLesson,
  stats: StatsLesson,
  typing: TypingLesson,
  "abilities-items": AbilitiesItemsLesson,
  damage: DamageLesson,
  "turn-order": TurnOrderLesson,
  status: StatusLesson,
  switching: SwitchingLesson,
  "field-hazards": FieldHazardsLesson,
  "protection-targeting": ProtectionTargetingLesson,
  "positioning-prediction": PositioningPredictionLesson,
  "win-conditions": WinConditionsLesson,
  "roles-synergy": RolesSynergyLesson,
  "cores-archetypes": CoresArchetypesLesson,
  "building-a-team": BuildingATeamLesson,
};
