import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel, ProvisionalTag, TypeBadge } from "@/components/ui";
import { defensiveChart } from "@/domain/mechanics/typeEffectiveness";
import { POKEMON_TYPES, STAT_KEYS } from "@/domain/types/pokemon";
import { getPokemonBySlug } from "@/server/repositories/pokemonRepo";

export const dynamic = "force-dynamic";

const STAT_LABELS: Record<(typeof STAT_KEYS)[number], string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

function multiplierLabel(m: number): { text: string; cls: string } {
  if (m === 0) return { text: "0×", cls: "text-slate-500" };
  if (m < 1) return { text: `${m}×`, cls: "text-emerald-400" };
  if (m === 1) return { text: "1×", cls: "text-slate-400" };
  return { text: `${m}×`, cls: "text-rose-400" };
}

export default async function PokemonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getPokemonBySlug(slug);
  if (!p) notFound();

  const chart = defensiveChart(p.types);

  return (
    <div className="space-y-6">
      <Link href="/pokemon" className="text-sm text-amber-400 hover:underline">
        ← Pokédex
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{p.name}</h1>
        <div className="flex gap-1">
          {p.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Base stats">
          <ul className="space-y-1 text-sm">
            {STAT_KEYS.map((k) => (
              <li key={k} className="flex items-center gap-3">
                <span className="w-10 text-slate-400">{STAT_LABELS[k]}</span>
                <span className="w-10 tabular-nums">{p.baseStats[k]}</span>
                <span className="h-2 flex-1 overflow-hidden rounded bg-slate-800">
                  <span
                    className="block h-full bg-amber-500"
                    style={{ width: `${Math.min(100, (p.baseStats[k] / 255) * 100)}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Defensive type matchups"
        >
          <div className="mb-2">
            <ProvisionalTag />
          </div>
          <div className="grid grid-cols-3 gap-1 text-xs sm:grid-cols-4">
            {POKEMON_TYPES.map((t) => {
              const l = multiplierLabel(chart[t]);
              return (
                <div
                  key={t}
                  className="flex items-center justify-between rounded bg-slate-800/50 px-2 py-1"
                >
                  <span className="capitalize text-slate-400">{t}</span>
                  <span className={l.cls}>{l.text}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel title="Moves (fixture)">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-1">Move</th>
              <th>Type</th>
              <th>Cat.</th>
              <th className="text-right">Power</th>
              <th className="text-right">Acc.</th>
              <th className="text-right">Prio.</th>
            </tr>
          </thead>
          <tbody>
            {p.moves.map((m) => (
              <tr key={m.name} className="border-t border-slate-800">
                <td className="py-1">{m.name}</td>
                <td>
                  <TypeBadge type={m.type} />
                </td>
                <td className="capitalize text-slate-400">{m.category}</td>
                <td className="text-right tabular-nums">{m.power ?? "—"}</td>
                <td className="text-right tabular-nums">
                  {m.accuracy === null ? "—" : m.accuracy}
                </td>
                <td className="text-right tabular-nums">{m.priority}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Provenance">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-400 sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Provider</dt>
            <dd>{p.provenance.provider}</dd>
          </div>
          <div>
            <dt className="text-slate-500">External ID</dt>
            <dd>{p.provenance.externalId}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Data version</dt>
            <dd>{p.provenance.dataVersion}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Normalization</dt>
            <dd>{p.provenance.normalizationVersion}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Retrieved</dt>
            <dd>{new Date(p.provenance.retrievedAt).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd>{p.provenance.updateStatus}</dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}
