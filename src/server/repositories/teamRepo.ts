// Team / version / collection repository. Snapshots are stored as validated
// JSON strings and re-validated on read.

import { prisma } from "../db";
import {
  teamSnapshotSchema,
  type CreateTeamInput,
  type TeamSnapshotInput,
} from "@/data/schemas/team";

export interface TeamVersionView {
  id: string;
  versionNumber: number;
  label: string | null;
  createdAt: Date;
  snapshot: TeamSnapshotInput;
}

export interface TeamView {
  id: string;
  name: string;
  notes: string;
  collectionId: string | null;
  collectionName: string | null;
  createdAt: Date;
  versions: TeamVersionView[];
}

function parseSnapshot(raw: string): TeamSnapshotInput {
  return teamSnapshotSchema.parse(JSON.parse(raw));
}

// ---- Collections ----------------------------------------------------------

export async function createCollection(name: string) {
  return prisma.collection.create({ data: { name } });
}

export async function listCollections() {
  return prisma.collection.findMany({ orderBy: { createdAt: "desc" } });
}

// ---- Teams ----------------------------------------------------------------

/** Create a team and its first immutable version. */
export async function createTeam(input: CreateTeamInput): Promise<string> {
  const snapshot = teamSnapshotSchema.parse(input.snapshot);
  const team = await prisma.team.create({
    data: {
      name: input.name,
      collectionId: input.collectionId ?? null,
      versions: {
        create: {
          versionNumber: 1,
          label: "Initial version",
          snapshot: JSON.stringify(snapshot),
        },
      },
    },
  });
  return team.id;
}

/** Append a new immutable version to a team. */
export async function addTeamVersion(
  teamId: string,
  snapshot: TeamSnapshotInput,
  label?: string,
): Promise<number> {
  const parsed = teamSnapshotSchema.parse(snapshot);
  const last = await prisma.teamVersion.findFirst({
    where: { teamId },
    orderBy: { versionNumber: "desc" },
  });
  const versionNumber = (last?.versionNumber ?? 0) + 1;
  await prisma.teamVersion.create({
    data: {
      teamId,
      versionNumber,
      label: label ?? null,
      snapshot: JSON.stringify(parsed),
    },
  });
  return versionNumber;
}

export async function assignTeamToCollection(
  teamId: string,
  collectionId: string | null,
) {
  await prisma.team.update({
    where: { id: teamId },
    data: { collectionId },
  });
}

export async function listTeams(): Promise<TeamView[]> {
  const teams = await prisma.team.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      collection: true,
      versions: { orderBy: { versionNumber: "asc" } },
    },
  });
  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    notes: t.notes,
    collectionId: t.collectionId,
    collectionName: t.collection?.name ?? null,
    createdAt: t.createdAt,
    versions: t.versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      label: v.label,
      createdAt: v.createdAt,
      snapshot: parseSnapshot(v.snapshot),
    })),
  }));
}

export async function getTeam(id: string): Promise<TeamView | null> {
  const t = await prisma.team.findUnique({
    where: { id },
    include: {
      collection: true,
      versions: { orderBy: { versionNumber: "asc" } },
    },
  });
  if (!t) return null;
  return {
    id: t.id,
    name: t.name,
    notes: t.notes,
    collectionId: t.collectionId,
    collectionName: t.collection?.name ?? null,
    createdAt: t.createdAt,
    versions: t.versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      label: v.label,
      createdAt: v.createdAt,
      snapshot: parseSnapshot(v.snapshot),
    })),
  };
}

export async function updateTeamNotes(teamId: string, notes: string) {
  await prisma.team.update({ where: { id: teamId }, data: { notes } });
}

export async function deleteTeam(teamId: string) {
  await prisma.team.delete({ where: { id: teamId } });
}

/** Copy a team (and its latest snapshot) into a new team. */
export async function duplicateTeam(teamId: string): Promise<string | null> {
  const source = await getTeam(teamId);
  if (!source || source.versions.length === 0) return null;
  const latest = source.versions[source.versions.length - 1]!;
  const copy = await prisma.team.create({
    data: {
      name: `${source.name} (copy)`,
      notes: source.notes,
      collectionId: source.collectionId,
      versions: {
        create: {
          versionNumber: 1,
          label: `Copied from v${latest.versionNumber}`,
          snapshot: JSON.stringify(latest.snapshot),
        },
      },
    },
  });
  return copy.id;
}

/** Restore an earlier version by appending it as a new latest version. */
export async function restoreVersion(
  teamId: string,
  versionNumber: number,
): Promise<number | null> {
  const source = await prisma.teamVersion.findUnique({
    where: { teamId_versionNumber: { teamId, versionNumber } },
  });
  if (!source) return null;
  return addTeamVersion(
    teamId,
    parseSnapshot(source.snapshot),
    `Restored from v${versionNumber}`,
  );
}
