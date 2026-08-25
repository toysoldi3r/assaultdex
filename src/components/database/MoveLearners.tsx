"use client";

// Species that can learn a move: #, icon, name, typing and how it's learnt,
// with a Champions / full-dex toggle. Data (a MoveLearner[]) is computed
// server-side; this component only filters and renders it.

import { useMemo, useState } from "react";
import Link from "next/link";
import { PokeIcon } from "@/components/PokeIcon";
import { TypeBadge } from "@/components/ui";
import type { MoveLearner } from "@/data/pokedexSource";

const METHOD_LABEL: Record<string, string> = {
  level: "Level up",
  tm: "TM",
  egg: "Breeding",
  tutor: "Tutor",
  event: "Event",
};

export function MoveLearners({ learners }: { learners: MoveLearner[] }) {
  const [champsOnly, setChampsOnly] = useState(true);
  const hasChamps = useMemo(() => learners.some((l) => l.champions), [learners]);
  const list = useMemo(
    () => (champsOnly && hasChamps ? learners.filter((l) => l.champions) : learners),
    [learners, champsOnly, hasChamps],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded border border-slate-700 text-xs">
          <button onClick={() => setChampsOnly(true)} className={`px-3 py-1.5 ${champsOnly ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`}>Champions</button>
          <button onClick={() => setChampsOnly(false)} className={`px-3 py-1.5 ${!champsOnly ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`}>Full dex</button>
        </div>
        <span className="text-xs text-slate-500">{list.length} Pokémon</span>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-slate-500">
          {champsOnly && hasChamps ? "No Champions-roster Pokémon learn this move." : "No Pokémon learn this move in the Gen 9 data."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/60 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 text-right font-normal">#</th>
                <th className="px-3 py-2 font-normal">Pokémon</th>
                <th className="px-3 py-2 font-normal">Type</th>
                <th className="px-3 py-2 font-normal">Learnt by</th>
              </tr>
            </thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.slug} className="border-t border-slate-800/60">
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">{String(l.num).padStart(4, "0")}</td>
                  <td className="px-3 py-1.5">
                    <Link href={`/pokemon/${l.slug}`} className="flex items-center gap-1.5 hover:text-amber-300">
                      <span className="grid h-[30px] w-10 shrink-0 place-items-center"><PokeIcon species={l.name} title="" /></span>
                      <span className="font-medium">{l.name}</span>
                      {l.champions && <span className="rounded bg-amber-500/15 px-1 text-[9px] font-semibold uppercase text-amber-300">Champ</span>}
                    </Link>
                  </td>
                  <td className="px-3 py-1.5"><span className="flex gap-1">{l.types.map((t) => <TypeBadge key={t} type={t} />)}</span></td>
                  <td className="px-3 py-1.5 text-xs text-slate-400">{l.methods.map((m) => METHOD_LABEL[m] ?? m).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
