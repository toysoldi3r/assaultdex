"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createTeamSchema,
  type TeamSnapshotInput,
} from "@/data/schemas/team";
import { DEFAULT_EVS, DEFAULT_IVS } from "@/domain/battle/build";
import type { PokemonSet } from "@/domain/types/pokemon";
import {
  addTeamVersion,
  assignTeamToCollection,
  createCollection,
  createTeam,
  getTeam,
} from "@/server/repositories/teamRepo";
import { getPokemonBySlug } from "@/server/repositories/pokemonRepo";

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

/**
 * Save a new version by applying scalar edits (level, item, nature) to the
 * latest snapshot. Moves and spreads carry over from the previous version.
 */
export async function addVersionAction(formData: FormData): Promise<void> {
  const teamId = String(formData.get("teamId") ?? "");
  const label = String(formData.get("label") ?? "").trim() || undefined;
  const team = await getTeam(teamId);
  if (!team || team.versions.length === 0) return;

  const latest = team.versions[team.versions.length - 1]!;
  const members: PokemonSet[] = latest.snapshot.members.map((m) => {
    const level = Number(formData.get(`level_${m.species}`) ?? m.level);
    const itemRaw = String(formData.get(`item_${m.species}`) ?? "").trim();
    const nature = String(formData.get(`nature_${m.species}`) ?? m.nature).trim();
    return {
      ...m,
      level: Number.isFinite(level) ? Math.max(1, Math.min(100, level)) : m.level,
      item: itemRaw || null,
      nature: nature || m.nature,
    };
  });

  await addTeamVersion(teamId, { members }, label);
  revalidatePath(`/teams/${teamId}`);
}
