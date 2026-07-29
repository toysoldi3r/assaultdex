import { getTeam } from "@/server/repositories/teamRepo";

export const dynamic = "force-dynamic";

/** Export the team's latest version snapshot as downloadable JSON. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team || team.versions.length === 0) {
    return new Response("Not found", { status: 404 });
  }
  const latest = team.versions[team.versions.length - 1]!;
  const body = JSON.stringify(latest.snapshot, null, 2);
  const filename = `${team.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-v${latest.versionNumber}.json`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
