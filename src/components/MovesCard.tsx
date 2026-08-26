"use client";

// Interactive moves list for a Pokémon page. Defaults to a single combined
// table (no split by learn method) with sortable columns; a toggle switches to
// the grouped-by-method view. Sort by name, type, category, power, accuracy,
// PP, priority, or competitive usage, ascending or descending.

import { useMemo, useState } from "react";
import { TypeBadge } from "@/components/ui";
import type { DexMoveRow, LearnMethod } from "@/data/pokedexSource";

type SortKey = "name" | "type" | "category" | "power" | "accuracy" | "pp" | "priority" | "usage";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "type", label: "Typing" },
  { key: "category", label: "Category" },
  { key: "power", label: "Power" },
  { key: "accuracy", label: "Accuracy" },
  { key: "pp", label: "PP" },
  { key: "priority", label: "Priority" },
  { key: "usage", label: "Popularity (usage)" },
];

const METHOD_SECTIONS: { method: LearnMethod; label: string }[] = [
  { method: "level", label: "By level up" },
  { method: "tm", label: "By TM" },
  { method: "egg", label: "By breeding" },
  { method: "tutor", label: "By tutor" },
  { method: "event", label: "By event" },
];
const METHOD_ABBR: Record<LearnMethod, string> = {
  level: "Lv", tm: "TM", egg: "Egg", tutor: "Tutor", event: "Event",
};

function learnLabel(m: DexMoveRow): string {
  return m.methods
    .map((mm) =>
      mm === "level"
        ? m.level === 0 ? "Evo" : m.level != null ? `Lv${m.level}` : "Lv"
        : METHOD_ABBR[mm],
    )
    .join(", ");
}

export function MovesCard({
  rows,
  usage = {},
  count,
}: {
  rows: DexMoveRow[];
  /** Competitive usage % by move name, for the popularity sort/column. */
  usage?: Record<string, number>;
  count: number;
}) {
  const [view, setView] = useState<"combined" | "method">("combined");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  const cmp = useMemo(() => {
    const base = (a: DexMoveRow, b: DexMoveRow): number => {
      switch (sortKey) {
        case "name": return a.name.localeCompare(b.name);
        case "type": return (a.type ?? "zzz").localeCompare(b.type ?? "zzz");
        case "category": return a.category.localeCompare(b.category);
        case "power": return (a.power ?? -1) - (b.power ?? -1);
        // null accuracy = never-miss; treat as the highest.
        case "accuracy": return (a.accuracy ?? 101) - (b.accuracy ?? 101);
        case "pp": return (a.pp ?? -1) - (b.pp ?? -1);
        case "priority": return a.priority - b.priority;
        case "usage": return (usage[a.name] ?? -1) - (usage[b.name] ?? -1);
      }
    };
    return (a: DexMoveRow, b: DexMoveRow) => {
      const r = base(a, b) || a.name.localeCompare(b.name);
      return dir === "desc" ? -r : r;
    };
  }, [sortKey, dir, usage]);

  const combined = useMemo(() => [...rows].sort(cmp), [rows, cmp]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500">{count} Gen 9-legal moves.</span>
        <span className="flex overflow-hidden rounded border border-slate-700">
          <button onClick={() => setView("combined")}
            className={`px-2 py-1 ${view === "combined" ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`}>Combined</button>
          <button onClick={() => setView("method")}
            className={`px-2 py-1 ${view === "method" ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`}>By learn method</button>
        </span>
        <label className="ml-auto flex items-center gap-1 text-slate-400">
          Sort
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100">
            {SORT_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
        <span className="flex overflow-hidden rounded border border-slate-700">
          <button onClick={() => setDir("asc")}
            className={`px-2 py-1 ${dir === "asc" ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`} title="Ascending">↑ Asc</button>
          <button onClick={() => setDir("desc")}
            className={`px-2 py-1 ${dir === "desc" ? "bg-amber-500 text-black" : "bg-slate-900 text-slate-300"}`} title="Descending">↓ Desc</button>
        </span>
      </div>

      {view === "combined" ? (
        <Table rows={combined} usage={usage} showLearn />
      ) : (
        <div className="space-y-4">
          {METHOD_SECTIONS.map(({ method, label }) => {
            const group = rows.filter((m) => m.methods.includes(method)).sort(cmp);
            if (group.length === 0) return null;
            return (
              <div key={method}>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-300">{label} ({group.length})</h3>
                <Table rows={group} usage={usage} showLevel={method === "level"} />
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-600">
        Move data + learn methods from @pkmn/dex (Gen 9 learnset). Usage from the committed tournament snapshot.
      </p>
    </div>
  );
}

function Table({
  rows,
  usage,
  showLearn,
  showLevel,
}: {
  rows: DexMoveRow[];
  usage: Record<string, number>;
  showLearn?: boolean;
  showLevel?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-slate-500">
          <tr>
            {showLevel && <th className="py-1 pr-2 text-right">Lv</th>}
            {showLearn && <th className="py-1 pr-2">Learn</th>}
            <th className="py-1">Name</th>
            <th>Type</th>
            <th>Cat.</th>
            <th className="text-right">Power</th>
            <th className="text-right">Acc.</th>
            <th className="text-right">PP</th>
            <th className="text-right">Pri.</th>
            <th className="text-right">Usage</th>
            <th>Effect</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.name} className="border-t border-slate-800">
              {showLevel && (
                <td className="py-1 pr-2 text-right tabular-nums text-slate-400">
                  {m.level === null ? "-" : m.level === 0 ? "Evo" : m.level}
                </td>
              )}
              {showLearn && <td className="py-1 pr-2 text-xs text-slate-500">{learnLabel(m)}</td>}
              <td className="py-1">{m.name}</td>
              <td>{m.type ? <TypeBadge type={m.type} /> : "-"}</td>
              <td className="capitalize text-slate-400">{m.category}</td>
              <td className="text-right tabular-nums">{m.power ?? "-"}</td>
              <td className="text-right tabular-nums">{m.accuracy === null ? "-" : m.accuracy}</td>
              <td className="text-right tabular-nums">{m.pp ?? "-"}</td>
              <td className="text-right tabular-nums text-slate-400">{m.priority !== 0 ? (m.priority > 0 ? `+${m.priority}` : m.priority) : "-"}</td>
              <td className="text-right tabular-nums text-slate-400">{usage[m.name] != null ? `${usage[m.name]}%` : "-"}</td>
              <td>
                {m.effect ? <span className="text-xs text-slate-300">{m.effect}</span> : <span className="text-slate-600">-</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
