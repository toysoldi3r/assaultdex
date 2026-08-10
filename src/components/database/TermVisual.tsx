// Small, self-contained diagrams illustrating each competitive term. Pure
// markup (no hooks, no external images) so it renders on the server and never
// requests a third-party asset. One diagram per TermVisualKind.

import { PokeIcon } from "@/components/PokeIcon";
import { TypeBadge } from "@/components/ui";
import type { TermVisualKind } from "@/data/terminology";
import type { PokemonType } from "@/domain/types/pokemon";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Illustration
      </div>
      {children}
    </div>
  );
}

function Mon({ species, label }: { species: string; label?: string }) {
  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden">
        <PokeIcon species={species} className="scale-125" />
      </span>
      <span className="text-[10px] text-slate-400">{label ?? species}</span>
    </span>
  );
}

function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "pos" | "neg" | "acc" }) {
  const cls =
    tone === "pos"
      ? "bg-emerald-600/20 text-emerald-300 border-emerald-600/40"
      : tone === "neg"
        ? "bg-rose-600/20 text-rose-300 border-rose-600/40"
        : tone === "acc"
          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
          : "bg-slate-800 text-slate-300 border-slate-700";
  return <span className={`rounded border px-2 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>;
}

function Arrow({ label }: { label?: string }) {
  return (
    <span className="flex flex-col items-center text-slate-500">
      <span className="text-lg leading-none">→</span>
      {label && <span className="text-[9px] uppercase">{label}</span>}
    </span>
  );
}

/** Horizontal HP bar. */
function HpBar({ pct, label }: { pct: number; label?: string }) {
  const color = pct <= 0 ? "#64748b" : pct < 25 ? "#ef4444" : pct < 55 ? "#f59e0b" : "#22c55e";
  return (
    <span className="flex items-center gap-2">
      <span className="h-2.5 w-28 overflow-hidden rounded bg-slate-800">
        <span className="block h-full rounded" style={{ width: `${Math.max(0, pct)}%`, backgroundColor: color }} />
      </span>
      <span className="w-14 text-[10px] tabular-nums text-slate-400">{label ?? `${pct}%`}</span>
    </span>
  );
}

/** Labelled stat bar (0-100 width driven by value/max). */
function StatBar({ label, value, max = 255, color = "#38bdf8" }: { label: string; value: number; max?: number; color?: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="w-16 text-[10px] uppercase text-slate-500">{label}</span>
      <span className="h-2.5 w-32 overflow-hidden rounded bg-slate-800">
        <span className="block h-full rounded" style={{ width: `${Math.min(100, (value / max) * 100)}%`, backgroundColor: color }} />
      </span>
      <span className="w-8 text-right text-[10px] tabular-nums text-slate-400">{value}</span>
    </span>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

const T = (t: PokemonType) => <TypeBadge type={t} />;

export function TermVisual({ kind }: { kind: TermVisualKind }) {
  return <Frame>{render(kind)}</Frame>;
}

function render(kind: TermVisualKind): React.ReactNode {
  switch (kind) {
    case "ohko":
      return (
        <Row>
          <Mon species="Garchomp" />
          <Arrow label="Earthquake" />
          <div className="space-y-1">
            <HpBar pct={100} label="100%" />
            <HpBar pct={0} label="fainted" />
          </div>
          <Chip tone="neg">1 hit = KO</Chip>
        </Row>
      );
    case "2hko":
      return (
        <div className="space-y-1">
          <Row>
            <span className="text-[10px] uppercase text-slate-500">Hit 1</span>
            <HpBar pct={100} label="100%" />
            <Arrow />
            <HpBar pct={45} label="45%" />
          </Row>
          <Row>
            <span className="text-[10px] uppercase text-slate-500">Hit 2</span>
            <HpBar pct={45} label="45%" />
            <Arrow />
            <HpBar pct={0} label="KO" />
          </Row>
        </div>
      );
    case "stab":
      return (
        <div className="space-y-2">
          <Row>
            <Mon species="Charizard" />
            {T("fire")}
            <span className="text-[11px] text-slate-400">is a Fire-type</span>
          </Row>
          <Row>
            <Chip>Flamethrower {T("fire")}</Chip>
            <Chip tone="pos">×1.5 STAB</Chip>
            <span className="text-slate-600">·</span>
            <Chip>Air Slash {T("flying")}</Chip>
            <Chip tone="pos">×1.5 STAB</Chip>
          </Row>
          <Row>
            <Chip>Earthquake {T("ground")}</Chip>
            <Chip tone="neg">no STAB (×1.0)</Chip>
          </Row>
        </div>
      );
    case "ev":
      return (
        <div className="space-y-1">
          <StatBar label="Speed" value={252} max={252} color="#f59e0b" />
          <StatBar label="Attack" value={252} max={252} color="#f59e0b" />
          <StatBar label="HP" value={4} max={252} color="#64748b" />
          <p className="pt-1 text-[10px] text-slate-500">508 total EVs · max 252 per stat</p>
        </div>
      );
    case "iv":
      return (
        <div className="space-y-1">
          <Row><StatBar label="Sp. Atk" value={31} max={31} color="#22c55e" /><Chip tone="pos">31 (perfect)</Chip></Row>
          <Row><StatBar label="Attack" value={0} max={31} color="#ef4444" /><Chip tone="neg">0 (min - dodges Foul Play)</Chip></Row>
        </div>
      );
    case "nature":
      return (
        <Row>
          <Chip tone="acc">Adamant</Chip>
          <Chip tone="pos">+10% Attack</Chip>
          <Chip tone="neg">−10% Sp. Atk</Chip>
          <span className="text-[10px] text-slate-500">(never affects HP)</span>
        </Row>
      );
    case "spread-move":
      return (
        <Row>
          <Mon species="Torkoal" label="user" />
          <Arrow label="Heat Wave" />
          <div className="flex gap-2">
            <Mon species="Amoonguss" label="foe" />
            <Mon species="Incineroar" label="foe" />
          </div>
          <Chip tone="neg">×0.75 each (hits both)</Chip>
        </Row>
      );
    case "speed-tier":
      return (
        <div className="space-y-1">
          <Row><Mon species="Dragapult" /><StatBar label="Speed" value={213} color="#22c55e" /><Chip tone="pos">moves first</Chip></Row>
          <Row><Mon species="Garchomp" /><StatBar label="Speed" value={169} color="#f59e0b" /><Chip>moves second</Chip></Row>
        </div>
      );
    case "speed-control":
      return (
        <div className="space-y-1">
          <Row><Chip tone="acc">Tailwind</Chip><span className="text-[11px] text-slate-400">your team&rsquo;s Speed ×2 for 4 turns</span></Row>
          <Row><Chip tone="acc">Trick Room</Chip><span className="text-[11px] text-slate-400">slowest moves first for 5 turns</span></Row>
          <Row><Chip tone="acc">Icy Wind</Chip><span className="text-[11px] text-slate-400">lowers both foes&rsquo; Speed</span></Row>
        </div>
      );
    case "priority":
      return (
        <div className="space-y-1">
          <Row><span className="w-16 text-[10px] uppercase text-slate-500">First</span><Mon species="Incineroar" /><Chip tone="acc">Fake Out (+3 priority)</Chip></Row>
          <Row><span className="w-16 text-[10px] uppercase text-slate-500">Then</span><Mon species="Dragapult" /><Chip>normal move (faster, but +0)</Chip></Row>
        </div>
      );
    case "redirection":
      return (
        <Row>
          <div className="flex flex-col gap-1">
            <Mon species="Flutter Mane" label="foe" />
            <Mon species="Chi-Yu" label="foe" />
          </div>
          <Arrow label="both attacks" />
          <Mon species="Amoonguss" label="Rage Powder" />
          <Chip tone="pos">partner is safe to set up</Chip>
        </Row>
      );
    case "pivot":
      return (
        <Row>
          <Mon species="Rillaboom" label="in" />
          <Arrow label="U-turn" />
          <Mon species="Landorus" label="switches in" />
          <Chip tone="pos">damage + keep momentum</Chip>
        </Row>
      );
    case "bulk":
      return (
        <div className="space-y-1">
          <StatBar label="HP" value={100} color="#22c55e" />
          <StatBar label="Defense" value={125} color="#38bdf8" />
          <StatBar label="Sp. Def" value={110} color="#a78bfa" />
          <p className="pt-1 text-[10px] text-slate-500">Effective bulk ≈ HP × defense - survives hits a frail mon would not.</p>
        </div>
      );
    case "sweeper":
      return (
        <div className="space-y-1">
          <Row><Mon species="Dragonite" /><Chip tone="acc">Dragon Dance (+1 Atk, +1 Spe)</Chip></Row>
          <Row>
            <Chip tone="neg">KO</Chip><Chip tone="neg">KO</Chip><Chip tone="neg">KO</Chip>
            <span className="text-[11px] text-slate-400">out-speeds and cleans the team</span>
          </Row>
        </div>
      );
    case "wallbreaker":
      return (
        <Row>
          <Mon species="Kingambit" label="Choice Band" />
          <Arrow label="huge hit" />
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500">defensive wall</span>
            <HpBar pct={100} label="100%" />
            <HpBar pct={15} label="15%" />
          </div>
          <Chip tone="acc">breaks the wall open</Chip>
        </Row>
      );
    case "setup":
      return (
        <Row>
          <Mon species="Kingambit" />
          <Arrow label="Swords Dance" />
          <div className="space-y-1">
            <StatBar label="Attack" value={135} color="#64748b" />
            <StatBar label="Attack" value={255} max={255} color="#f59e0b" />
          </div>
          <Chip tone="pos">+2 Attack</Chip>
        </Row>
      );
    case "hazards":
      return (
        <Row>
          <Chip tone="neg">Stealth Rock set</Chip>
          <Arrow label="switch in" />
          <Mon species="Charizard" />
          <HpBar pct={100} label="100%" />
          <Arrow />
          <HpBar pct={75} label="−25%" />
        </Row>
      );
    case "tera":
      return (
        <Row>
          <Mon species="Garchomp" />
          <span className="flex gap-1">{T("dragon")}{T("ground")}</span>
          <Arrow label="Terastallize" />
          <span className="flex gap-1">{T("steel")}</span>
          <Chip tone="acc">new typing + boosted STAB</Chip>
        </Row>
      );
    case "lead":
      return (
        <Row>
          <span className="text-[10px] uppercase text-slate-500">Your lead</span>
          <Mon species="Incineroar" />
          <Mon species="Flutter Mane" />
          <span className="text-[11px] text-slate-400">the first two you send out</span>
        </Row>
      );
    case "team-preview":
      return (
        <div className="space-y-2">
          <div>
            <span className="text-[10px] uppercase text-slate-500">Your 6</span>
            <div className="flex flex-wrap gap-1">
              {["Incineroar", "Flutter Mane", "Rillaboom", "Landorus", "Amoonguss", "Chi-Yu"].map((s) => (
                <span key={s} className="inline-flex h-7 w-7 items-center justify-center overflow-hidden opacity-80"><PokeIcon species={s} /></span>
              ))}
            </div>
          </div>
          <Row>
            <Arrow label="bring 4" />
            <div className="flex gap-1">
              {["Incineroar", "Flutter Mane", "Rillaboom", "Landorus"].map((s) => (
                <span key={s} className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded ring-1 ring-amber-500/60"><PokeIcon species={s} /></span>
              ))}
            </div>
          </Row>
        </div>
      );
    case "wincon":
      return (
        <Row>
          <Mon species="Dragonite" label="+2 sweeper" />
          <Chip tone="acc">★ win condition</Chip>
          <span className="text-[11px] text-slate-400">its checks are gone → it closes the game</span>
        </Row>
      );
  }
}
