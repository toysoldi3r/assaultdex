"use client";

// The lighter lessons: prose plus one chip picker, choice card or checklist.

import { useState } from "react";
import { TYPE_HEX } from "@/components/ui";
import { Card, CardLabel, ProgressBar, Prose } from "../ui";
import { ChipPicker, TwoChoice } from "./shared";

export function FieldHazardsLesson() {
  return (
    <>
      <Prose>
        <p>Weather, terrain, and entry hazards like Stealth Rock change the whole battlefield for several turns at once, not just one Pokémon. They&apos;re usually the first things a team sets up.</p>
        <p>Entry hazards sit on one side and damage or weaken Pokémon as they switch in. Rapid Spin, Defog, or Court Change remove them; Flying-types and Levitate dodge the grounded ones entirely.</p>
      </Prose>
      <ChipPicker
        label="Weather: tap one"
        options={[
          { id: "rain", name: "Rain", desc: "Boosts Water-type moves, weakens Fire-type moves. Lasts 5 turns." },
          { id: "sun", name: "Sun", desc: "Boosts Fire-type moves, weakens Water-type moves. Lasts 5 turns." },
          { id: "sand", name: "Sand", desc: "Chips non-Rock/Ground/Steel types each turn, and boosts Rock-type Sp. Def. Lasts 5 turns." },
          { id: "snow", name: "Snow", desc: "Boosts Ice-type Defense. Lasts 5 turns." },
        ]}
      />
      <Prose size="md">
        <p>Terrain works the same way but only affects grounded Pokémon: Electric Terrain blocks sleep, Grassy Terrain heals a little each turn, Psychic Terrain blocks priority moves, and Misty Terrain blocks status. Reflect and Light Screen halve physical and special damage for a side; Aurora Veil does both, but needs Snow active first.</p>
      </Prose>
    </>
  );
}

export function ProtectionTargetingLesson() {
  return (
    <>
      <Prose>
        <p>Protect and Detect block every move against the user for a turn, a core doubles tool for stalling, dodging a double-up, or waiting out a threat. Using it several turns in a row gets less reliable each time, so it can&apos;t be spammed.</p>
        <p>Doubles has two opposing Pokémon on the field, so every single-target move needs a target. Spread moves hit both foes at once, but only for 0.75× damage each.</p>
      </Prose>
      <TwoChoice
        label="Try it: which one do you attack?"
        options={[
          { title: "Pokémon A", sub: "Low HP, dangerous if it attacks again", answer: "Removing the immediate threat is often right, but it leaves the wall free to act, and next turn both foes are healthy again." },
          { title: "Pokémon B", sub: "Full HP, a defensive wall", answer: "Chipping the wall can open it up later, but the low-HP threat gets a free hit in first, so make sure you can take it." },
        ]}
      />
    </>
  );
}

export function PositioningPredictionLesson() {
  return (
    <>
      <Prose>
        <p>Good play is mostly about positioning: creating favourable matchups and keeping the pressure on the opponent instead of just reacting to them.</p>
        <p>A safe play works out fine no matter what the opponent does: a resisted attack, a Protect on a threatened Pokémon. Prediction means reading whether they&apos;ll attack or switch, and acting on that read. Both have a place: over-predicting when a safe play would do is how you lose games you were winning.</p>
      </Prose>
      <TwoChoice
        label="Try it"
        prompt="The opponent's Pokémon is at 20% HP. What do you think they do?"
        options={[
          { title: "They attack", answer: "If you're reading an all-out attack, a resisted switch-in or a Protect both stay safe either way, that's the point of a good read." },
          { title: "They switch", answer: "If you're reading a switch, attacking now hits whatever comes in, strong if you can guess what that is but risky if you can't." },
        ]}
      />
    </>
  );
}

const WINCON_CARDS = [
  { q: "Which of my Pokémon actually wins me the game?", a: "Name it before you play a single turn. Everything else on your team exists to help it get there safely." },
  { q: "What does the opponent need to stop it?", a: "Spot their answer at team preview, and plan to remove or wear it down before you commit to the sweep." },
  { q: "Which of my Pokémon can I afford to lose?", a: "Deciding this in advance means sacrificing one isn't a panic decision mid-game. It's already the plan." },
];

export function WinConditionsLesson() {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  return (
    <>
      <Prose>
        <p>Every turn reveals information: the opponent&apos;s moves, items, abilities, speed, and how much damage things do. Track it; it turns guesses into reads.</p>
        <p>A win condition is the Pokémon or plan that will actually win you the game. Team preview, before the first turn, is where you spot it: look at the opponent&apos;s threats, guess their plan, and pick your leads around it.</p>
      </Prose>
      <Card className="mt-5">
        <CardLabel>Ask yourself: tap to reveal</CardLabel>
        <div className="flex flex-col gap-2">
          {WINCON_CARDS.map((c, i) => (
            <button
              key={c.q}
              type="button"
              aria-expanded={!!open[i]}
              onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}
              className="cursor-pointer rounded-[10px] border border-line bg-bg p-3.5 text-left"
            >
              <div className="text-sm font-semibold text-t1">{c.q}</div>
              {open[i] && (
                <div className="mt-2 text-[13px] leading-[1.55]" style={{ color: "var(--g-muted)", animation: "g-fadeInUp .25s ease" }}>{c.a}</div>
              )}
            </button>
          ))}
        </div>
      </Card>
    </>
  );
}

export function RolesSynergyLesson() {
  return (
    <>
      <Prose>
        <p>Every team slot should have a job. Naming each Pokémon&apos;s role makes it obvious when a team is missing something, and synergy is just those roles reinforcing each other.</p>
      </Prose>
      <ChipPicker
        label="Common roles: tap one"
        options={[
          { id: "sweeper", name: "Sweeper", desc: "A fast attacker that snowballs once it gets a chance to set up." },
          { id: "wallbreaker", name: "Wallbreaker", desc: "Hits so hard it breaks through defensive Pokémon that would otherwise wall the team." },
          { id: "cleaner", name: "Cleaner", desc: "Finishes off a weakened team late in the game." },
          { id: "wall", name: "Wall / Tank", desc: "Absorbs hits: a wall is pure defense, a tank hits back while it does." },
          { id: "support", name: "Support / Pivot", desc: "Redirection, screens, or speed control; pivots keep momentum by attacking and swapping out." },
          { id: "lead", name: "Lead", desc: "Sets the tone turn one: hazards, Tailwind, or a Fake Out." },
        ]}
      />
      <Prose size="md">
        <p>Defensive synergy means teammates cover each other&apos;s weaknesses. Offensive synergy means attackers break each other&apos;s checks. Type and ability synergy pair naturally: a Water-type sponging Fire attacks for a teammate, or Drizzle feeding a Swift Swim sweeper.</p>
      </Prose>
    </>
  );
}

function CoreBubble({ type }: { type: "fire" | "grass" | "water" }) {
  return (
    <span
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xs font-bold capitalize text-white"
      style={{ background: TYPE_HEX[type] }}
    >
      {type}
    </span>
  );
}

export function CoresArchetypesLesson() {
  const arrow = <span className="text-[13px] sm:text-base" style={{ color: "var(--g-dim)" }}>resists →</span>;
  return (
    <>
      <Prose>
        <p>A core is a small group of Pokémon, usually 2–3, built to work together: an offensive core breaks each other&apos;s checks, a defensive core covers each other&apos;s weaknesses.</p>
      </Prose>
      <Card className="mt-4 p-6">
        <CardLabel className="mb-4">A classic defensive core</CardLabel>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <CoreBubble type="fire" />{arrow}<CoreBubble type="grass" />{arrow}<CoreBubble type="water" />{arrow}<CoreBubble type="fire" />
        </div>
        <p className="mt-4 text-center text-[13px]" style={{ color: "var(--g-dim)" }}>
          Fire, Water, and Grass resist each other in a ring, so no single move type threatens the whole core.
        </p>
      </Card>
      <Prose>
        <p>Modes are different game plans inside one team (a fast Tailwind mode, a Trick Room mode, alternative leads), so you can adapt at team preview instead of playing the same way every game.</p>
      </Prose>
      <ChipPicker
        className="mt-4"
        label="Team archetypes: tap one"
        options={[
          { id: "balance", name: "Balance", desc: "A mix of offense and defense: the default, flexible plan." },
          { id: "hyper", name: "Hyper Offense", desc: "All-out attackers backed by speed control: pressure from turn one." },
          { id: "stall", name: "Stall", desc: "Win by chip damage and walls, rare in short doubles games but not unheard of." },
          { id: "weather", name: "Weather", desc: "Built around Rain, Sun, Sand, or Snow and the abilities that boost under it." },
          { id: "trickroom", name: "Trick Room", desc: "Built around being intentionally slow and powerful, then flipping turn order to go first anyway." },
        ]}
      />
    </>
  );
}

const STEPS = [
  "Pick one Pokémon, core, or strategy to build around",
  "List what it struggles against",
  "Add Pokémon that cover those weaknesses",
  "Add a hard-hitting attacker (a wallbreaker or sweeper)",
  "Add speed control (Tailwind, Trick Room, or Icy Wind)",
  "Add utility (redirection, Fake Out, or screens)",
  "Check type weaknesses and resistances across all six",
  "Test it in real games, then adjust",
];

export function BuildingATeamLesson() {
  const [checked, setChecked] = useState<boolean[]>(() => STEPS.map(() => false));
  const done = checked.filter(Boolean).length;
  return (
    <>
      <Prose>
        <p>Building a team is easier as a checklist than all at once. Work down this list, and tick off each step as you go.</p>
      </Prose>
      <Card className="mt-5">
        <div className="mb-3 flex items-center gap-2.5">
          <ProgressBar pct={Math.round((done / STEPS.length) * 100)} />
          <span className="shrink-0 mono text-xs" style={{ color: "var(--g-dim)" }}>{done}/{STEPS.length}</span>
        </div>
        <div className="flex flex-col gap-[9px]">
          {STEPS.map((label, i) => (
            <label key={label} className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                className="sr-only"
                checked={checked[i]}
                onChange={() => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))}
              />
              <span
                aria-hidden
                className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border text-xs font-bold"
                style={checked[i]
                  ? { background: "var(--g-gold)", borderColor: "var(--g-gold)", color: "var(--g-on-gold)" }
                  : { borderColor: "var(--line)" }}
              >
                {checked[i] ? "✓" : ""}
              </span>
              <span className="text-[13px]" style={{ color: "var(--g-body)" }}>{label}</span>
            </label>
          ))}
        </div>
      </Card>
      <Prose size="md">
        <p>Do the early steps in Teams: it checks legality and shows shared weaknesses and speed as you go. Test the finished build in ChoiceDex before you take it into a real match.</p>
      </Prose>
    </>
  );
}
