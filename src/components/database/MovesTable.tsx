"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TypeBadge } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import { POKEMON_TYPES, type PokemonType } from "@/domain/types/pokemon";
import type { DbMove } from "@/data/dexDatabase";
import type { MoveCategory } from "@/components/teams/moveTypes";
import { useInfinite } from "./useInfinite";

const classLabel = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);

export function MovesTable({
  moves = [],
  championsMoves = [],
}: {
  moves?: DbMove[];
  championsMoves?: string[];
}) {
  const champs = useMemo(() => new Set(championsMoves), [championsMoves]);
  // With no Champions roster loaded (e.g. an unseeded DB) the Champions scope
  // would be empty; fall back to the full list so data still shows.
  const champsAvailable = champs.size > 0;
  const [q, setQ] = useState("");
  const [champsOnly, setChampsOnly] = useState(true);

  const scopeCount = useMemo(
    () => moves.filter((m) => !champsOnly || !champsAvailable || champs.has(m.name)).length,
    [moves, champsOnly, champsAvailable, champs],
  );

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return moves.filter(
      (m) =>
        (!champsOnly || !champsAvailable || champs.has(m.name)) &&
        (!n || m.name.toLowerCase().includes(n)),
    );
  }, [moves, q, champsOnly, champsAvailable, champs]);

  const sig = `${q}|${champsOnly}`;
  const { visible, sentinel, shown } = useInfinite(filtered, sig, 50);

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
        <span className="text-slate-500">{shown} / {filtered.length} shown</span>
      </div>

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
              <th className="px-3 py-2.5 font-normal">Description</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => (
              <tr key={m.name} className="border-t border-slate-800/60 align-top">
                <td className="px-3 py-1.5 font-medium">
                  <Link href={`/database/move/${encodeURIComponent(m.name)}`} className="text-slate-100 hover:text-amber-300">{m.name}</Link>
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
                <td className="px-3 py-1.5 text-slate-400">{m.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <span ref={sentinel as React.RefObject<HTMLSpanElement>} className="block h-px" />
      </div>
    </div>
  );
}
