"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PokeIcon } from "@/components/PokeIcon";
import { TypeBadge } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import { POKEMON_TYPES, type PokemonType } from "@/domain/types/pokemon";
import type { DbMove } from "@/data/dexDatabase";
import type { MoveCategory } from "@/components/teams/moveTypes";
import type { PokemonMovepool } from "./DatabaseApp";
import { useInfinite } from "./useInfinite";

const classLabel = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);
const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

type SortKey = "name" | "type" | "class" | "power" | "accuracy" | "pp" | "priority" | "popularity";
type Dir = "asc" | "desc";
type LearnMode = "union" | "shared" | "differing";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "type", label: "Type" },
  { key: "class", label: "Class" },
  { key: "power", label: "Power" },
  { key: "accuracy", label: "Accuracy" },
  { key: "pp", label: "PP" },
  { key: "priority", label: "Priority" },
  { key: "popularity", label: "Popularity / usage" },
];

// Null numeric values always sort last, regardless of direction.
const nkey = (v: number | null, dir: Dir) => (v == null ? (dir === "asc" ? Infinity : -Infinity) : v);

export function MovesTable({
  moves = [],
  championsMoves = [],
  pokemonMovepools = [],
  moveUsage = {},
}: {
  moves?: DbMove[];
  championsMoves?: string[];
  pokemonMovepools?: PokemonMovepool[];
  moveUsage?: Record<string, number>;
}) {
  const router = useRouter();
  const champs = useMemo(() => new Set(championsMoves), [championsMoves]);
  // With no Champions roster loaded (e.g. an unseeded DB) the Champions scope
  // would be empty; fall back to the full list so data still shows.
  const champsAvailable = champs.size > 0;
  const [q, setQ] = useState("");
  const [champsOnly, setChampsOnly] = useState(true);
  const [advanced, setAdvanced] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [dir, setDir] = useState<Dir>("asc");
  const [monQuery, setMonQuery] = useState("");
  const [learnMode, setLearnMode] = useState<LearnMode>("union");

  // Resolve the typed Pokémon names against the pool. Each entered mon carries
  // its learnable-move set so we can union / intersect them below.
  const { matched, unknown } = useMemo(() => {
    const byId = new Map(pokemonMovepools.map((p) => [toId(p.name), p]));
    const tokens = monQuery.split(",").map((t) => t.trim()).filter(Boolean);
    const matched: { name: string; slug: string; set: Set<string> }[] = [];
    const unknown: string[] = [];
    const seen = new Set<string>();
    for (const t of tokens) {
      const id = toId(t);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const p = byId.get(id);
      if (p) matched.push({ name: p.name, slug: p.slug, set: new Set(p.moves) });
      else unknown.push(t);
    }
    return { matched, unknown };
  }, [monQuery, pokemonMovepools]);

  const monFilterActive = matched.length > 0;

  // The learnable-move set for the current mode: union (any), shared (all), or
  // differing (some but not all). Empty when no mon is entered.
  const learnSet = useMemo(() => {
    if (!monFilterActive) return null;
    const union = new Set<string>();
    for (const m of matched) for (const mv of m.set) union.add(mv);
    if (learnMode === "union") return union;
    const inAll = (mv: string) => matched.every((m) => m.set.has(mv));
    const out = new Set<string>();
    for (const mv of union) {
      if (learnMode === "shared" ? inAll(mv) : !inAll(mv)) out.add(mv);
    }
    return out;
  }, [matched, monFilterActive, learnMode]);

  const inScope = (m: DbMove) =>
    (!champsOnly || !champsAvailable || champs.has(m.name)) &&
    (!learnSet || learnSet.has(m.name));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scopeCount = useMemo(() => moves.filter(inScope).length, [moves, champsOnly, champsAvailable, champs, learnSet]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    const out = moves.filter((m) => inScope(m) && (!n || m.name.toLowerCase().includes(n)));
    const s = dir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      let d = 0;
      switch (sortKey) {
        case "name": d = a.name.localeCompare(b.name); break;
        case "type": d = a.type.localeCompare(b.type) || a.name.localeCompare(b.name); break;
        case "class": d = a.category.localeCompare(b.category) || a.name.localeCompare(b.name); break;
        case "power": d = nkey(a.power, dir) - nkey(b.power, dir); break;
        case "accuracy": d = nkey(a.accuracy, dir) - nkey(b.accuracy, dir); break;
        case "pp": d = nkey(a.pp, dir) - nkey(b.pp, dir); break;
        case "priority": d = a.priority - b.priority; break;
        case "popularity": d = (moveUsage[a.name] ?? 0) - (moveUsage[b.name] ?? 0); break;
      }
      // Null numerics already pinned to the bottom by nkey; don't re-flip them.
      return d * s;
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moves, q, champsOnly, champsAvailable, champs, learnSet, sortKey, dir, moveUsage]);

  const sig = `${q}|${champsOnly}|${sortKey}|${dir}|${monQuery}|${learnMode}`;
  const { visible, sentinel, shown } = useInfinite(filtered, sig, 50);

  const cols = monFilterActive ? 9 : 8;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${scopeCount} ${champsOnly ? "Champions" : ""} moves…`}
          className="w-56 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
        />
        <div className="flex overflow-hidden rounded border border-slate-700">
          <button onClick={() => setChampsOnly(true)} className={`px-3 py-1.5 ${champsOnly ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`}>Champions</button>
          <button onClick={() => setChampsOnly(false)} className={`px-3 py-1.5 ${!champsOnly ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`}>Full list</button>
        </div>
        <button
          onClick={() => setAdvanced((a) => !a)}
          className={`rounded border px-3 py-1.5 ${advanced ? "border-amber-500 text-amber-300" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}
        >
          Advanced filters {advanced ? "▲" : "▼"}
        </button>
        <span className="text-slate-500">{shown} / {filtered.length} shown</span>
      </div>

      {advanced && (
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs">
          {/* Sort controls */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">Sort by</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-200"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            <div className="flex overflow-hidden rounded border border-slate-700">
              <button onClick={() => setDir("asc")} className={`px-3 py-1.5 ${dir === "asc" ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`}>Ascending</button>
              <button onClick={() => setDir("desc")} className={`px-3 py-1.5 ${dir === "desc" ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`}>Descending</button>
            </div>
          </div>

          {/* Learnable-by-Pokémon filter */}
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500">Learnable by</span>
              <input
                value={monQuery}
                onChange={(e) => setMonQuery(e.target.value)}
                placeholder="Pokémon names, comma-separated (e.g. Pikachu, Charizard)"
                className="min-w-[16rem] flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
              />
              {monQuery && (
                <button onClick={() => setMonQuery("")} className="rounded border border-slate-700 px-2 py-1.5 text-slate-400 hover:border-slate-500">Clear</button>
              )}
            </div>
            {monFilterActive && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-500">Show</span>
                <div className="flex overflow-hidden rounded border border-slate-700">
                  <button onClick={() => setLearnMode("union")} className={`px-3 py-1.5 ${learnMode === "union" ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`}>Full pools</button>
                  <button onClick={() => setLearnMode("shared")} className={`px-3 py-1.5 ${learnMode === "shared" ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`}>Shared</button>
                  <button onClick={() => setLearnMode("differing")} className={`px-3 py-1.5 ${learnMode === "differing" ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`}>Differing</button>
                </div>
                <span className="flex flex-wrap items-center gap-1.5 text-slate-400">
                  {matched.map((m) => (
                    <span key={m.slug} className="flex items-center gap-1"><PokeIcon species={m.name} />{m.name}</span>
                  ))}
                </span>
              </div>
            )}
            {unknown.length > 0 && (
              <p className="text-slate-500">Not in the pool: <span className="text-rose-300">{unknown.join(", ")}</span></p>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/60 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2.5 font-normal">Move</th>
              <th className="px-3 py-2.5 font-normal">Type</th>
              <th className="px-3 py-2.5 font-normal">Class</th>
              <th className="px-3 py-2.5 text-right font-normal">Pow</th>
              <th className="px-3 py-2.5 text-right font-normal">Acc</th>
              <th className="px-3 py-2.5 text-right font-normal">PP</th>
              <th className="px-3 py-2.5 text-right font-normal">Prio</th>
              {monFilterActive && <th className="px-3 py-2.5 font-normal">Learned by</th>}
              <th className="px-3 py-2.5 font-normal">Description</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => (
              <tr
                key={m.name}
                onClick={() => router.push(`/database/move/${encodeURIComponent(m.name)}`)}
                className="cursor-pointer border-t border-slate-800/60 align-top hover:bg-slate-800/40"
              >
                <td className="px-3 py-1.5 font-medium">
                  {/* The whole row navigates; keep the name as a real link too so
                      middle-click / open-in-new-tab still works. */}
                  <Link href={`/database/move/${encodeURIComponent(m.name)}`} onClick={(e) => e.stopPropagation()} className="text-slate-100 hover:text-amber-300">{m.name}</Link>
                </td>
                <td className="px-3 py-1.5">{(POKEMON_TYPES as readonly string[]).includes(m.type.toLowerCase()) && <TypeBadge type={m.type.toLowerCase() as PokemonType} />}</td>
                <td className="px-3 py-1.5">
                  <span className="flex items-center gap-1.5 text-xs text-slate-300">
                    <CategoryIcon category={m.category.toLowerCase() as MoveCategory} />
                    {classLabel(m.category)}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums text-slate-300">{m.power ?? "-"}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-slate-300">{m.accuracy == null ? "-" : `${m.accuracy}%`}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-slate-400">{m.pp ?? "-"}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-slate-400">{m.priority > 0 ? `+${m.priority}` : m.priority}</td>
                {monFilterActive && (
                  <td className="px-3 py-1.5">
                    <span className="flex flex-wrap gap-0.5">
                      {matched.filter((p) => p.set.has(m.name)).map((p) => (
                        <PokeIcon key={p.slug} species={p.name} title={p.name} />
                      ))}
                    </span>
                  </td>
                )}
                <td className="px-3 py-1.5 text-slate-400">{m.desc}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={cols} className="px-3 py-6 text-center text-slate-500">No moves match.</td></tr>
            )}
          </tbody>
        </table>
        <span ref={sentinel as React.RefObject<HTMLSpanElement>} className="block h-px" />
      </div>
    </div>
  );
}
