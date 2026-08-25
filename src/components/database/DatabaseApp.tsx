"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ItemsTable } from "./ItemsTable";
import { AbilitiesTable } from "./AbilitiesTable";
import { MovesTable } from "./MovesTable";
import { Terminology } from "./Terminology";
import type { DbItem, DbAbility, DbMove } from "@/data/dexDatabase";

// The two-Pokémon calculator now lives on the Battles page, so the Database is
// pure reference (items / abilities / moves / knowledgebase).
type Tab = "items" | "abilities" | "moves" | "terms";
const TABS: { id: Tab; label: string }[] = [
  { id: "items", label: "Items" },
  { id: "abilities", label: "Abilities" },
  { id: "moves", label: "Moves" },
  { id: "terms", label: "Knowledgebase" },
];

export function DatabaseApp({
  items,
  abilities,
  moves,
  championsAbilities,
  championsMoves,
}: {
  items: DbItem[];
  abilities: DbAbility[];
  moves: DbMove[];
  championsAbilities: string[];
  championsMoves: string[];
}) {
  // The active tab is deep-linkable via ?tab= so the nav sub-tabs can jump
  // straight to Items/Abilities/Moves/Calculator/Terminology.
  const params = useSearchParams();
  const urlTab = params.get("tab");
  const valid = (t: string | null): t is Tab => TABS.some((x) => x.id === t);
  const [tab, setTab] = useState<Tab>(valid(urlTab) ? urlTab : "items");
  useEffect(() => {
    if (valid(urlTab) && urlTab !== tab) setTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t px-4 py-2 text-sm font-medium ${
              tab === t.id
                ? "border-b-2 border-amber-500 text-slate-100"
                : "text-slate-400 hover:text-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "items" && <ItemsTable items={items} />}
      {tab === "abilities" && <AbilitiesTable abilities={abilities} championsAbilities={championsAbilities} />}
      {tab === "moves" && <MovesTable moves={moves} championsMoves={championsMoves} />}
      {tab === "terms" && <Terminology />}
    </div>
  );
}
