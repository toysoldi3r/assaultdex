import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel, ProvisionalTag } from "@/components/ui";
import { TeamBuilder, type MemberRef } from "@/components/teams/TeamBuilder";
import { NATURES } from "@/data/fixtures/natures";
import { itemCatalog, poolDescMaps } from "@/data/catalog";
import { getMonTournament } from "@/data/tournamentStats";
import { usageKey } from "@/data/usageStats";
import { listPokemon } from "@/server/repositories/pokemonRepo";
import { getTeam } from "@/server/repositories/teamRepo";
import { resolveTeam } from "@/server/teamResolve";
import { TeamMenu, type MenuVersion } from "@/components/teams/TeamMenu";

export const dynamic = "force-dynamic";

const NATURE_NAMES = Object.keys(NATURES);

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) notFound();

  const latest = team.versions[team.versions.length - 1]!;
  // Legality/analysis only apply to real teams; a box is an unbounded holding
  // list, so running the 6-member team rules over it is meaningless.
  const resolved = team.isBox ? null : await resolveTeam(latest.snapshot);

  // Teambuilder needs a reference (name, abilities, legal moves, base stats) for
  // every pool species so newly added members render too.
  const allMons = await listPokemon();
  const memberRefs: Record<string, MemberRef> = {};
  for (const p of allMons) {
    memberRefs[p.slug] = {
      name: p.name,
      abilities: p.abilities,
      legalMoves: p.moves.map((mv) => mv.name),
      baseStats: p.baseStats,
    };
  }
  const pool = allMons.map((p) => ({ slug: p.slug, name: p.name }));

  // Description maps for the picker panels (memoised — the pool is static).
  const { abilityDesc, moveDesc } = poolDescMaps(allMons);
  const items = itemCatalog();

  // Tournament "Popular" lists per pool species (empty until the CI snapshot
  // is populated). Keyed by @pkmn id to match the teambuilder lookup.
  const tournament: Record<
    string,
    { items: { name: string; pct: number }[]; abilities: { name: string; pct: number }[]; moves: { name: string; pct: number }[] }
  > = {};
  for (const p of allMons) {
    const t = getMonTournament(p.name);
    if (t) tournament[usageKey(p.name)] = { items: t.items, abilities: t.abilities, moves: t.moves };
  }

  const menuVersions: MenuVersion[] = team.versions.map((v) => ({
    versionNumber: v.versionNumber,
    label: v.label,
    members: v.snapshot.members.length,
    createdAt: v.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <Link href="/teams" className="text-sm text-amber-400 hover:underline">
        ← Teams
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{team.name}</h1>
        <TeamMenu
          teamId={team.id}
          notes={team.notes}
          versions={menuVersions}
          latest={latest.versionNumber}
        />
      </div>

      {/* Validation of the latest version (teams only, not boxes) */}
      {resolved && (
        <Panel title="Legality">
          {resolved.missingSpecies.length > 0 && (
            <p className="mb-2 text-xs text-amber-300">
              Missing from Pokédex: {resolved.missingSpecies.join(", ")}
            </p>
          )}
          {resolved.validation.valid ? (
            <p className="text-sm text-emerald-400">
              Latest version (v{latest.versionNumber}) is legal.
            </p>
          ) : (
            <div>
              <p className="text-sm text-rose-400">
                Latest version has {resolved.validation.errors.length} error(s).
              </p>
              <ul className="mt-1 list-disc pl-5 text-xs text-rose-400">
                {resolved.validation.errors.map((e, i) => (
                  <li key={i}>
                    {e.species ? `${e.species}: ` : ""}
                    {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {resolved.validation.warnings.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs text-amber-300">
              {resolved.validation.warnings.map((w, i) => (
                <li key={i}>
                  {w.species ? `${w.species}: ` : ""}
                  {w.message}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {/* Basic team analysis */}
      {resolved?.analysis && (
        <Panel title="Team analysis">
          <div className="mb-3">
            <ProvisionalTag />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase text-slate-500">
                Defensive weaknesses
              </h3>
              <ul className="mt-1 space-y-0.5 text-xs">
                {resolved.analysis.weaknesses.slice(0, 8).map((w) => (
                  <li
                    key={w.type}
                    className={w.shared ? "text-rose-300" : "text-slate-400"}
                  >
                    <span className="capitalize">{w.type}</span> ×
                    {w.members.length}
                    {w.shared ? " (shared)" : ""}: {w.members.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase text-slate-500">
                Offensive coverage gaps
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {resolved.analysis.offensiveGaps.length === 0
                  ? "No super-effective gaps against single types."
                  : `No super-effective answer to: ${resolved.analysis.offensiveGaps.join(", ")}.`}
              </p>
              <h3 className="mt-3 text-xs font-semibold uppercase text-slate-500">
                Speed tiers
              </h3>
              <ul className="mt-1 text-xs text-slate-400">
                {resolved.analysis.speedTiers.map((s) => (
                  <li key={s.name}>
                    {s.name}: {s.speed}
                  </li>
                ))}
              </ul>
              <h3 className="mt-3 text-xs font-semibold uppercase text-slate-500">
                Speed control
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {resolved.analysis.speedControl.missing
                  ? "None detected (no priority or speed-control moves)."
                  : [
                      resolved.analysis.speedControl.hasPriority ? "priority moves" : null,
                      resolved.analysis.speedControl.controlMoves.length
                        ? `${resolved.analysis.speedControl.controlMoves.length} control move(s)`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(", ")}
              </p>
              {resolved.analysis.dependence.note && (
                <p className="mt-2 text-xs text-amber-300">
                  {resolved.analysis.dependence.note}
                </p>
              )}
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Teambuilder">
        <TeamBuilder
          teamId={team.id}
          isBox={team.isBox}
          initialMembers={latest.snapshot.members}
          refs={memberRefs}
          pool={pool}
          natures={NATURE_NAMES}
          items={items}
          abilityDesc={abilityDesc}
          moveDesc={moveDesc}
          tournament={tournament}
        />
      </Panel>
    </div>
  );
}
