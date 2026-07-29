"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createTeamSchema,
  teamSnapshotSchema,
  type TeamSnapshotInput,
} from "@/data/schemas/team";
import { DEFAULT_EVS, DEFAULT_IVS } from "@/domain/battle/build";
import { STAT_KEYS, type PokemonSet, type StatKey } from "@/domain/types/pokemon";
import { EMPTY_SAVE_STATE, type SaveVersionState } from "./saveState";
import {
  addTeamVersion,
  assignTeamToCollection,
  createCollection,
  createTeam,
  deleteTeam,
  duplicateTeam,
  restoreVersion,
  updateTeamNotes,
} from "@/server/repositories/teamRepo";
import { getPokemonBySlug } from "@/server/repositories/pokemonRepo";
import { resolveTeam } from "@/server/teamResolve";

/** Build a default PokemonSet from a reference species. */
async function defaultSetFor(species: string): Promise<PokemonSet | null> {
  const ref = await getPokemonBySlug(species);
  if (!ref) return null;
  return {
    species: ref.slug,
    level: 50,
    ability: null,
    item: null,
    nature: "Serious",
    moves: ref.moves.slice(0, 4).map((m) => m.name),
    spread: { ivs: { ...DEFAULT_IVS }, evs: { ...DEFAULT_EVS } },
  };
}

export async function createTeamAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const collectionId = String(formData.get("collectionId") ?? "").trim() || null;
  const species = formData.getAll("species").map(String).filter(Boolean);

  const members: PokemonSet[] = [];
  for (const s of species.slice(0, 6)) {
    const set = await defaultSetFor(s);
    if (set) members.push(set);
  }

  const snapshot: TeamSnapshotInput = { members };
  const input = createTeamSchema.parse({ name, collectionId, snapshot });
  const id = await createTeam(input);
  revalidatePath("/teams");
  redirect(`/teams/${id}`);
}

export async function createCollectionAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  if (name) await createCollection(name);
  revalidatePath("/teams");
}

export async function assignCollectionAction(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const collectionId = String(formData.get("collectionId") ?? "").trim() || null;
  if (teamId) await assignTeamToCollection(teamId, collectionId);
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
}

function statBlockFromForm(
  formData: FormData,
  prefix: string,
  fallback: (k: StatKey) => number,
): Record<StatKey, number> {
  const out = {} as Record<StatKey, number>;
  for (const k of STAT_KEYS) {
    const raw = formData.get(`${prefix}_${k}`);
    const n = Number(raw);
    out[k] = raw !== null && Number.isFinite(n) ? n : fallback(k);
  }
  return out;
}

/** Rebuild a full snapshot from the editor form. */
function parseSnapshotFromForm(formData: FormData): TeamSnapshotInput {
  const count = Number(formData.get("memberCount") ?? 0);
  const members: PokemonSet[] = [];
  for (let i = 0; i < count; i++) {
    const species = String(formData.get(`species_${i}`) ?? "").trim();
    if (!species) continue;
    const moves = [0, 1, 2, 3]
      .map((j) => String(formData.get(`move_${i}_${j}`) ?? "").trim())
      .filter(Boolean);
    const level = Number(formData.get(`level_${i}`) ?? 50);
    members.push({
      species,
      level: Number.isFinite(level) ? Math.max(1, Math.min(100, level)) : 50,
      ability: String(formData.get(`ability_${i}`) ?? "").trim() || null,
      item: String(formData.get(`item_${i}`) ?? "").trim() || null,
      nature: String(formData.get(`nature_${i}`) ?? "Serious").trim() || "Serious",
      moves,
      spread: {
        ivs: statBlockFromForm(formData, `iv_${i}`, () => 31),
        evs: statBlockFromForm(formData, `ev_${i}`, () => 0),
      },
    });
  }
  return { members };
}

/**
 * Validate the edited team and, if legal, save it as a new immutable version.
 * Returns validation results so the editor can display them (nothing is saved
 * when the team is illegal).
 */
export async function saveVersionAction(
  _prev: SaveVersionState,
  formData: FormData,
): Promise<SaveVersionState> {
  const teamId = String(formData.get("teamId") ?? "");
  const label = String(formData.get("label") ?? "").trim() || undefined;
  if (!teamId) {
    return { ...EMPTY_SAVE_STATE, message: "Missing team." };
  }

  const snapshot = teamSnapshotSchema.parse(parseSnapshotFromForm(formData));
  const { validation } = await resolveTeam(snapshot);

  if (!validation.valid) {
    return {
      ok: false,
      message: "Not saved — fix the errors below.",
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  const versionNumber = await addTeamVersion(teamId, snapshot, label);
  revalidatePath(`/teams/${teamId}`);
  return {
    ok: true,
    message: `Saved as v${versionNumber}.`,
    errors: [],
    warnings: validation.warnings,
  };
}

export async function duplicateTeamAction(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const id = teamId ? await duplicateTeam(teamId) : null;
  revalidatePath("/teams");
  if (id) redirect(`/teams/${id}`);
}

export async function deleteTeamAction(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  if (teamId) await deleteTeam(teamId);
  revalidatePath("/teams");
  redirect("/teams");
}

export async function restoreVersionAction(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const versionNumber = Number(formData.get("versionNumber"));
  if (teamId && Number.isFinite(versionNumber)) {
    await restoreVersion(teamId, versionNumber);
  }
  revalidatePath(`/teams/${teamId}`);
}

export async function updateNotesAction(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const notes = String(formData.get("notes") ?? "");
  if (teamId) await updateTeamNotes(teamId, notes);
  revalidatePath(`/teams/${teamId}`);
}

export async function importTeamAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim() || "Imported team";
  const json = String(formData.get("json") ?? "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    redirect("/teams?import=invalid-json");
  }
  const result = teamSnapshotSchema.safeParse(parsed);
  if (!result.success) {
    redirect("/teams?import=invalid-shape");
  }
  const input = createTeamSchema.parse({
    name,
    collectionId: null,
    snapshot: result.data,
  });
  const id = await createTeam(input);
  revalidatePath("/teams");
  redirect(`/teams/${id}`);
}
