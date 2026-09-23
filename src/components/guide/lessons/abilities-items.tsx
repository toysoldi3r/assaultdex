"use client";

// Abilities & Items: two example pickers, each with a small battlefield
// animation showing when and how the effect triggers. Re-selecting an example
// remounts the field (keyed by id) so its animation replays.

import { useState, type CSSProperties, type ReactNode } from "react";
import { ItemIcon } from "@/components/ItemIcon";
import { Card, CardLabel, Chip, GuideMon, Prose } from "../ui";

interface Badge { text: string; color: string; anim: string }
interface FieldFx {
  allyAnim?: string;
  oppAnim?: string;
  allyBadge?: Badge;
  oppBadge?: Badge;
  fieldBadge?: Badge;
  travelBadge?: Badge;
}

const GOLD = "var(--g-gold)";
const GOOD = "#6fc48f";
const BAD = "#e08a8a";

// Every species below is in the Champions roster and can have the ability /
// commonly holds the item shown.
const ABILITIES: ({ id: string; name: string; mon: string } & FieldFx)[] = [
  { id: "intimidate", name: "Intimidate", mon: "Incineroar",
    oppAnim: "g-shakeX .4s ease .3s", oppBadge: { text: "▼ ATK", color: BAD, anim: "g-dropInR .4s ease .3s both" } },
  { id: "levitate", name: "Levitate", mon: "Rotom",
    allyAnim: "g-flashPulseL .3s ease .55s both",
    allyBadge: { text: "IMMUNE", color: GOOD, anim: "g-popInL .3s ease .55s both" },
    travelBadge: { text: "EQ", color: "#c99a5c", anim: "g-travelLeft .5s ease both" } },
  { id: "moldbreaker", name: "Mold Breaker", mon: "Excadrill",
    oppBadge: { text: "HIT", color: BAD, anim: "g-popInR .3s ease .5s both" },
    travelBadge: { text: "EQ", color: "#c99a5c", anim: "g-travelRight .5s ease both" } },
  { id: "drizzle", name: "Drizzle", mon: "Pelipper",
    fieldBadge: { text: "RAIN", color: "#7fb2f5", anim: "g-dropInL .4s ease .3s both" } },
  { id: "regenerator", name: "Regenerator", mon: "Toxapex",
    allyAnim: "g-healFade .8s ease both",
    allyBadge: { text: "+33%", color: GOOD, anim: "g-riseFade .8s ease .2s both" } },
];

const ITEMS: ({ id: string; name: string; mon: string } & FieldFx)[] = [
  { id: "scarf", name: "Choice Scarf", mon: "Dragapult",
    allyBadge: { text: "»» SPD", color: GOLD, anim: "g-flashPulseL .6s ease infinite" } },
  { id: "sash", name: "Focus Sash", mon: "Cinderace",
    allyAnim: "g-flashPulseL .5s ease .2s both",
    allyBadge: { text: "1 HP", color: GOOD, anim: "g-popInL .3s ease .3s both" } },
  { id: "leftovers", name: "Leftovers", mon: "Garganacl",
    allyBadge: { text: "+HP", color: GOOD, anim: "g-riseFade 1.4s ease infinite" } },
  { id: "lifeorb", name: "Life Orb", mon: "Garchomp",
    allyAnim: "g-flashPulseL .6s ease infinite",
    allyBadge: { text: "×1.3 / −10%", color: GOLD, anim: "g-dropInL .4s ease .2s both" } },
  { id: "rockyhelmet", name: "Rocky Helmet", mon: "Corviknight",
    oppAnim: "g-lunge .6s ease both",
    oppBadge: { text: "−1/6 HP", color: BAD, anim: "g-dropInR .4s ease .55s both" } },
];

const badgeBase = "absolute rounded-md px-[7px] py-0.5 text-[11px] font-extrabold";

function FieldBadge({ b, style }: { b?: Badge; style: CSSProperties }) {
  if (!b) return null;
  return <span className={badgeBase} style={{ ...style, color: b.color, background: "var(--g-overlay)", animation: b.anim }}>{b.text}</span>;
}

/** Mini battlefield: your Pokémon bottom-left, a generic opponent top-right. */
function Field({ mon, fx, background }: { mon: string; fx: FieldFx; background: string }) {
  const shadow: CSSProperties = { position: "absolute", width: 74, height: 26, borderRadius: "50%", background: "rgba(0,0,0,.35)" };
  return (
    <div className="relative mt-3.5 h-[110px] overflow-hidden rounded-[10px]" style={{ background }} aria-hidden>
      <FieldBadge b={fx.fieldBadge} style={{ left: "50%", top: 6, transform: "translateX(-50%)", letterSpacing: ".05em" }} />
      <div style={{ ...shadow, left: 56, bottom: 12, transform: "translateX(-50%)" }} />
      <GuideMon species={mon} size={60} style={{ position: "absolute", left: 56, bottom: 14, transform: "translateX(-50%)", animation: fx.allyAnim }} />
      <FieldBadge b={fx.allyBadge} style={{ left: 56, bottom: 78, transform: "translateX(-50%)" }} />
      <div style={{ ...shadow, right: 56, top: 12, transform: "translateX(50%)" }} />
      <div
        className="absolute flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed bg-raise text-[9px] font-bold tracking-[.05em]"
        style={{ right: 56, top: 14, transform: "translateX(50%)", borderColor: "var(--g-faint)", color: "var(--g-dim)", animation: fx.oppAnim }}
      >
        OPP
      </div>
      <FieldBadge b={fx.oppBadge} style={{ right: 56, top: 2, transform: "translateX(50%)" }} />
      <FieldBadge b={fx.travelBadge} style={{ left: "50%", top: 44, transform: "translate(-50%,0)" }} />
    </div>
  );
}

function Explain({ text, children }: { text: string; children: ReactNode }) {
  return (
    <div className="mt-3.5" style={{ animation: "g-fadeInUp .25s ease" }}>
      <p className="mb-3 text-sm leading-[1.55]" style={{ color: "var(--g-body)" }}>{text}</p>
      <div className="rounded-[10px] bg-bg p-3.5">{children}</div>
    </div>
  );
}

const arrow = <span className="text-sm" style={{ color: "var(--g-dim)" }}>→</span>;
const tag = (text: string, color: string, bg: string, anim?: string) => (
  <span className="rounded-md px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[.04em]" style={{ color, background: bg, animation: anim }}>{text}</span>
);

function HpBar({ label, value, pct, color, anim }: { label: string; value: string; pct: number; color: string; anim: string }) {
  return (
    <>
      <div className="mb-1.5 flex justify-between text-[11px]" style={{ color: "var(--g-muted)" }}>
        <span>{label}</span><span className="mono text-t1">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-[5px] bg-raise">
        <span className="block h-full rounded-[5px]" style={{ width: `${pct}%`, background: color, animation: anim }} />
      </div>
    </>
  );
}

function abilityDetail(id: string) {
  switch (id) {
    case "intimidate":
      return (
        <Explain text="Drops the opposing Pokémon's Attack by one stage the moment this Pokémon switches in.">
          <div className="flex items-center gap-3.5">
            <span className="text-[11px]" style={{ color: "var(--g-muted)" }}>Switches in</span>{arrow}
            <span className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-t1">Opponent Attack</span>
              <span className="text-sm font-extrabold" style={{ color: BAD, animation: "g-dropIn .4s ease .1s both" }}>▼ −1</span>
            </span>
          </div>
        </Explain>
      );
    case "levitate":
      return (
        <Explain text="Makes this Pokémon immune to Ground-type moves and grounded hazards.">
          <div className="flex items-center gap-3">
            <span className="rounded-md px-2.5 py-1 text-xs font-bold" style={{ background: "#a9702f26", color: "#c99a5c" }}>Earthquake</span>{arrow}
            {tag("Immune: 0 damage", GOOD, "#6fc48f22", "g-popIn .3s ease")}
          </div>
        </Explain>
      );
    case "moldbreaker":
      return (
        <Explain text="Ignores the target's ability when attacking, so Earthquake still hits a Levitate user.">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold line-through" style={{ color: "var(--g-muted)", textDecorationColor: BAD, animation: "g-popIn .3s ease" }}>Levitate ignored</span>{arrow}
            {tag("Earthquake hits", BAD, "#e08a8a22", "g-dropIn .35s ease .1s both")}
          </div>
        </Explain>
      );
    case "drizzle":
      return (
        <Explain text="Summons rain the moment this Pokémon switches in: Water moves get 1.5× power and Fire moves weaken, for the whole team until the weather changes.">
          <div className="flex flex-wrap items-center gap-3.5">
            <span className="text-[11px]" style={{ color: "var(--g-muted)" }}>Switches in</span>{arrow}
            {tag("Rain: 5 turns", "#7fb2f5", "#2980ef22", "g-dropIn .4s ease .1s both")}
            <span className="ml-auto text-[10px]" style={{ color: "var(--g-dim)" }}>Water ×1.5, Fire ×0.5</span>
          </div>
        </Explain>
      );
    default:
      return (
        <Explain text="Restores 33% of this Pokémon's max HP whenever it switches out, on top of any damage it already dealt while in.">
          <HpBar label="HP on switch-out" value="54 → 87 / 100" pct={87} color={GOOD} anim="g-dropIn .5s ease .1s both" />
        </Explain>
      );
  }
}

function itemDetail(id: string) {
  switch (id) {
    case "scarf":
      return (
        <Explain text="1.5× Speed, but this Pokémon is locked into the first move it uses until it switches out.">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px]" style={{ color: "var(--g-muted)" }}>Speed</span>
            <span className="mono text-[15px] font-bold text-t1">100</span>{arrow}
            <span className="mono text-base font-extrabold" style={{ color: GOLD, animation: "g-dropIn .35s ease .1s both" }}>150</span>
            <span className="ml-auto rounded-md px-2 py-[3px] text-[10px] font-bold" style={{ background: "#e08a8a22", color: BAD }}>locked to 1 move</span>
          </div>
        </Explain>
      );
    case "sash":
      return (
        <Explain text="Survives any hit that would knock it out from full HP, at the cost of the item, once.">
          <HpBar label="HP" value="1 / 100" pct={1} color={GOLD} anim="g-flashPulse .5s ease" />
          <div className="mt-2 text-[11px] font-bold" style={{ color: GOOD, animation: "g-fadeInUp .3s ease .15s both" }}>Survives at 1 HP, sash consumed</div>
        </Explain>
      );
    case "leftovers":
      return (
        <Explain text="Heals a small amount of HP at the end of every turn while held.">
          <HpBar label="HP, end of turn" value="+6%" pct={72} color={GOOD} anim="g-healPulse 1.6s ease-in-out infinite" />
        </Explain>
      );
    case "lifeorb":
      return (
        <Explain text="Boosts the power of every move by 1.3×, but costs 10% of this Pokémon's max HP every time it attacks.">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px]" style={{ color: "var(--g-muted)" }}>Move power</span>
            <span className="mono text-[15px] font-extrabold" style={{ color: GOLD, animation: "g-popIn .3s ease" }}>×1.3</span>
            <span className="ml-auto rounded-md px-2 py-[3px] text-[10px] font-bold" style={{ background: "#e08a8a22", color: BAD, animation: "g-dropIn .35s ease .1s both" }}>−10% HP per hit</span>
          </div>
        </Explain>
      );
    default:
      return (
        <Explain text="Damages any Pokémon that hits this one with a contact move, for 1/6 of the attacker's max HP.">
          <div className="flex items-center gap-3.5">
            <span className="rounded-md px-2.5 py-1 text-xs font-bold" style={{ background: "#9aa2ac22", color: "var(--g-body)" }}>Contact move</span>{arrow}
            {tag("Attacker −1/6 HP", BAD, "#e08a8a22", "g-dropIn .35s ease .1s both")}
          </div>
        </Explain>
      );
  }
}

export function AbilitiesItemsLesson() {
  const [abilityId, setAbilityId] = useState("intimidate");
  const [itemId, setItemId] = useState("scarf");
  const ab = ABILITIES.find((a) => a.id === abilityId)!;
  const it = ITEMS.find((i) => i.id === itemId)!;
  return (
    <>
      <Prose>
        <p>An ability is a passive power every Pokémon has, always the same one unless something changes it. Abilities roughly fall into a few families: always-on passives, effects that fire the moment a Pokémon switches in, reactions to a specific event, and outright immunities to a type or effect.</p>
        <p>A held item gives one Pokémon an extra effect. Some are used up once: a berry that heals at low HP. Some lock you into a trade-off: Choice items hit much harder but lock you into one move until you switch. Others are just a steady passive bonus.</p>
      </Prose>

      <Card className="mt-5">
        <CardLabel>Abilities: tap one</CardLabel>
        <div className="mb-1 flex flex-wrap gap-2">
          {ABILITIES.map((a) => <Chip key={a.id} on={a.id === abilityId} onClick={() => setAbilityId(a.id)}>{a.name}</Chip>)}
        </div>
        <div className="mt-4 flex items-center gap-2.5 border-b border-line pb-3.5">
          <GuideMon species={ab.mon} size={44} />
          <div>
            <div className="text-sm font-bold text-t1">{ab.mon}</div>
            <div className="mt-px text-[11px] font-bold uppercase tracking-[.05em]" style={{ color: "var(--g-blue)" }}>{ab.name}</div>
          </div>
        </div>
        <Field key={ab.id} mon={ab.mon} fx={ab} background="linear-gradient(180deg,#1a2e22 0%,#142219 100%)" />
        <div key={`d-${ab.id}`}>{abilityDetail(ab.id)}</div>
      </Card>

      <Card className="mt-5">
        <CardLabel>Items: tap one</CardLabel>
        <div className="mb-1 flex flex-wrap gap-2">
          {ITEMS.map((i) => <Chip key={i.id} tone="gold" on={i.id === itemId} onClick={() => setItemId(i.id)}>{i.name}</Chip>)}
        </div>
        <div className="mt-4 flex items-center gap-2.5 border-b border-line pb-3.5">
          <GuideMon species={it.mon} size={44} />
          <ItemIcon key={it.name} item={it.name} size={26} />
          <div>
            <div className="text-sm font-bold text-t1">{it.mon}</div>
            <div className="mt-px text-[11px] font-bold uppercase tracking-[.05em]" style={{ color: GOLD }}>{it.name}</div>
          </div>
        </div>
        <Field key={it.id} mon={it.mon} fx={it} background="linear-gradient(180deg,#241f30 0%,var(--panel) 100%)" />
        <div key={`d-${it.id}`}>{itemDetail(it.id)}</div>
      </Card>
    </>
  );
}
