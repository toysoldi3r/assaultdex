"use client";

// Turn Order (speed vs priority, rows slide into their new place) and Status
// (repo status colours / abbreviations, plus volatile conditions).

import { useState } from "react";
import { STATUS_COLOR, STATUS_SHORT } from "@/components/choicedex/design/tokens";
import { Card, CardLabel, Prose } from "../ui";

// Base Speed values. All four species are in the Champions roster.
const TURN_MONS = [
  { id: "rillaboom", name: "Rillaboom", speed: 85, side: "team" },
  { id: "hatterene", name: "Hatterene", speed: 29, side: "team" },
  { id: "dragapult", name: "Dragapult", speed: 142, side: "enemy" },
  { id: "torkoal", name: "Torkoal", speed: 20, side: "enemy" },
] as const;
const ROW_H = 52;
const GAP = 8;
const STEP = ROW_H + GAP;

export function TurnOrderLesson() {
  const [priority, setPriority] = useState<Record<string, boolean>>({});
  const mons = TURN_MONS.map((m) => ({ ...m, active: !!priority[m.id] }));
  const sorted = [...mons].sort((a, b) => Number(b.active) - Number(a.active) || b.speed - a.speed);
  const rank = new Map(sorted.map((m, i) => [m.id, i]));
  const actives = mons.filter((m) => m.active).sort((a, b) => b.speed - a.speed);

  let summary: string;
  if (actives.length === 0) summary = `Speed decides everything here: ${sorted[0]!.name} moves first, ${sorted[sorted.length - 1]!.name} moves last.`;
  else if (actives.length === 1) summary = `${actives[0]!.name} moves first no matter its Speed: priority always resolves before Speed.`;
  else if (actives.length === 2) summary = `Both priority users move first. ${actives[0]!.name} still goes ahead of ${actives[1]!.name}, since Speed breaks ties within the same priority.`;
  else summary = `All priority users move first. Among them, ${actives.map((m) => m.name).join(" then ")}: Speed still breaks ties within the same priority.`;

  const side = (s: "team" | "enemy") => (
    <div className="min-w-[220px] flex-1">
      <div className="mb-2 text-[11px] font-bold tracking-[.04em]" style={{ color: s === "team" ? "var(--g-blue)" : "var(--g-gold)" }}>
        {s === "team" ? "Your team" : "Opponent"}
      </div>
      <div className="flex flex-col gap-2">
        {mons.filter((m) => m.side === s).map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-2.5 rounded-[10px] border border-line bg-bg px-3 py-2.5">
            <span>
              <span className="block text-[13px] font-semibold text-t1">{m.name}</span>
              <span className="block mono text-[11px]" style={{ color: "var(--g-dim)" }}>Speed {m.speed}</span>
            </span>
            <button
              type="button"
              aria-pressed={m.active}
              onClick={() => setPriority((p) => ({ ...p, [m.id]: !p[m.id] }))}
              className="shrink-0 cursor-pointer rounded-[20px] border px-3 py-1.5 text-[11px] font-bold"
              style={{
                borderColor: m.active ? "var(--g-gold)" : "var(--line)",
                background: m.active ? "var(--g-gold-bg)" : "transparent",
                color: m.active ? "var(--g-gold)" : "var(--g-muted)",
                transition: "background .2s ease, border-color .2s ease, color .2s ease",
              }}
            >
              {m.active ? "Priority ON" : "+ Priority"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <Prose>
        <p>Every move has a priority level. Higher priority always goes first, no matter how fast either Pokémon is. Inside the same priority tier, the faster Pokémon acts first.</p>
      </Prose>
      <Card className="mt-5">
        <CardLabel className="mb-3.5">Try it: two teams, four speeds</CardLabel>
        <div className="mb-4 flex flex-wrap gap-4">{side("team")}{side("enemy")}</div>
        <div className="border-t border-line pt-3.5">
          <p className="mb-2.5 text-[11px] font-bold tracking-[.04em]" style={{ color: "var(--g-dim)" }}>Turn order this round</p>
          <ol className="relative" style={{ height: TURN_MONS.length * STEP - GAP }} aria-label="Turn order">
            {mons.map((m) => {
              const r = rank.get(m.id)!;
              const accent = m.active ? "var(--g-gold)" : m.side === "team" ? "var(--g-blue)" : "var(--line)";
              return (
                <li
                  key={m.id}
                  className="absolute inset-x-0 top-0 flex items-center gap-3 rounded-lg bg-raise px-3 py-2"
                  style={{
                    height: ROW_H,
                    borderLeft: `3px solid ${accent}`,
                    transform: `translateY(${r * STEP}px)`,
                    transition: "transform .4s cubic-bezier(.22,.9,.32,1), border-color .3s ease",
                  }}
                >
                  <span className="w-[18px] shrink-0 mono text-xs" style={{ color: "var(--g-dim)" }}>{r + 1}</span>
                  <span className="min-w-[90px] text-[13px] font-semibold text-t1 sm:min-w-[120px]">{m.name}</span>
                  <span className="text-[11px] font-bold" style={{ color: m.side === "team" ? "var(--g-blue)" : "var(--g-gold)" }}>{m.side === "team" ? "Team" : "Enemy"}</span>
                  <span className="hidden mono text-xs sm:inline" style={{ color: "var(--g-dim)" }}>Spe {m.speed}</span>
                  {m.active && (
                    <span className="ml-auto rounded px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ color: "var(--g-gold)", background: "var(--g-gold-bg)" }}>Priority</span>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-[13px] leading-[1.5]" style={{ color: "var(--g-body)" }} aria-live="polite">{summary}</p>
        </div>
      </Card>
      <Prose>
        <p>Tailwind doubles your side&apos;s Speed for a few turns. Trick Room flips who counts as &quot;fast&quot; for five turns, useful if your team is intentionally slow and powerful.</p>
      </Prose>
    </>
  );
}

const STATUSES = [
  { key: "burn", name: "Burn", effects: "Chip damage every turn; halves the damage dealt by physical moves.", special: "Fire-types can't be burned." },
  { key: "paralysis", name: "Paralysis", effects: "Halves Speed; a 25% chance each turn to not move at all.", special: "Electric-types can't be paralyzed." },
  { key: "poison", name: "Poison", effects: "A fixed amount of chip damage every turn.", special: "Poison- and Steel-types can't be poisoned." },
  { key: "toxic", name: "Badly poisoned", effects: "Chip damage that grows larger each turn it persists.", special: "Same type immunities as regular poison." },
  { key: "sleep", name: "Sleep", effects: "Can't move for a few turns, chosen randomly when it falls asleep.", special: "Insomnia and Vital Spirit prevent it entirely." },
  { key: "freeze", name: "Freeze", effects: "Can't move until it thaws, which is rare and random.", special: "Ice-types can't be frozen; a Fire-type move can thaw the target on hit." },
];

const VOLATILES = [
  { name: "Confusion", desc: "A chance each turn to hit itself instead of using the chosen move." },
  { name: "Flinch", desc: "Skips its turn entirely if hit before it moves." },
  { name: "Taunt", desc: "Blocks status moves for a few turns, forcing the target to attack instead." },
  { name: "Encore", desc: "Locks the target into repeating its last move for a few turns." },
  { name: "Disable", desc: "Blocks the target from using its most recently used move for a few turns." },
  { name: "Infatuation", desc: "A 50% chance each turn that the infatuated Pokémon can't act at all." },
  { name: "Leech Seed", desc: "Drains HP each turn and heals whoever planted it. Grass-types are immune." },
];

export function StatusLesson() {
  const th = "border-b border-line pb-2 text-left text-[11px] font-bold";
  const td = "border-b border-raise py-2.5 align-top";
  return (
    <>
      <Prose>
        <p>Burn, paralysis, poison, and sleep all last until cured, and can decide a battle on their own: paralysis alone halves Speed and can make a Pokémon skip its turn entirely. Only one major status can affect a Pokémon at a time.</p>
      </Prose>
      <Card className="mt-5 overflow-x-auto">
        <CardLabel className="mb-3.5">Status conditions</CardLabel>
        <table className="w-full min-w-[650px] border-collapse">
          <thead>
            <tr style={{ color: "var(--g-dim)" }}>
              <th className={`${th} w-[140px] pr-4`}>Status</th>
              <th className={`${th} w-[76px] pr-4`}>Badge</th>
              <th className={`${th} pr-4`}>Effects</th>
              <th className={th}>Special interactions</th>
            </tr>
          </thead>
          <tbody>
            {STATUSES.map((s) => (
              <tr key={s.key}>
                <td className={`${td} whitespace-nowrap pr-4 text-[13px] font-semibold text-t1`}>{s.name}</td>
                <td className={`${td} pr-4`}>
                  <span className="rounded-md px-[7px] py-0.5 text-[10px] font-bold uppercase text-white" style={{ background: STATUS_COLOR[s.key] }}>
                    {STATUS_SHORT[s.key]}
                  </span>
                </td>
                <td className={`${td} pr-4 text-[13px] leading-[1.5]`} style={{ color: "var(--g-body)" }}>{s.effects}</td>
                <td className={`${td} text-[13px] leading-[1.5]`} style={{ color: "var(--g-muted)" }}>{s.special}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card className="mt-5">
        <CardLabel>Volatile conditions</CardLabel>
        <div className="flex flex-col gap-2.5">
          {VOLATILES.map((v) => (
            <div key={v.name} className="text-[13px] leading-[1.5]">
              <span className="font-bold text-t1">{v.name}:</span>
              <span style={{ color: "var(--g-muted)" }}> {v.desc}</span>
            </div>
          ))}
        </div>
        <p className="mt-3.5 text-[13px] leading-[1.55]" style={{ color: "var(--g-dim)" }}>
          These are lighter, temporary effects that usually clear when the Pokémon switches out. Type immunities (Fire can&apos;t be burned), certain abilities, and berries like Lum can prevent or cure major status before it matters.
        </p>
      </Card>
    </>
  );
}
