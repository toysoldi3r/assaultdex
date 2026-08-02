"use client";

// Searchable option picker for the teambuilder (image 3): a field button that
// opens an inline panel with a search box, an (empty-for-now) Popular section,
// and the full list — each row showing the option name and its description.
// The Popular section is wired but stays empty until per-mon usage data is
// available; everything else is real @pkmn/dex data.

import { useEffect, useMemo, useRef, useState } from "react";

export interface Option {
  name: string;
  desc?: string;
}

export function Picker({
  value,
  options,
  onSelect,
  placeholder = "—",
  allowClear = false,
  label,
}: {
  value: string | null;
  options: Option[];
  onSelect: (value: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape so an open panel never gets stuck.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return options;
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(n) || (o.desc ?? "").toLowerCase().includes(n),
    );
  }, [q, options]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full truncate rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-left hover:border-amber-500"
      >
        {value || <span className="text-slate-600">{placeholder}</span>}
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-72 rounded border border-slate-700 bg-slate-950 shadow-xl">
          <div className="flex items-center gap-1 border-b border-slate-800 p-1">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${label ?? "options"}…`}
              className="min-w-0 flex-1 rounded bg-slate-900 px-2 py-1 text-xs"
            />
            {allowClear && (
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  setOpen(false);
                }}
                className="rounded bg-slate-800 px-2 py-1 text-[10px] hover:bg-slate-700"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded bg-slate-800 px-2 py-1 text-[10px] hover:bg-slate-700"
            >
              ✕
            </button>
          </div>

          {/* Popular section — wired, filled once usage data is available. */}
          <div className="border-b border-slate-800 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-600">
            Popular (needs usage data)
          </div>

          <ul className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-2 py-2 text-xs text-slate-600">No matches.</li>
            ) : (
              filtered.map((o) => (
                <li key={o.name}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(o.name);
                      setOpen(false);
                      setQ("");
                    }}
                    className={`block w-full px-2 py-1 text-left hover:bg-slate-800 ${
                      o.name === value ? "bg-slate-800/60" : ""
                    }`}
                  >
                    <span className="text-xs font-medium text-slate-100">{o.name}</span>
                    {o.desc && (
                      <span className="block truncate text-[10px] text-slate-500">
                        {o.desc}
                      </span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
