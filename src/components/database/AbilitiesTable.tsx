"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DbAbility } from "@/data/dexDatabase";
import { useInfinite } from "./useInfinite";
import { pill } from "./ItemsTable";

type Dir = "asc" | "desc";

export function AbilitiesTable({
  abilities = [],
  championsAbilities = [],
}: {
  abilities?: DbAbility[];
  championsAbilities?: string[];
}) {
  const [q, setQ] = useState("");
  const [champsOnly, setChampsOnly] = useState(true);
  const [advanced, setAdvanced] = useState(false);
  const [dir, setDir] = useState<Dir>("asc");
  const [notesOnly, setNotesOnly] = useState(false);
  const champs = useMemo(() => new Set(championsAbilities), [championsAbilities]);
  // No roster loaded (unseeded DB) → show the full list instead of nothing.
  const champsAvailable = champs.size > 0;

  const inScope = (a: DbAbility) =>
    (!champsOnly || !champsAvailable || champs.has(a.name)) &&
    (!notesOnly || a.interaction != null);

  const scopeCount = useMemo(
    () => abilities.filter(inScope).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [abilities, champsOnly, champsAvailable, champs, notesOnly],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = abilities.filter(
      (a) =>
        inScope(a) &&
        (!needle ||
          a.name.toLowerCase().includes(needle) ||
          a.desc.toLowerCase().includes(needle)),
    );
    const s = dir === "asc" ? 1 : -1;
    out.sort((a, b) => a.name.localeCompare(b.name) * s);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abilities, q, champsOnly, champsAvailable, champs, notesOnly, dir]);

  const { visible, sentinel, shown } = useInfinite(
    filtered,
    `${q}|${champsOnly}|${dir}|${notesOnly}`,
    50,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${scopeCount} ${champsOnly ? "Champions" : ""} abilities…`}
          className="w-64 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
        />
        <div className="flex overflow-hidden rounded border border-slate-700 text-xs">
          <button
            onClick={() => setChampsOnly(true)}
            className={`px-3 py-1.5 ${champsOnly ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`}
          >
            Champions
          </button>
          <button
            onClick={() => setChampsOnly(false)}
            className={`px-3 py-1.5 ${!champsOnly ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`}
          >
            Full list
          </button>
        </div>
        <button
          onClick={() => setAdvanced((a) => !a)}
          className={`rounded border px-3 py-1.5 text-xs ${advanced ? "border-amber-500 text-amber-300" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}
        >
          Advanced filters {advanced ? "▲" : "▼"}
        </button>
        <span className="text-xs text-slate-500">{shown} / {filtered.length} shown</span>
      </div>

      {advanced && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs">
          <span className="flex items-center gap-2">
            <span className="text-slate-500">Sort by</span>
            <button className={pill(true)}>Name</button>
            <span className="ml-1 flex overflow-hidden rounded border border-slate-700">
              <button onClick={() => setDir("asc")} className={`px-3 py-1.5 font-medium ${dir === "asc" ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-200 hover:bg-slate-800"}`}>↑ Ascending</button>
              <button onClick={() => setDir("desc")} className={`border-l border-slate-700 px-3 py-1.5 font-medium ${dir === "desc" ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-200 hover:bg-slate-800"}`}>↓ Descending</button>
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-slate-500">Filter</span>
            <button onClick={() => setNotesOnly((v) => !v)} className={pill(notesOnly)}>Has interaction notes</button>
          </span>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-slate-500">No abilities match.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {visible.map((a) => (
            <li key={a.name} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <Link
                  href={`/database/ability/${encodeURIComponent(a.name)}`}
                  className="font-semibold text-amber-400 hover:underline"
                >
                  {a.name}
                </Link>
                {a.rating > 0 && <span className="text-xs text-slate-500">{a.rating}</span>}
              </div>
              <p className="mt-1 text-sm text-slate-300">{a.desc}</p>
            </li>
          ))}
        </ul>
      )}
      <span ref={sentinel as React.RefObject<HTMLSpanElement>} className="block h-px" />
    </div>
  );
}
