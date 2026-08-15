"use client";

import { useMemo, useState } from "react";
import { TypeBadge } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import { POKEMON_TYPES, type PokemonType } from "@/domain/types/pokemon";
import type { DbMove } from "@/data/dexDatabase";
import type { MoveCategory } from "@/components/teams/moveTypes";
import { useInfinite } from "./useInfinite";

// Signed priority buckets. v>0 keeps priority >= v; v<0 keeps priority <= v;
// v===0 keeps exactly 0. (e.g. "-1" removes everything 0 and higher.)
const PRIORITY_OPTS: { value: string; label: string }[] = [
  { value: "", label: "Any priority" },
  { value: "3", label: "+3 and up" },
  { value: "2", label: "+2 and up" },
  { value: "1", label: "+1 and up" },
  { value: "0", label: "Priority 0" },
  { value: "-1", label: "−1 and below" },
  { value: "-2", label: "−2 and below" },
  { value: "-3", label: "−3 and below" },
];

const classLabel = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);

export function MovesTable({
  moves,
  championsMoves = [],
}: {
  moves: DbMove[];
  championsMoves?: string[];
}) {
  const champs = useMemo(() => new Set(championsMoves), [championsMoves]);
  const [q, setQ] = useState("");
  const [champsOnly, setChampsOnly] = useState(true);
  const [fType, setFType] = useState<string>("");
  const [fCat, setFCat] = useState<string>("");
  const [fPrio, setFPrio] = useState<string>("");
  const [minPow, setMinPow] = useState(0);
  const [maxPow, setMaxPow] = useState(0);

  const parsePow = (v: string) => {
    const n = parseInt(v.replace(/\D/g, ""), 10);
    return Number.isNaN(n) ? 0 : Math.min(250, n);
  };

  const scopeCount = useMemo(
    () => moves.filter((m) => !champsOnly || champs.has(m.name)).length,
    [moves, champsOnly, champs],
  );

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    const powBound = minPow > 0 || maxPow > 0;
    const prioOk = (p: number) => {
      if (fPrio === "") return true;
      const v = Number(fPrio);
      return v > 0 ? p >= v : v < 0 ? p <= v : p === 0;
    };
    const powOk = (pw: number | null) => {
      if (!powBound) return true;
      // A power bound excludes status/no-power moves rather than treating them as 0.
      if (pw == null) return false;
      return (minPow <= 0 || pw >= minPow) && (maxPow <= 0 || pw <= maxPow);
    };
    return moves.filter(
      (m) =>
        (!champsOnly || champs.has(m.name)) &&
        (!n || m.name.toLowerCase().includes(n)) &&
        (!fType || m.type.toLowerCase() === fType) &&
        (!fCat || m.category.toLowerCase() === fCat) &&
        prioOk(m.priority) &&
        powOk(m.power),
    );
  }, [moves, q, champsOnly, champs, fType, fCat, fPrio, minPow, maxPow]);

  const sig = `${q}|${champsOnly}|${fType}|${fCat}|${fPrio}|${minPow}|${maxPow}`;
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
        <select value={fType} onChange={(e) => setFType(e.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 capitalize">
          <option value="">Any type</option>
          {POKEMON_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={fCat} onChange={(e) => setFCat(e.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1">
          <option value="">Any class</option>
          <option value="physical">Physical</option>
          <option value="special">Special</option>
          <option value="status">Status</option>
        </select>
        <select value={fPrio} onChange={(e) => setFPrio(e.target.value)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1">
          {PRIORITY_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label className="flex items-center gap-1 text-slate-400">
          Min power
          <input type="text" inputMode="numeric" value={minPow || ""} placeholder="0" onChange={(e) => setMinPow(parsePow(e.target.value))} className="w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 tabular-nums" />
        </label>
        <label className="flex items-center gap-1 text-slate-400">
          Max power
          <input type="text" inputMode="numeric" value={maxPow || ""} placeholder="∞" onChange={(e) => setMaxPow(parsePow(e.target.value))} className="w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 tabular-nums" />
        </label>
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
                <td className="px-3 py-1.5 font-medium text-slate-100">{m.name}</td>
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
