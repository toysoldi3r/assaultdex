import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel, TypeBadge } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import { MoveLearners } from "@/components/database/MoveLearners";
import { getMoveDetail, moveLearners } from "@/data/pokedexSource";
import type { MoveCategory } from "@/components/teams/moveTypes";

export const dynamic = "force-dynamic";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Human interaction notes derived from a move's flags + properties. */
function interactions(d: NonNullable<ReturnType<typeof getMoveDetail>>): string[] {
  const f = new Set(d.flags);
  const out: string[] = [];
  if (f.has("contact")) out.push("Makes contact (Rough Skin, Rocky Helmet, Tough Claws, …)");
  if (f.has("protect")) out.push("Blocked by Protect / Detect");
  if (f.has("reflectable")) out.push("Bounced by Magic Coat / Magic Bounce");
  if (f.has("snatch")) out.push("Stolen by Snatch");
  if (f.has("mirror")) out.push("Copied by Mirror Move");
  if (f.has("sound")) out.push("Sound move (hits through Substitute; Soundproof is immune)");
  if (f.has("punch")) out.push("Punching move (Iron Fist)");
  if (f.has("bite")) out.push("Biting move (Strong Jaw)");
  if (f.has("pulse")) out.push("Pulse/aura move (Mega Launcher)");
  if (f.has("slicing")) out.push("Slicing move (Sharpness)");
  if (f.has("bullet")) out.push("Ball/bomb move (Bulletproof is immune)");
  if (f.has("powder")) out.push("Powder move (Grass types, Overcoat, Safety Goggles immune)");
  if (f.has("dance")) out.push("Dance move (Dancer copies it)");
  if (d.drain) out.push("Draining move — recovery boosted by Big Root");
  if (d.category !== "status") out.push("Boosted by Life Orb (×1.3)");
  if (d.category !== "status" && !d.flinchAlready) out.push("Can flinch via King's Rock / Razor Fang (10%)");
  return out;
}

// 6-cell battlefield: top row three foes, bottom row ally · self · ally. The
// cells a move can reach are highlighted from its @pkmn target id.
type Cell = "foeL" | "foeC" | "foeR" | "allyL" | "self" | "allyR";
const FOES: Cell[] = ["foeL", "foeC", "foeR"];
const ALLIES: Cell[] = ["allyL", "allyR"];

function affectedCells(target: string): Set<Cell> {
  switch (target) {
    case "self":
      return new Set<Cell>(["self"]);
    case "adjacentAlly":
      return new Set<Cell>(ALLIES);
    case "adjacentAllyOrSelf":
      return new Set<Cell>([...ALLIES, "self"]);
    case "allySide":
      return new Set<Cell>([...ALLIES, "self"]);
    case "allAdjacentFoes":
    case "foeSide":
      return new Set<Cell>(FOES);
    case "allAdjacent":
      return new Set<Cell>([...FOES, ...ALLIES]);
    case "all":
      return new Set<Cell>([...FOES, ...ALLIES, "self"]);
    default:
      // normal / any / adjacentFoe / randomNormal / scripted → a single foe.
      return new Set<Cell>(FOES);
  }
}

const CELL_LABEL: Record<Cell, string> = {
  foeL: "Foe", foeC: "Foe", foeR: "Foe", allyL: "Ally", self: "Self", allyR: "Ally",
};

function RangeGrid({ target }: { target: string }) {
  const hit = affectedCells(target);
  const cell = (c: Cell) => {
    const on = hit.has(c);
    return (
      <div
        key={c}
        className={`grid h-12 place-items-center rounded text-[10px] font-semibold uppercase tracking-wide ${
          on
            ? c === "self" || c === "allyL" || c === "allyR"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
            : "bg-slate-800 text-slate-500"
        }`}
      >
        {CELL_LABEL[c]}
      </div>
    );
  };
  return (
    <div className="max-w-xs space-y-1">
      <div className="grid grid-cols-3 gap-1">{FOES.map(cell)}</div>
      <div className="grid grid-cols-3 gap-1">{cell("allyL")}{cell("self")}{cell("allyR")}</div>
      <p className="text-[10px] uppercase tracking-wide text-slate-600">
        Top row: opposing side · bottom row: your allies and self. Highlighted cells are what this move can hit.
      </p>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const d = getMoveDetail(decodeURIComponent(name));
  return d
    ? { title: d.name, description: `${d.name} - ${d.type ?? ""} ${d.category} move. Power, accuracy, range, interactions and which Pokémon learn it.` }
    : { title: "Move", description: "Move reference for Pokémon Champions." };
}

export default async function MovePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const d = getMoveDetail(decodeURIComponent(name));
  if (!d) notFound();
  const learners = await moveLearners(d.name);
  const notes = interactions(d);

  const stat = (label: string, value: string) => (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Link href="/database?tab=moves" className="text-sm text-amber-400 hover:underline">← Moves</Link>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">{d.name}</h1>
        {d.type && <TypeBadge type={d.type} />}
        <span className="flex items-center gap-1 text-sm text-slate-400">
          <CategoryIcon category={d.category as MoveCategory} /> {cap(d.category)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {stat("Type", d.type ? cap(d.type) : "-")}
        {stat("Category", cap(d.category))}
        {stat("Power", d.power == null ? "-" : String(d.power))}
        {stat("Accuracy", d.accuracy == null ? "—" : `${d.accuracy}%`)}
        {stat("PP", d.pp == null ? "-" : String(d.pp))}
        {stat("Priority", d.priority > 0 ? `+${d.priority}` : String(d.priority))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Range">
          <RangeGrid target={d.target} />
        </Panel>
        <Panel title="Special interactions">
          {notes.length === 0 ? (
            <p className="text-sm text-slate-500">No notable flag interactions.</p>
          ) : (
            <ul className="space-y-1 text-sm text-slate-300">
              {notes.map((n) => (
                <li key={n} className="flex gap-2"><span className="text-amber-400">•</span>{n}</li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Description & changes by generation">
        {d.descByGen.length === 0 ? (
          <p className="text-sm text-slate-500">No description on record.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {d.descByGen.map((g, i) => {
              const until = d.descByGen[i + 1] ? d.descByGen[i + 1]!.genFrom - 1 : 9;
              const range = until > g.genFrom ? `Gen ${g.genFrom}–${until}` : `Gen ${g.genFrom}`;
              return (
                <li key={g.genFrom} className="flex gap-3">
                  <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-slate-500">{range}</span>
                  <span className="text-slate-300">{g.desc}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Pokémon that learn it">
        <MoveLearners learners={learners} />
        <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-600">
          Learnsets from @pkmn/dex (Gen 9). Provisional for Champions.
        </p>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Usage / pick rate">
          <p className="text-sm text-slate-500">
            — no per-move usage snapshot is loaded. Needs a reachable usage source
            (see the teambuilder note); nothing is fabricated.
          </p>
        </Panel>
        <Panel title="Names in other languages">
          <p className="text-sm text-slate-500">
            — foreign-language move names come from PokéAPI, which isn&rsquo;t
            reachable in this environment yet.
          </p>
        </Panel>
      </div>
    </div>
  );
}
