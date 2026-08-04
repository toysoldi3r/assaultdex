"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DbAbility } from "@/data/dexDatabase";

export function AbilitiesTable({ abilities }: { abilities: DbAbility[] }) {
  const [q, setQ] = useState("");
  const [modeledOnly, setModeledOnly] = useState(false);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return abilities.filter(
      (a) =>
        (!modeledOnly || a.calc) &&
        (!needle ||
          a.name.toLowerCase().includes(needle) ||
          a.desc.toLowerCase().includes(needle)),
    );
  }, [abilities, q, modeledOnly]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${abilities.length} abilities…`}
          className="w-64 rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
        />
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={modeledOnly}
            onChange={(e) => setModeledOnly(e.target.checked)}
          />
          Only abilities with a modeled calculation
        </label>
        <span className="text-xs text-slate-500">{filtered.length} shown</span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {filtered.map((a) => (
          <li key={a.name} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <Link
                href={`/database/ability/${encodeURIComponent(a.name)}`}
                className="font-semibold text-amber-400 hover:underline"
              >
                {a.name}
              </Link>
              <div className="flex items-center gap-1.5">
                {/* Calculation / special interaction shown on hover. */}
                {a.calc && (
                  <span title={a.calc} className="cursor-help rounded-full border border-emerald-600/60 px-1 text-[9px] text-emerald-300">
                    ⓘ calc
                  </span>
                )}
                {a.interaction && (
                  <span title={a.interaction} className="cursor-help rounded-full border border-amber-600/60 px-1 text-[9px] text-amber-300">
                    ⚡ interaction
                  </span>
                )}
                {a.rating > 0 && <span className="text-xs text-slate-500">{a.rating}</span>}
              </div>
            </div>
            <p className="mt-1 text-sm text-slate-300">{a.desc}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
