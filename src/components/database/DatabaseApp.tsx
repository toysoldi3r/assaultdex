"use client";

import { useState } from "react";
import { ItemsTable } from "./ItemsTable";
import { AbilitiesTable } from "./AbilitiesTable";
import { BattleCalculator } from "./BattleCalculator";
import type { DbItem, DbAbility } from "@/data/dexDatabase";
import type { PokemonRef } from "@/lib/choicedexBuild";

type Tab = "items" | "abilities" | "calc";
const TABS: { id: Tab; label: string }[] = [
  { id: "items", label: "Items" },
  { id: "abilities", label: "Abilities" },
  { id: "calc", label: "Calculator" },
];

export function DatabaseApp({
  items,
  abilities,
  pokemon,
}: {
  items: DbItem[];
  abilities: DbAbility[];
  pokemon: PokemonRef[];
}) {
  const [tab, setTab] = useState<Tab>("items");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t px-4 py-2 text-sm font-medium ${
              tab === t.id
                ? "border-b-2 border-amber-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "items" && <ItemsTable items={items} />}
      {tab === "abilities" && <AbilitiesTable abilities={abilities} />}
      {tab === "calc" && <BattleCalculator pokemon={pokemon} />}
    </div>
  );
}
