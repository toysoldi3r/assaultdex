"use client";

// Start Here, Stats and Typing.

import { useState } from "react";
import { TYPE_HEX } from "@/components/ui";
import { statBarPct, statColor } from "@/domain/mechanics/statColor";
import { singleTypeMultiplier } from "@/domain/mechanics/typeChart";
import { POKEMON_TYPES, type PokemonType } from "@/domain/types/pokemon";
import { Card, CardLabel, Chip, GuideMon, Prose } from "../ui";
import { ChipPicker } from "./shared";

export function StartHereLesson() {
  return (
    <>
      <Prose>
        <p>AssaultDex helps you build and battle competitive Pokémon teams for Pokémon Champions doubles. It bundles the tools competitive players normally use across several sites (a Pokédex, a team builder, a live battle assistant, and a reference database) into one place.</p>
        <p>This guide explains how competitive doubles actually works: stats, types, turns, the battlefield, and how to build a team. You don&apos;t need any prior experience. Read the topics in order, or jump straight to whatever you&apos;re stuck on.</p>
      </Prose>
      <ChipPicker
        className="mt-7"
        label="The rest of the site: tap a tool"
        options={[
          { id: "pokedex", name: "Pokédex", desc: "Look up any Pokémon's stats, type matchups, and common sets." },
          { id: "teams", name: "Teams", desc: "Build a team and get instant legality checks and analysis." },
          { id: "choicedex", name: "ChoiceDex", desc: "Set up both sides of a real battle and get the best play each turn." },
          { id: "database", name: "Database", desc: "Items, abilities, moves, and a two-Pokémon damage calculator." },
          { id: "battles", name: "Battles", desc: "Import a finished battle and review it turn by turn." },
        ]}
      />
    </>
  );
}

// Base stats (Pokédex values). All three species are in the Champions roster.
const STAT_MONS = [
  { id: "dragapult", name: "Dragapult", role: "Fast sweeper", stats: { hp: 88, atk: 120, def: 75, spa: 100, spd: 75, spe: 142 } },
  { id: "garchomp", name: "Garchomp", role: "All-rounder", stats: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 } },
  { id: "garganacl", name: "Garganacl", role: "Bulky wall", stats: { hp: 100, atk: 100, def: 130, spa: 45, spd: 90, spe: 35 } },
] as const;
const STAT_ORDER = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
const STAT_LABEL = { hp: "HP", atk: "Atk", def: "Def", spa: "Sp.Atk", spd: "Sp.Def", spe: "Speed" };

export function StatsLesson() {
  const [cur, setCur] = useState<(typeof STAT_MONS)[number]["id"]>("dragapult");
  const mon = STAT_MONS.find((m) => m.id === cur)!;
  const bst = STAT_ORDER.reduce((s, k) => s + mon.stats[k], 0);
  return (
    <>
      <Prose>
        <p>Every Pokémon has six stats that decide how it performs in battle: HP, Attack, Defense, Sp. Atk, Sp. Def, and Speed.</p>
        <p>HP is how much damage it can take before fainting. Attack and Sp. Atk decide how hard its physical and special moves hit. Defense and Sp. Def decide how much damage it shrugs off from physical and special hits. Speed decides who moves first each turn.</p>
        <p>A Pokémon&apos;s base stats are fixed by its species: every individual of the same species starts from the same numbers. Small per-individual adjustments shift the final numbers a bit further.</p>
      </Prose>

      <div className="mt-1.5 rounded-[10px] border border-line bg-panel px-[18px] py-4">
        <p className="mb-3 text-xs font-bold" style={{ color: "var(--g-gold)" }}>EVs, IVs, and Nature: what shapes the final stats</p>
        <div className="flex flex-col gap-3 text-[13px] leading-[1.6]" style={{ color: "var(--g-muted)" }}>
          <p><strong className="text-t1">EVs (Effort Values)</strong>: fully customizable. Every stat has 0 EVs by default; you invest up to 252 EVs into a stat (508 total across all six) to push that stat higher. Roughly every 4 EVs adds 1 point to the final stat at level 100, so 252 EVs is worth about +63. This is the main way players build a Pokémon for a specific role, e.g. maxing Speed on a sweeper or HP/Defense on a wall.</p>
          <p><strong className="text-t1">IVs (Individual Values)</strong>: a hidden 0–31 bonus per stat, randomized by default on each individual Pokémon. Competitively they&apos;re customizable too: breeding or items let a player set them, and most builds simply max every IV to 31 for the biggest stat. The one common exception is deliberately lowering the Speed IV on some builds to control move order in specific matchups.</p>
          <p><strong className="text-t1">Nature</strong>: set once per Pokémon and customizable by using an item to change it. A nature raises one stat by 10% and lowers another by 10% (a few &quot;neutral&quot; natures affect nothing). Picking a nature that boosts the stat you&apos;re already investing EVs into compounds the effect, so most competitive builds pair a nature with matching EV investment.</p>
        </div>
      </div>

      <Card className="mt-3">
        <CardLabel>Example Pokémon: tap one to compare</CardLabel>
        <div className="mb-[18px] flex flex-wrap gap-2">
          {STAT_MONS.map((m) => (
            <Chip key={m.id} on={m.id === cur} onClick={() => setCur(m.id)} className="flex items-center gap-2 !py-[5px] !pl-[5px]">
              <GuideMon species={m.name} size={26} />
              {m.name}
            </Chip>
          ))}
        </div>
        <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
          <GuideMon key={mon.id} species={mon.name} size={56} style={{ animation: "g-popIn .25s ease" }} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-t1">{mon.name}</span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.05em]" style={{ color: "var(--g-blue)", background: "var(--g-blue-bg)" }}>{mon.role}</span>
            </div>
            <div className="mt-0.5 mono text-[11px]" style={{ color: "var(--g-dim)" }}>Base stat total {bst}</div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {STAT_ORDER.map((k) => {
            const v = mon.stats[k];
            return (
              <div key={k} className="flex items-center gap-2.5">
                <span className="w-14 shrink-0 text-xs" style={{ color: "var(--g-muted)" }}>{STAT_LABEL[k]}</span>
                <span className="block h-2.5 flex-1 overflow-hidden rounded-[5px] bg-raise">
                  <span className="block h-full rounded-[5px]" style={{ width: `${statBarPct(v)}%`, background: statColor(v), transition: "width .3s ease, background .3s ease" }} />
                </span>
                <span className="w-[30px] shrink-0 text-right mono text-xs text-t1">{v}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3.5 text-[11px] leading-[1.5]" style={{ color: "var(--g-dim)" }}>
          Bar colour follows the same six tiers as the Pokédex: red, orange, yellow, green, dark green, then blue at the very top of the scale.
        </p>
      </Card>
    </>
  );
}

const TYPE_ABBR: Record<PokemonType, string> = {
  normal: "NOR", fire: "FIR", water: "WAT", electric: "ELE", grass: "GRA", ice: "ICE", fighting: "FIG", poison: "POI", ground: "GRO",
  flying: "FLY", psychic: "PSY", bug: "BUG", rock: "ROC", ghost: "GHO", dragon: "DRA", dark: "DAR", steel: "STE", fairy: "FAI",
};

function cellLook(m: number) {
  if (m === 0) return { bg: "var(--bg)", color: "var(--g-faint)", txt: "0" };
  if (m === 2) return { bg: "rgba(16,185,129,0.28)", color: "#34d399", txt: "2" };
  if (m === 0.5) return { bg: "rgba(244,63,94,0.2)", color: "#fca5a5", txt: "½" };
  return { bg: "transparent", color: "var(--g-faint)", txt: "·" };
}

function describeMult(m: number) {
  if (m === 0) return { label: "0× (no effect, immune)", color: "var(--g-dim)" };
  if (m < 1) return { label: "½× (not very effective)", color: "#fb7185" };
  if (m === 1) return { label: "1× (normal damage)", color: "var(--t2)" };
  return { label: "2× (super effective)", color: "#34d399" };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function TypingLesson() {
  const [atk, setAtk] = useState<PokemonType>("fire");
  const [def, setDef] = useState<PokemonType>("grass");
  const mult = describeMult(singleTypeMultiplier(atk, def));
  const ring = "0 0 0 2px var(--t1)";
  const head = "flex cursor-pointer items-center text-[9px] font-extrabold tracking-[.02em] text-white rounded";
  return (
    <>
      <Prose>
        <p>Every Pokémon and every move has a type: Fire, Water, Grass, and fifteen others. When a move hits a Pokémon, its type decides whether the hit does more damage, less damage, or none at all.</p>
      </Prose>
      <Card className="mt-5">
        <CardLabel className="mb-1">Type chart: tap a row, column, or cell</CardLabel>
        <p className="mb-3.5 text-xs leading-[1.5]" style={{ color: "var(--g-dim)" }}>Rows attack, columns defend.</p>
        <div className="overflow-x-auto">
          <div className="grid min-w-[620px] gap-0.5" style={{ gridTemplateColumns: "52px repeat(18, minmax(0, 1fr))" }} role="grid" aria-label="Type effectiveness chart">
            <div className="h-[34px]" />
            {POKEMON_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                title={`Defending: ${cap(t)}`}
                onClick={() => setDef(t)}
                className={`${head} h-[34px] justify-center`}
                style={{ background: TYPE_HEX[t], boxShadow: t === def ? ring : "none", transition: "box-shadow .15s ease" }}
              >
                {TYPE_ABBR[t]}
              </button>
            ))}
            {POKEMON_TYPES.map((rt) => (
              <div key={rt} className="contents">
                <button
                  type="button"
                  title={`Attacking: ${cap(rt)}`}
                  onClick={() => setAtk(rt)}
                  className={`${head} box-border justify-end pr-2`}
                  style={{ background: TYPE_HEX[rt], boxShadow: rt === atk ? ring : "none", transition: "box-shadow .15s ease" }}
                >
                  {TYPE_ABBR[rt]}
                </button>
                {POKEMON_TYPES.map((ct) => {
                  const look = cellLook(singleTypeMultiplier(rt, ct));
                  const current = rt === atk && ct === def;
                  return (
                    <button
                      key={ct}
                      type="button"
                      title={`${cap(rt)} → ${cap(ct)}`}
                      onClick={() => { setAtk(rt); setDef(ct); }}
                      className="flex aspect-square cursor-pointer items-center justify-center rounded text-[11px] font-bold"
                      style={{
                        background: look.bg,
                        color: look.color,
                        boxShadow: current ? "0 0 0 2px var(--g-gold)" : "none",
                        transition: "box-shadow .15s ease",
                      }}
                    >
                      {look.txt}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3.5 flex flex-wrap items-center gap-2.5" aria-live="polite">
          <span className="text-[13px]" style={{ color: "var(--g-body)" }}>
            <strong className="text-t1">{cap(atk)}</strong> attacks <strong className="text-t1">{cap(def)}</strong>
          </span>
          <span className="rounded-lg bg-raise px-3 py-1.5 mono text-sm font-bold" style={{ color: mult.color }}>{mult.label}</span>
        </div>
        <p className="mt-2.5 text-[13px] leading-[1.5]" style={{ color: "var(--g-dim)" }}>
          A Pokémon with two types multiplies both results together, and that&apos;s how some hits do 4× damage and others barely scratch.
        </p>
      </Card>
      <div className="mt-5 flex flex-col gap-2 text-sm leading-[1.6]" style={{ color: "var(--g-body)" }}>
        <p className="font-semibold text-t1">A few types carry extra rules beyond damage:</p>
        <ul className="list-disc pl-5" style={{ color: "var(--g-muted)" }}>
          <li>Fire-types cannot be burned.</li>
          <li>Grass-types are immune to powder and spore moves.</li>
          <li>Ghost-types can always switch out, even against trapping effects.</li>
          <li>Dark-types are immune to opposing Prankster-boosted status moves.</li>
        </ul>
      </div>
    </>
  );
}
