"use client";

// Moves & Damage: physical vs special card, a stacking-modifier damage bar and
// an accuracy-vs-power (expected value) comparison with a rain toggle.

import { useState } from "react";
import { Card, CardLabel, Chip, Prose } from "../ui";

const BLUE = "var(--g-blue)";
const GOLD = "var(--g-gold)";
const PURPLE = "oklch(71% 0.13 300)";
const RED = "oklch(71% 0.13 25)";

const SCALE = 380; // bar width in damage units (120 BP × 1.5 × 1.3 × 1.5 ≈ 351)
const MODS = [
  { id: "stab", label: "STAB ×1.5", short: "STAB", mult: 1.5 },
  { id: "lifeOrb", label: "Life Orb ×1.3", short: "Life Orb", mult: 1.3 },
  { id: "crit", label: "Critical ×1.5", short: "Critical", mult: 1.5 },
] as const;
type ModId = (typeof MODS)[number]["id"];

const MOVES = [
  { id: "thunder", name: "Thunder", bp: 110, acc: 0.7, rainAcc: 1.0 },
  { id: "discharge", name: "Discharge", bp: 80, acc: 1.0, rainAcc: 1.0 },
];
const MAX_EXPECTED = 120;

function StatBox({ who, stat, color, bg, border }: { who: string; stat: string; color: string; bg: string; border: string }) {
  return (
    <span className="flex-1 rounded-[10px] border px-2 py-3 text-center" style={{ background: bg, borderColor: border }}>
      <span className="block text-[10px] font-bold tracking-[.04em]" style={{ color }}>{who}</span>
      <span className="mt-1 block text-sm font-bold text-t1">{stat}</span>
    </span>
  );
}

function PhysSpec({ title, stat, target, color, bg }: { title: string; stat: string; target: string; color: string; bg: string }) {
  return (
    <div className="min-w-[220px] flex-1">
      <div className="mb-2.5 text-[13px] font-bold text-t1">{title}</div>
      <div className="flex items-center gap-2.5">
        <StatBox who="ATTACKER'S" stat={stat} color={color} bg={bg} border={color} />
        <span className="shrink-0 text-base" style={{ color: "var(--g-dim)" }}>→</span>
        <StatBox who="DEFENDER'S" stat={target} color="var(--g-muted)" bg="var(--raise)" border="var(--line)" />
      </div>
    </div>
  );
}

export function DamageLesson() {
  const [power, setPower] = useState(60);
  const [mods, setMods] = useState<Record<ModId, boolean>>({ stab: false, lifeOrb: false, crit: false });
  const [rain, setRain] = useState(false);

  const active = MODS.filter((m) => mods[m.id]);
  const total = active.reduce((a, m) => a * m.mult, 1);
  const min = Math.round(power * total * 0.85);
  const max = Math.round(power * total);
  const barColor = [BLUE, GOLD, PURPLE, RED][active.length]!;
  const summary = active.length === 0
    ? `No modifiers active: damage rolls between ${min} and ${max}, the move's plain base power.`
    : `${active.map((m) => m.short).join(" + ")} multiply this hit by ×${Math.round(total * 100) / 100}, for ${min}–${max} damage instead of ${Math.round(power * 0.85)}–${power}.`;

  const moves = MOVES.map((m) => {
    const acc = rain ? m.rainAcc : m.acc;
    const hits10 = Math.round(acc * 100) / 10;
    return {
      ...m, acc,
      expected: (Math.round(m.bp * acc * 10) / 10).toFixed(1),
      hits10,
      total10: Math.round(m.bp * hits10),
      pct: Math.round(((m.bp * acc) / MAX_EXPECTED) * 100),
      color: m.id === "thunder" ? BLUE : GOLD,
      value: m.bp * acc,
    };
  });
  const [a, b] = moves as [typeof moves[0], typeof moves[0]];
  let verdict: string;
  if (a.value === b.value) {
    verdict = `${a.name} and ${b.name} deal the same expected power right now.`;
  } else {
    const win = a.value > b.value ? a : b;
    const lose = win === a ? b : a;
    const diff = Math.round(((win.value - lose.value) / lose.value) * 1000) / 10;
    verdict = `${win.name} comes out ahead here, dealing about ${diff}% more expected power over time than ${lose.name}.`;
  }
  const ease = "cubic-bezier(.22,.9,.32,1)";

  return (
    <>
      <Prose>
        <p>Moves come in three classes: physical moves use Attack against the target&apos;s Defense, special moves use Sp. Atk against Sp. Def, and status moves deal no damage at all: they just change the state of the battle.</p>
        <p>Every damaging move also has a type, base power, accuracy, and a limited number of uses (PP). A move that matches one of the user&apos;s own types gets a same-type bonus, and type effectiveness (see Typing) scales it further.</p>
        <p>No hit does exactly one number of damage: every hit rolls between 85% and 100% of its calculated value, and roughly one hit in twenty-four is a critical hit for another 1.5×, ignoring the target&apos;s defensive stat boosts.</p>
      </Prose>

      <Card className="mt-5 p-5">
        <CardLabel className="mb-4">Physical vs. special</CardLabel>
        <div className="flex flex-wrap gap-4">
          <PhysSpec title="Physical moves" stat="Attack" target="Defense" color={BLUE} bg="var(--g-blue-bg)" />
          <PhysSpec title="Special moves" stat="Sp. Atk" target="Sp. Def" color={GOLD} bg="var(--g-gold-bg)" />
        </div>
      </Card>

      <Card className="mt-5">
        <CardLabel>Try it: stack STAB, Life Orb and a crit</CardLabel>
        <div className="mb-3 flex gap-2">
          {[60, 120].map((p) => <Chip key={p} on={p === power} onClick={() => setPower(p)}>{p} BP</Chip>)}
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {MODS.map((m) => (
            <Chip key={m.id} tone="gold" on={mods[m.id]} onClick={() => setMods((s) => ({ ...s, [m.id]: !s[m.id] }))}>{m.label}</Chip>
          ))}
        </div>
        <div className="mb-1 flex justify-between text-xs" style={{ color: "var(--g-dim)" }}>
          <span>Damage range</span><span className="mono text-t1">{min}–{max}</span>
        </div>
        <div className="relative h-3 rounded-md bg-raise">
          <span
            className="absolute bottom-0 top-0 rounded-md"
            style={{
              left: `${Math.round((min / SCALE) * 100)}%`,
              width: `${Math.max(1, Math.round(((max - min) / SCALE) * 100))}%`,
              background: barColor,
              transition: `left .35s ${ease}, width .35s ${ease}, background .35s ease`,
            }}
          />
        </div>
        <p className="mt-3.5 text-sm leading-[1.55]" style={{ color: "var(--g-body)" }} aria-live="polite">{summary}</p>
      </Card>

      <Card className="mt-5">
        <CardLabel className="mb-1">Try it: accuracy vs. raw power</CardLabel>
        <p className="mb-3.5 text-[13px] leading-[1.5]" style={{ color: "var(--g-muted)" }}>
          Real damage over time depends on both power and how often a move lands. <strong className="text-t1">Expected power = Base Power × Accuracy.</strong>
        </p>
        <div className="flex flex-wrap gap-3">
          {moves.map((m) => (
            <div key={m.id} className="min-w-[180px] flex-1 rounded-[10px] border border-line bg-bg p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-t1">{m.name}</span>
                <span className="mono text-xs" style={{ color: "var(--g-dim)" }}>{m.bp} BP</span>
              </div>
              <div className="mt-1.5 text-xs" style={{ color: "var(--g-muted)" }}>
                Accuracy: {Math.round(m.acc * 100)}%{rain && m.rainAcc !== MOVES.find((x) => x.id === m.id)!.acc ? " (rain)" : ""}
              </div>
              <div className="mt-2.5 h-2.5 overflow-hidden rounded-[5px] bg-raise">
                <span className="block h-full rounded-[5px]" style={{ width: `${m.pct}%`, background: m.color, transition: `width .3s ${ease}` }} />
              </div>
              <div className="mt-2 mono text-[13px] font-bold" style={{ color: m.color }}>{m.expected} expected power</div>
              <div className="mt-1 text-[11px]" style={{ color: "var(--g-dim)" }}>Over 10 turns: {m.hits10} hits, {m.total10} total power</div>
            </div>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={rain}
          onClick={() => setRain((r) => !r)}
          className="mt-3.5 cursor-pointer rounded-lg border border-line bg-raise px-3.5 py-[7px] text-xs font-semibold"
          style={{ color: rain ? "var(--g-blue)" : "var(--g-muted)", borderColor: rain ? "var(--g-blue)" : "var(--line)", transition: "border-color .2s ease, color .2s ease" }}
        >
          Rain: {rain ? "On" : "Off"}
        </button>
        <p className="mt-3.5 text-sm leading-[1.55]" style={{ color: "var(--g-body)" }} aria-live="polite">{verdict}</p>
        <p className="mt-2.5 text-[11px] leading-[1.5]" style={{ color: "var(--g-dim)" }}>
          This compares base power and accuracy only. Real damage also depends on stats, STAB, type effectiveness, critical hits, abilities, items, and weather.
        </p>
      </Card>
    </>
  );
}
