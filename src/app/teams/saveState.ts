// Shared state shape for the team editor's save action. Kept in a plain module
// (not the "use server" actions file, which may only export async functions).

import type { ValidationIssue } from "@/domain/team/validate";

export interface SaveVersionState {
  ok: boolean;
  message: string;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export const EMPTY_SAVE_STATE: SaveVersionState = {
  ok: false,
  message: "",
  errors: [],
  warnings: [],
};
