import { formatShowdownTeam } from "@/data/showdown";
import { getPokemonBySlug } from "@/server/repositories/pokemonRepo";
import { getTeam } from "@/server/repositories/teamRepo";

export const dynamic = "force-dynamic";

/** Export the team's latest version in Pokémon Showdown paste format. */
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

  // Resolve display names for each member's species slug.
  const names = new Map<string, string>();
  for (const m of latest.snapshot.members) {
    if (!names.has(m.species)) {
      const ref = await getPokemonBySlug(m.species);
      names.set(m.species, ref?.name ?? m.species);
    }
  }

  const body = formatShowdownTeam(latest.snapshot.members, (slug) => names.get(slug) ?? slug);
  const filename = `${team.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-v${latest.versionNumber}.txt`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
