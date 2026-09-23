"use client";

// Switching: three 2v2 scenarios. Each card shows the opponents (with the move
// they are using), arrows at the slot(s) they target, and your two Pokémon. The
// button in the card header swaps the targeted slot; the Pokémon cross-fade and
// the targeted slot turns red (bad outcome) or green (good outcome).

import { useEffect, useRef, useState } from "react";
import { TypeBadge } from "@/components/ui";
import type { PokemonType } from "@/domain/types/pokemon";
import { Card, GuideMon, Prose } from "../ui";

interface Mon {
  /** Showdown species name (sprite lookup). */
  species: string;
  name: string;
  types: PokemonType[];
  /** Line under the name: the move it uses (opponents) or a short note (yours). */
  note: string;
}

// Every species here is in the Champions roster (src/data/fixtures/championsRoster.json).
const WEAVILE: Mon = { species: "Weavile", name: "Weavile", types: ["dark", "ice"], note: "Ice Punch" };
const NINETALES_A: Mon = { species: "Ninetales-Alola", name: "Alolan Ninetales", types: ["ice", "fairy"], note: "Ice Beam" };
const PRIMARINA: Mon = { species: "Primarina", name: "Primarina", types: ["water", "fairy"], note: "Hydro Pump" };
const BASCULEGION: Mon = { species: "Basculegion", name: "Basculegion", types: ["water", "ghost"], note: "Liquidation" };
const TORKOAL: Mon = { species: "Torkoal", name: "Torkoal", types: ["fire"], note: "Flamethrower" };

const DRAGONITE: Mon = { species: "Dragonite", name: "Dragonite", types: ["dragon", "flying"], note: "Win condition, 4× weak to Ice" };
const INCINEROAR: Mon = { species: "Incineroar", name: "Incineroar", types: ["fire", "dark"], note: "Resists Ice" };
const CINDERACE: Mon = { species: "Cinderace", name: "Cinderace", types: ["fire"], note: "Fragile, weak to Water" };
const INDEEDEE: Mon = { species: "Indeedee-F", name: "Indeedee-F", types: ["psychic", "normal"], note: "Bulky, learns Ally Switch" };
const RILLABOOM_SAFE: Mon = { species: "Rillaboom", name: "Rillaboom", types: ["grass"], note: "Not targeted" };
const RILLABOOM: Mon = { species: "Rillaboom", name: "Rillaboom", types: ["grass"], note: "Weak to Fire" };
const TYRANITAR: Mon = { species: "Tyranitar", name: "Tyranitar", types: ["rock", "dark"], note: "Resists Fire, sets Sand Stream" };
const GARGANACL: Mon = { species: "Garganacl", name: "Garganacl", types: ["rock"], note: "Unboosted Sp. Def" };

const GOOD = "var(--g-good)";
const BAD = "var(--g-bad)";
const FADE_MS = 160;

/** Toggle with a short fade-out before the swap, so the Pokémon cross-fade. */
function useFadeToggle() {
  const [on, setOn] = useState(false);
  const [fading, setFading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const toggle = () => {
    setFading(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setOn((v) => !v); setFading(false); }, FADE_MS);
  };
  return { on, fading, toggle };
}

const fadeStyle = (fading: boolean) => ({
  opacity: fading ? 0 : 1,
  transform: fading ? "translateY(3px)" : "translateY(0)",
  transition: "opacity .18s ease, transform .18s ease",
});

function SlotLabel({ children, enemy }: { children: string; enemy?: boolean }) {
  return (
    <div className="mb-1.5 text-[10px] font-bold tracking-[.04em]" style={{ color: enemy ? "var(--g-gold)" : "var(--acc)" }}>
      {children}
    </div>
  );
}

function MonBody({ mon, enemy }: { mon: Mon; enemy?: boolean }) {
  return (
    <>
      <GuideMon species={mon.species} size={40} className="mx-auto mb-0.5" />
      <div className="text-[13px] font-semibold text-t1">{mon.name}</div>
      <div className={enemy ? "mt-0.5 text-[11px]" : "mt-1 text-[11px]"} style={{ color: enemy ? "var(--g-dim)" : "var(--g-muted)", transition: "color .3s ease" }}>
        {mon.note}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-1">
        {mon.types.map((t) => <TypeBadge key={t} type={t} />)}
      </div>
    </>
  );
}

function Slot({
  label, mon, enemy, outcome, fading,
}: {
  label: string;
  mon: Mon;
  enemy?: boolean;
  /** "good"/"bad" colours the slot; undefined leaves it neutral. */
  outcome?: "good" | "bad";
  /** Cross-fade the contents (only for slots whose Pokémon can change). */
  fading?: boolean;
}) {
  const c = outcome === "good" ? GOOD : outcome === "bad" ? BAD : null;
  return (
    <div className="text-center">
      <SlotLabel enemy={enemy}>{label}</SlotLabel>
      <div
        className="rounded-[10px] border p-3"
        style={{
          borderColor: c ?? "var(--line)",
          background: c ? `color-mix(in oklch, ${c} 12%, transparent)` : "var(--bg)",
          transition: "border-color .3s ease, background .3s ease",
        }}
      >
        {fading === undefined ? <MonBody mon={mon} enemy={enemy} /> : (
          <div style={fadeStyle(fading)}><MonBody mon={mon} enemy={enemy} /></div>
        )}
      </div>
    </div>
  );
}

function Arrows({ left, right }: { left: string; right: string }) {
  return (
    <div className="my-1.5 grid grid-cols-2 gap-3" aria-hidden>
      <div className="text-center text-base" style={{ color: "var(--g-gold)" }}>{left}</div>
      <div className="text-center text-base" style={{ color: "var(--g-gold)" }}>{right}</div>
    </div>
  );
}

function Scenario({
  title, intro, button, onToggle, enemies, arrows, yours, outcome, fading, note,
}: {
  title: string;
  intro: string;
  button: string;
  onToggle: () => void;
  enemies: [Mon, Mon];
  arrows: [string, string];
  yours: React.ReactNode;
  outcome: string;
  fading: boolean;
  note?: string;
}) {
  return (
    <Card className="mt-5 p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold" style={{ color: "var(--g-dim)" }}>{title}</p>
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 cursor-pointer rounded-[20px] border border-line bg-raise px-3.5 py-1.5 text-[11px] font-bold text-t1 hover:border-[color:var(--acc)]"
          style={{ transition: "background .2s ease, border-color .2s ease" }}
        >
          {button}
        </button>
      </div>
      <p className="mb-3.5 text-[13px] leading-[1.5]" style={{ color: "var(--g-muted)" }}>{intro}</p>
      <div className="grid grid-cols-2 gap-3">
        <Slot label="Enemy left" mon={enemies[0]} enemy />
        <Slot label="Enemy right" mon={enemies[1]} enemy />
      </div>
      <Arrows left={arrows[0]} right={arrows[1]} />
      <div className="grid grid-cols-2 gap-3">{yours}</div>
      <p className="mt-4 text-sm leading-[1.55]" style={{ color: "var(--g-body)", opacity: fading ? 0 : 1, transition: "opacity .18s ease" }} aria-live="polite">
        {outcome}
      </p>
      {note && <p className="mt-2.5 text-[11px] leading-[1.5]" style={{ color: "var(--g-dim)" }}>{note}</p>}
    </Card>
  );
}

export function SwitchingLesson() {
  const m1 = useFadeToggle();
  const m2 = useFadeToggle();
  const m3 = useFadeToggle();

  const m2Left = m2.on ? INDEEDEE : CINDERACE;
  const m2Right = m2.on ? CINDERACE : INDEEDEE;
  const garganacl: Mon = m3.on ? { ...GARGANACL, note: "Sp. Def boosted by sand" } : GARGANACL;

  return (
    <>
      <Prose>
        <p>Swapping your active Pokémon costs your turn, so time it well. A defensive switch brings in something that resists the incoming move; an offensive switch brings in a threat the opponent now has to react to.</p>
        <p>Some moves attack and switch in the same action, keeping your momentum: U-turn, Volt Switch, and Flip Turn all do this. Trapping effects like Arena Trap stop the opponent from switching at all, though Ghost-types are always immune to it.</p>
      </Prose>

      <Scenario
        title="Try it: switch out your win condition"
        intro="Both opponents are throwing Ice-type moves at your left position, hoping to remove your sweeper before it ever attacks."
        button={m1.on ? "Switch back to Dragonite" : "Switch to Incineroar"}
        onToggle={m1.toggle}
        enemies={[WEAVILE, NINETALES_A]}
        arrows={["↓", "↙"]}
        fading={m1.fading}
        yours={<>
          <Slot label="Your left (targeted)" mon={m1.on ? INCINEROAR : DRAGONITE} outcome={m1.on ? "good" : "bad"} fading={m1.fading} />
          <Slot label="Your right" mon={RILLABOOM_SAFE} />
        </>}
        outcome={m1.on
          ? "Incineroar resists both Ice-type hits and stays healthy. Dragonite waits safely on the bench for a cleaner opening."
          : "Both Ice-type attacks tear through Dragonite before it can act, and your best late-game sweeper is gone."}
      />

      <Scenario
        title="Try it: Ally Switch under a double-up"
        intro="Both opponents are attacking your left position this turn. Whoever stands there takes both hits, and Ally Switch swaps positions without leaving the field."
        button={m2.on ? "Switch back" : "Use Ally Switch"}
        onToggle={m2.toggle}
        enemies={[PRIMARINA, BASCULEGION]}
        arrows={["↓", "↙"]}
        fading={m2.fading}
        yours={<>
          <Slot label="Your left (targeted)" mon={m2Left} outcome={m2.on ? "good" : "bad"} fading={m2.fading} />
          <Slot label="Your right" mon={m2Right} fading={m2.fading} />
        </>}
        outcome={m2.on
          ? "Indeedee-F takes both Water-type hits in stride. Cinderace is safe in the other slot and can attack next turn."
          : "Cinderace takes both hits in the exposed slot and faints before it can act."}
      />

      <Scenario
        title="Try it: switch in a weather setter"
        intro="The opponents are attacking both of your Pokémon at once with different moves. Tyranitar's Sand Stream can answer both."
        button={m3.on ? "Switch back to Rillaboom" : "Switch in Tyranitar"}
        onToggle={m3.toggle}
        enemies={[TORKOAL, PRIMARINA]}
        arrows={["↓", "↓"]}
        fading={m3.fading}
        yours={<>
          <Slot label="Your left (targeted)" mon={m3.on ? TYRANITAR : RILLABOOM} outcome={m3.on ? "good" : "bad"} fading={m3.fading} />
          <Slot label="Your right (targeted)" mon={garganacl} />
        </>}
        outcome={m3.on
          ? "Tyranitar resists the Fire attack outright, and Sand Stream's Special Defense boost lets Garganacl survive the Water attack it would otherwise lose to."
          : "Rillaboom is weak to the incoming Fire attack, and Garganacl's Special Defense is unboosted against the Water attack. Both hits land hard."}
        note="Sand Stream summons a sandstorm: Rock-types get a 50% Special Defense boost while it's active, and Rock, Ground, and Steel-types take no chip damage from the storm each turn."
      />
    </>
  );
}
