"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DbAbility } from "@/data/dexDatabase";
import { useInfinite } from "./useInfinite";

export function AbilitiesTable({
  abilities,
  championsAbilities = [],
}: {
  abilities: DbAbility[];
  championsAbilities?: string[];
}) {
  const [q, setQ] = useState("");
  const [champsOnly, setChampsOnly] = useState(true);
  const champs = useMemo(() => new Set(championsAbilities), [championsAbilities]);

  const scopeCount = useMemo(
    () => abilities.filter((a) => !champsOnly || champs.has(a.name)).length,
    [abilities, champsOnly, champs],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return abilities.filter(
      (a) =>
        (!champsOnly || champs.has(a.name)) &&
        (!needle ||
          a.name.toLowerCase().includes(needle) ||
          a.desc.toLowerCase().includes(needle)),
    );
  }, [abilities, q, champsOnly, champs]);

  const { visible, sentinel, shown } = useInfinite(filtered, `${q}|${champsOnly}`, 50);

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
        <span className="text-xs text-slate-500">{shown} / {filtered.length} shown</span>
      </div>
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
      <span ref={sentinel as React.RefObject<HTMLSpanElement>} className="block h-px" />
    </div>
  );
}
