"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createTeamSchema,
  teamSnapshotSchema,
  TEAM_MEMBER_LIMIT,
  type TeamSnapshotInput,
} from "@/data/schemas/team";
import { DEFAULT_EVS, DEFAULT_IVS } from "@/domain/battle/build";
import { type PokemonSet } from "@/domain/types/pokemon";
import {
  addTeamVersion,
  createCollection,
  createTeam,
  deleteTeam,
  duplicateTeam,
  getTeamIsBox,
  restoreVersion,
  updateTeamNotes,
} from "@/server/repositories/teamRepo";
import { getPokemonBySlug, listPokemon } from "@/server/repositories/pokemonRepo";
import { parseShowdownTeam } from "@/data/showdown";

/** Build a default PokemonSet from a reference species. */
async function defaultSetFor(species: string): Promise<PokemonSet | null> {
  const ref = await getPokemonBySlug(species);
  if (!ref) return null;
  return {
    species: ref.slug,
    level: 50,
    ability: ref.abilities[0] ?? null,
    item: null,
    nature: "Serious",
    moves: ref.moves.slice(0, 4).map((m) => m.name),
    spread: { ivs: { ...DEFAULT_IVS }, evs: { ...DEFAULT_EVS } },
  };
}

export async function createTeamAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim() || "Untitled";
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

/** Save the whole team snapshot as a new version (teambuilder save). Returns a
 *  short status string for the client. */
export async function saveTeamSnapshotAction(formData: FormData): Promise<string> {
  const teamId = String(formData.get("teamId") ?? "");
  if (!teamId) return "Missing team.";
  let snapshot: TeamSnapshotInput;
  try {
    snapshot = teamSnapshotSchema.parse(JSON.parse(String(formData.get("snapshot") ?? "{}")));
  } catch {
    return "Could not save: invalid team data.";
  }
  // Boxes are unbounded; ordinary teams cap at 6 (enforce server-side too).
  const isBox = await getTeamIsBox(teamId);
  if (isBox === null) return "Team not found.";
  if (!isBox && snapshot.members.length > TEAM_MEMBER_LIMIT) {
    return `Teams are limited to ${TEAM_MEMBER_LIMIT} Pokémon.`;
  }
  const version = await addTeamVersion(teamId, snapshot, "Teambuilder edit");
  revalidatePath(`/teams/${teamId}`);
  return `Saved as v${version}.`;
}

/** Delete without revalidate/redirect - the homepage manages its own list state
 *  and shows an undo affordance, so a navigation here would drop it. */
export async function deleteTeamSilentAction(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  if (teamId) await deleteTeam(teamId);
}

/** Recreate a team/box from a captured snapshot - powers undo-delete. Returns
 *  the new card so the client can slot it back in without a full reload. */
export async function recreateTeamAction(formData: FormData): Promise<{
  id: string;
  name: string;
  isBox: boolean;
  collectionId: string | null;
  members: { species: string }[];
}> {
  const name = String(formData.get("name") ?? "").trim() || "Untitled";
  const collectionId = String(formData.get("collectionId") ?? "").trim() || null;
  const isBox = String(formData.get("isBox") ?? "") === "true";
  let members: unknown = [];
  try {
    members = JSON.parse(String(formData.get("members") ?? "[]"));
  } catch {
    members = [];
  }
  const input = createTeamSchema.parse({
    name,
    collectionId,
    isBox,
    snapshot: { members },
  });
  const id = await createTeam(input);
  revalidatePath("/teams");
  return {
    id,
    name,
    isBox,
    collectionId,
    members: input.snapshot.members.map((m) => ({ species: m.species })),
  };
}

/** Create an empty box (unbounded holding list) in the current folder. */
export async function createBoxAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim() || "Box";
  const collectionId = String(formData.get("collectionId") ?? "").trim() || null;
  const input = createTeamSchema.parse({
    name,
    collectionId,
    isBox: true,
    snapshot: { members: [] },
  });
  const id = await createTeam(input);
  revalidatePath("/teams");
  redirect(`/teams/${id}`);
}

export async function createCollectionAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  if (name) await createCollection(name);
  revalidatePath("/teams");
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

/** Normalize a species name/slug for loose matching (Rotom-Wash -> rotomwash). */
function normSpecies(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function importTeamAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim() || "Imported team";
  const text = String(formData.get("text") ?? "");
  const sets = parseShowdownTeam(text);
  if (sets.length === 0) {
    redirect("/teams?import=empty");
  }

  // Resolve species names to reference slugs.
  const all = await listPokemon();
  const bySlug = new Map(all.map((p) => [normSpecies(p.slug), p]));
  const byName = new Map(all.map((p) => [normSpecies(p.name), p]));

  const members: PokemonSet[] = [];
  const unresolved: string[] = [];
  for (const s of sets.slice(0, 6)) {
    const key = normSpecies(s.speciesName);
    const ref = bySlug.get(key) ?? byName.get(key);
    if (!ref) {
      unresolved.push(s.speciesName);
      continue;
    }
    members.push({
      species: ref.slug,
      level: 50,
      ability: s.ability && ref.abilities.includes(s.ability) ? s.ability : (ref.abilities[0] ?? null),
      item: s.item,
      nature: s.nature,
      moves: s.moves.slice(0, 4),
      spread: { ivs: s.ivs, evs: s.evs },
    });
  }

  if (members.length === 0) {
    redirect("/teams?import=unresolved");
  }

  const snapshot = teamSnapshotSchema.parse({ members });
  const input = createTeamSchema.parse({ name, collectionId: null, snapshot });
  const id = await createTeam(input);
  revalidatePath("/teams");
  redirect(`/teams/${id}${unresolved.length ? "?skipped=" + encodeURIComponent(unresolved.join(",")) : ""}`);
}
