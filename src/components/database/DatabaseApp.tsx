"use client";

// Database tab shell. Owns the page header (title, search, scope toggle), the
// small Tools tab strip, and the top-level view switch. The default view is the
// one-index Database (DatabaseIndex); the other views are the tools that used to
// be flat tabs — the battle calculator, the type chart (previously unmounted),
// the ruleset reference and the knowledgebase glossary.

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DatabaseIndex } from "./DatabaseIndex";
import { Terminology } from "./Terminology";
import { Rulesets } from "./Rulesets";
import { BattleCalculator } from "./BattleCalculator";
import { TypeMatchup } from "./TypeMatchup";
import type { DexEntry, DexKind } from "@/data/dexIndex";
import type { PokemonRef } from "@/lib/choicedexBuild";

type View = "index" | "calc" | "types" | "rulesets" | "terms";

const TOOL_TABS: { id: View; label: string }[] = [
  { id: "index", label: "Reference" },
  { id: "calc", label: "Calculator" },
  { id: "types", label: "Type chart" },
  { id: "rulesets", label: "Rulesets" },
  { id: "terms", label: "Knowledgebase" },
];

// Map the legacy ?tab= deep-links (still used by the top bar + home stats) onto
// the new view + kind model.
function fromTab(tab: string | null): { view: View; kind: DexKind } {
  switch (tab) {
    case "abilities": return { view: "index", kind: "ability" };
    case "moves": return { view: "index", kind: "move" };
    case "calc": return { view: "calc", kind: "item" };
    case "types": return { view: "types", kind: "item" };
    case "rulesets": return { view: "rulesets", kind: "item" };
    case "terms": return { view: "terms", kind: "item" };
    default: return { view: "index", kind: "item" };
  }
}

export function DatabaseApp({
  entries,
  pokemon,
}: {
  entries: DexEntry[];
  pokemon: PokemonRef[];
}) {
  const params = useSearchParams();
  const initial = fromTab(params.get("tab"));

  const [view, setView] = useState<View>(initial.view);
  const [scope, setScope] = useState<"champions" | "full">("champions");
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(true);

  // Track the app nav collapse so the detail card can widen when it closes.
  useEffect(() => {
    try {
      if (localStorage.getItem("assaultdex.navCollapsed") === "1") setNavOpen(false);
    } catch {
      /* ignore */
    }
    const onNav = (e: Event) => setNavOpen((e as CustomEvent<boolean>).detail);
    window.addEventListener("assaultdex:nav", onNav);
    return () => window.removeEventListener("assaultdex:nav", onNav);
  }, []);

  const urlTab = params.get("tab");
  useEffect(() => {
    setView(fromTab(urlTab).view);
  }, [urlTab]);

  return (
    <div className="flex flex-col" style={{ gap: "18px" }}>
      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-end" style={{ gap: "20px" }}>
        <div className="flex min-w-0 flex-1 flex-col" style={{ gap: "10px" }}>
          <h1 className="text-[22px] font-bold" style={{ letterSpacing: "-0.01em" }}>Database</h1>
          {view === "index" && (
            <div
              className="flex items-center"
              style={{
                height: "42px", maxWidth: "420px", border: "1px solid var(--accln)",
                borderRadius: "10px", background: "var(--panel)", padding: "0 14px", gap: "10px",
              }}
            >
              <span
                className="shrink-0 rounded-full"
                style={{ width: "13px", height: "13px", border: "1.5px solid var(--acc)" }}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search items, abilities, moves…"
                className="w-full bg-transparent text-[15px] text-t1 outline-none"
                style={{ border: "none" }}
              />
            </div>
          )}
        </div>

        {view === "index" && (
          <div className="flex flex-col items-start md:items-end" style={{ gap: "9px", maxWidth: "520px" }}>
            <div
              className="flex overflow-hidden"
              style={{ height: "32px", border: "1px solid var(--line)", borderRadius: "8px" }}
            >
              {(["champions", "full"] as const).map((s, i) => {
                const active = scope === s;
                return (
                  <button
                    key={s}
                    onClick={() => setScope(s)}
                    className="text-[12px]"
                    style={{
                      padding: "0 15px", fontWeight: active ? 500 : 400,
                      background: active ? "var(--acc)" : "var(--panel)",
                      color: active ? "var(--bg)" : "var(--t2)",
                      borderLeft: i === 1 ? "1px solid var(--line)" : undefined,
                    }}
                  >
                    {s === "champions" ? "Champions" : "Full list"}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tools tab strip */}
      <div className="flex flex-wrap" style={{ gap: "4px" }}>
        {TOOL_TABS.map((t) => {
          const active = view === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`text-[12px] ${active ? "font-medium text-acc" : "text-t2 hover:text-t1"}`}
              style={{
                padding: "5px 11px", borderRadius: "7px",
                background: active ? "var(--accbg)" : "transparent",
                border: active ? "1px solid var(--accln)" : "1px solid transparent",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      {view === "index" && (
        <DatabaseIndex
          entries={entries}
          scope={scope}
          query={query}
          navOpen={navOpen}
          initialKind={initial.kind}
          onUseInCalculator={() => setView("calc")}
        />
      )}
      {view === "calc" && <BattleCalculator pokemon={pokemon} />}
      {view === "types" && <TypeMatchup />}
      {view === "rulesets" && <Rulesets />}
      {view === "terms" && <Terminology />}
    </div>
  );
}
