"use client";

import { useState } from "react";
import { ItemsTable } from "./ItemsTable";
import { AbilitiesTable } from "./AbilitiesTable";
import { MovesTable } from "./MovesTable";
import { Terminology } from "./Terminology";
import { BattleCalculator } from "./BattleCalculator";
import type { DbItem, DbAbility, DbMove } from "@/data/dexDatabase";
import type { PokemonRef } from "@/lib/choicedexBuild";

type Tab = "items" | "abilities" | "moves" | "calc" | "terms";
const TABS: { id: Tab; label: string }[] = [
  { id: "items", label: "Items" },
  { id: "abilities", label: "Abilities" },
  { id: "moves", label: "Moves" },
  { id: "calc", label: "Calculator" },
  { id: "terms", label: "Terminology" },
];

export function DatabaseApp({
  items,
  abilities,
  moves,
  pokemon,
  championsAbilities,
  championsMoves,
}: {
  items: DbItem[];
  abilities: DbAbility[];
  moves: DbMove[];
  pokemon: PokemonRef[];
  championsAbilities: string[];
  championsMoves: string[];
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
      {tab === "abilities" && <AbilitiesTable abilities={abilities} championsAbilities={championsAbilities} />}
      {tab === "moves" && <MovesTable moves={moves} championsMoves={championsMoves} />}
      {tab === "calc" && <BattleCalculator pokemon={pokemon} />}
      {tab === "terms" && <Terminology />}
    </div>
  );
}
