/* eslint-disable react/no-unescaped-entities */
// Prose content file: straight apostrophes/quotes in lesson text are fine.
import Link from "next/link";
import type { ReactNode } from "react";

// Guide content lives here as data so the Guide UI (sidebar, lesson pane,
// prev/next, progress) stays generic. Each lesson is one focused card; a
// mechanic is explained in its primary lesson and referenced elsewhere.

export interface Lesson {
  id: string;
  title: string;
  /** One-line summary for the overview grid + sidebar tooltip. */
  summary: string;
  /** Beginner by default; "advanced" tags optimisation / edge-case lessons. */
  level?: "advanced";
  body: ReactNode;
}
export interface GuideSection {
  id: string;
  title: string;
  blurb: string;
  lessons: Lesson[];
}

// --- Small presentational helpers (match the slate/amber design system) -----

function Term({ children }: { children: ReactNode }) {
  return <strong className="text-slate-100">{children}</strong>;
}

// Collapsed "Advanced" aside for optimisation / edge cases, so beginners aren't
// overloaded but the detail is one click away.
function Adv({ label = "Advanced", children }: { label?: string; children: ReactNode }) {
  return (
    <details className="mt-3 rounded border border-slate-800 bg-slate-950/60 p-2 text-sm">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-amber-400">{label}</summary>
      <div className="mt-2 space-y-2 text-slate-300">{children}</div>
    </details>
  );
}

// Concrete battle example callout.
function Ex({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 rounded border-l-2 border-amber-500/60 bg-slate-950/40 px-3 py-2 text-sm text-slate-300">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-amber-400">Example</span>
      {children}
    </div>
  );
}

function KTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="mt-3 overflow-x-auto rounded border border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-900/60 text-[10px] uppercase text-slate-500">
          <tr>{head.map((h) => <th key={h} className="px-3 py-2 font-normal">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-800/60 align-top">
              {r.map((c, j) => <td key={j} className="px-3 py-2 text-slate-300">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const P = ({ children }: { children: ReactNode }) => <p className="text-slate-300">{children}</p>;
const UL = ({ children }: { children: ReactNode }) => <ul className="list-disc space-y-1 pl-5 text-slate-300">{children}</ul>;
const A = ({ href, children }: { href: string; children: ReactNode }) => <Link href={href} className="text-amber-400 hover:underline">{children}</Link>;

// ---------------------------------------------------------------------------

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "welcome",
    title: "Welcome to the Website",
    blurb: "What AssaultDex is, who this Guide is for, and how to use both.",
    lessons: [
      {
        id: "getting-started",
        title: "Getting Started",
        summary: "What the site is for, who the Guide is for, and where to begin.",
        body: (
          <div className="space-y-3">
            <P><Term>AssaultDex</Term> is a decision-support tool for the <Term>Pokémon Champions</Term> doubles format. It bundles the tools usually spread across many competitive sites — Pokédex, team builder, live battle helper, reference database, and metagame stats — into one place.</P>
            <P>This Guide teaches two things: how to use the website, then how competitive Pokémon battles actually work. It is written for players with <Term>no competitive experience</Term>. If you already play, skip to any lesson.</P>
            <P>The Guide is 6 sections, front to back:</P>
            <UL>
              <li><Term>Welcome</Term> — the site and the Guide (you are here).</li>
              <li><Term>Fundamentals</Term> — stats, typing, abilities and items.</li>
              <li><Term>Moves &amp; Turn Mechanics</Term> — damage, turn order, status.</li>
              <li><Term>The Battlefield</Term> — switching, field effects, protection.</li>
              <li><Term>Battle Strategy</Term> — prediction and win conditions.</li>
              <li><Term>Team Building</Term> — roles, cores, and building a team.</li>
            </UL>
            <P>No experience? Read in order. Lessons marked <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs font-semibold text-amber-300">Advanced</span> and collapsed <Term>Advanced</Term> notes are optimisation and edge cases — safe to skip on a first pass.</P>
          </div>
        ),
      },
      {
        id: "using-the-site",
        title: "Using the Website",
        summary: "Navigating the Guide and the site's main tools.",
        body: (
          <div className="space-y-3">
            <P>The Guide works like a course. Pick a lesson from the left (sections collapse to stay tidy). The bar at the top shows how far through you are — visited lessons are remembered in your browser.</P>
            <UL>
              <li><Term>Open a lesson</Term> by clicking it in the sidebar or the overview grid.</li>
              <li><Term>Previous / Next</Term> buttons at the bottom move through lessons in order.</li>
              <li><Term>Guide overview</Term> (top-left) returns to the section grid.</li>
              <li><Term>Advanced</Term> notes are collapsed boxes — click to expand.</li>
            </UL>
            <P>The rest of the site backs up the Guide:</P>
            <UL>
              <li><A href="/pokemon">Pokédex</A> — stats, matchups, movepools, common sets and items per Pokémon.</li>
              <li><A href="/teams">Teams</A> — build and save teams; get legality and analysis (weaknesses, speed, coverage).</li>
              <li><A href="/choicedex">ChoiceDex</A> — set up both teams and get the best play each turn.</li>
              <li><A href="/database">Database</A> — items, abilities, moves, and a damage calculator.</li>
              <li><A href="/types">Types</A> — full type chart and a move-vs-dual-type grid.</li>
              <li><A href="/database?tab=terms">Knowledgebase</A> — short explainers for individual terms.</li>
            </UL>
            <P>Sources for the underlying data are on the <A href="/sources">Sources</A> tab.</P>
          </div>
        ),
      },
    ],
  },
  {
    id: "fundamentals",
    title: "Pokémon Fundamentals",
    blurb: "The numbers and types every Pokémon is built from.",
    lessons: [
      {
        id: "stats",
        title: "Stats",
        summary: "The six stats, plus boosts, EVs, IVs and natures.",
        body: (
          <div className="space-y-3">
            <P>Every Pokémon has six <Term>stats</Term>:</P>
            <KTable head={["Stat", "Does"]} rows={[
              [<Term key="h">HP</Term>, "How much damage it survives."],
              [<Term key="a">Attack</Term>, "Power of physical moves."],
              [<Term key="d">Defense</Term>, "Reduces physical damage taken."],
              [<Term key="sa">Sp. Atk</Term>, "Power of special moves."],
              [<Term key="sd">Sp. Def</Term>, "Reduces special damage taken."],
              [<Term key="s">Speed</Term>, "Who moves first (see Turn Order)."],
            ]} />
            <P><Term>Base stats</Term> are the species' fixed starting numbers — a Pokédex value, same for every copy of that species. Everything below adjusts the final stat.</P>
            <P><Term>Stat boosts and drops</Term> happen in battle: moves and abilities raise or lower a stat in stages (e.g. Swords Dance +2 Attack, Intimidate −1 Attack). They reset when the Pokémon leaves the field.</P>
            <Adv>
              <P><Term>EVs</Term> (Effort Values) — up to 508 points you invest across stats (max 252 per stat) to customise a build; 4 EVs ≈ 1 stat point at level 50.</P>
              <P><Term>IVs</Term> (Individual Values) — 0–31 hidden per-stat bonus baked into each individual Pokémon.</P>
              <P><Term>Natures</Term> — raise one stat 10%, lower another 10% (e.g. Adamant: +Atk −Sp.Atk).</P>
              <P>Tune all three in <A href="/teams">Teams</A>; the <A href="/database?tab=terms">Knowledgebase</A> has fuller explainers.</P>
            </Adv>
          </div>
        ),
      },
      {
        id: "typing",
        title: "Typing",
        summary: "Weaknesses, resistances, immunities, dual types and STAB.",
        body: (
          <div className="space-y-3">
            <P>Each Pokémon and each damaging move has a <Term>type</Term>. The <Term>type chart</Term> sets how much damage a move does to a target:</P>
            <UL>
              <li><Term>Weakness</Term> — 2× damage (super effective).</li>
              <li><Term>Resistance</Term> — 0.5× damage (not very effective).</li>
              <li><Term>Immunity</Term> — 0× (no effect), e.g. Ground vs Flying.</li>
            </UL>
            <P><Term>Dual typing</Term> multiplies the two: a Pokémon with two types takes the product. That creates <Term>4× weaknesses</Term> (weak on both) and <Term>¼× resistances</Term> (resists on both).</P>
            <Ex>Charizard is Fire/Flying. Rock is super effective on both → <Term>4×</Term> from Stealth Rock and Rock moves.</Ex>
            <P><Term>STAB</Term> (Same-Type Attack Bonus): a move matching one of the user's types deals 1.5×. It is why Pokémon usually carry moves of their own type.</P>
            <P>Some types carry built-in <Term>properties</Term> beyond damage:</P>
            <UL>
              <li>Fire-types cannot be <Term>burned</Term>.</li>
              <li>Grass-types are immune to <Term>powder/spore</Term> moves (Spore, Sleep Powder).</li>
              <li>Ghost-types ignore <Term>trapping</Term> — they can always switch out.</li>
              <li>Dark-types are immune to opposing <Term>Prankster</Term>-boosted status moves.</li>
            </UL>
            <P>Explore it all on the <A href="/types">Types</A> page (chart + move-vs-dual-type grid).</P>
          </div>
        ),
      },
      {
        id: "abilities-items",
        title: "Abilities & Items",
        summary: "Passive powers and held items that shape every matchup.",
        body: (
          <div className="space-y-3">
            <P>An <Term>ability</Term> is a passive power every Pokémon has (one at a time). Rough families:</P>
            <UL>
              <li><Term>Passive</Term> — always on (Levitate: Ground immunity).</li>
              <li><Term>Entry</Term> — fires on switch-in (Intimidate: −1 foe Attack; Drizzle: sets rain).</li>
              <li><Term>Reactive</Term> — triggers on an event (Static: may paralyse on contact).</li>
              <li><Term>Immunity</Term> — cancels a type or effect (Flash Fire, Water Absorb, Magic Guard).</li>
            </UL>
            <P>A <Term>held item</Term> gives one Pokémon an extra effect. Common kinds:</P>
            <UL>
              <li><Term>Consumable</Term> — used once then gone (Sitrus Berry heals; Focus Sash survives one KO hit).</li>
              <li><Term>Choice</Term> items (Band/Specs/Scarf) — big boost but <Term>lock you into one move</Term> until you switch.</li>
              <li>Passive boosts — Leftovers (heal), Life Orb (more power, small recoil).</li>
            </UL>
            <P><Term>Item removal</Term> (Knock Off, Trick) and <Term>suppression</Term> (Magic Room, or abilities like Klutz) turn those effects off — worth predicting. Browse them in the <A href="/database">Database</A>.</P>
          </div>
        ),
      },
    ],
  },
  {
    id: "moves",
    title: "Moves & Turn Mechanics",
    blurb: "How moves deal damage, who goes first, and status effects.",
    lessons: [
      {
        id: "moves-damage",
        title: "Moves & Damage",
        summary: "Physical/special/status, power, accuracy, PP, crits and rolls.",
        body: (
          <div className="space-y-3">
            <P>Moves come in three classes:</P>
            <UL>
              <li><Term>Physical</Term> — use Attack vs the target's Defense.</li>
              <li><Term>Special</Term> — use Sp. Atk vs Sp. Def.</li>
              <li><Term>Status</Term> — deal no damage; set conditions, boosts or field effects.</li>
            </UL>
            <P>Each damaging move has a <Term>type</Term>, <Term>base power</Term> (raw strength), <Term>accuracy</Term> (hit chance), and <Term>PP</Term> (uses before it runs out). Damage then scales by <Term>STAB</Term> and <Term>type effectiveness</Term> (see Typing).</P>
            <UL>
              <li><Term>Contact</Term> moves can trigger the target's on-contact effects (Static, Rocky Helmet).</li>
              <li><Term>Spread</Term> moves hit both foes but deal 0.75× when they hit more than one (see Protection &amp; Targeting).</li>
              <li><Term>Secondary effects</Term> — a chance to burn, flinch, lower a stat, etc.</li>
              <li><Term>Critical hits</Term> — ~1/24 chance for 1.5× damage, ignoring the target's defensive boosts.</li>
              <li><Term>Damage rolls</Term> — every hit rolls 85–100% of its value, so damage is a range, not a fixed number.</li>
            </UL>
            <Adv label="Advanced — variable-power moves">
              <P>Some moves' power depends on other values, so check before relying on them:</P>
              <UL>
                <li><Term>Heavy Slam / Heat Crash</Term> — stronger the heavier you are vs the target.</li>
                <li><Term>Gyro Ball</Term> — stronger the <em>slower</em> you are than the target.</li>
                <li><Term>Electro Ball</Term> — stronger the <em>faster</em> you are than the target.</li>
              </UL>
              <P>The <A href="/database">Database</A> calculator shows exact numbers.</P>
            </Adv>
          </div>
        ),
      },
      {
        id: "turn-order",
        title: "Turn Order",
        summary: "Speed, priority brackets, Trick Room and Tailwind.",
        body: (
          <div className="space-y-3">
            <P>Within a turn, moves resolve by <Term>priority bracket</Term> first, then by <Term>Speed</Term> inside the bracket.</P>
            <P><Term>Priority</Term> is a move property from −7 to +5. Higher goes first regardless of Speed:</P>
            <UL>
              <li><Term>Positive priority</Term> — Fake Out (+3), Extreme Speed (+2), Quick Attack (+1) strike early.</li>
              <li><Term>Negative priority</Term> — Trick Room (−7), Teleport (−6) resolve last.</li>
            </UL>
            <P>Inside the same bracket, <Term>higher Speed moves first</Term>. Equal Speed is a <Term>speed tie</Term> — resolved randomly.</P>
            <P>Speed is swung by many tools:</P>
            <UL>
              <li><Term>Tailwind</Term> — doubles your side's Speed for 4 turns.</li>
              <li><Term>Trick Room</Term> — for 5 turns, <Term>slower</Term> Pokémon move first (inverts Speed within each bracket).</li>
              <li><Term>Choice Scarf</Term> — 1.5× Speed, at the cost of move-locking.</li>
              <li><Term>Paralysis</Term> — halves Speed (see Status). Icy Wind / Thunder Wave drop the foe's Speed.</li>
              <li>Priority-changing abilities — <Term>Prankster</Term> (+1 to status moves), <Term>Gale Wings</Term>, <Term>Triage</Term>.</li>
            </UL>
            <P>Moving first in a fast, high-damage format often wins the game — this is called <Term>speed control</Term>.</P>
          </div>
        ),
      },
      {
        id: "status",
        title: "Status",
        summary: "Major conditions, volatile effects, and how to prevent them.",
        body: (
          <div className="space-y-3">
            <P><Term>Major status</Term> — one at a time, persists until cured:</P>
            <KTable head={["Status", "Effect"]} rows={[
              [<Term key="b">Burn</Term>, "Chip damage each turn; halves physical Attack."],
              [<Term key="p">Paralysis</Term>, "Halves Speed; 25% chance to not move."],
              [<Term key="ps">Poison</Term>, "Chip damage each turn (fixed)."],
              [<Term key="tox">Badly poisoned</Term>, "Chip damage that grows each turn."],
              [<Term key="sl">Sleep</Term>, "Can't move for a few turns."],
              [<Term key="fr">Freeze</Term>, "Can't move until thawed (rare, random thaw)."],
            ]} />
            <P><Term>Volatile / battle conditions</Term> — temporary, usually clear on switch:</P>
            <UL>
              <li><Term>Confusion</Term> — may hit itself. <Term>Flinch</Term> — skip this turn (only if hit before it acts).</li>
              <li><Term>Taunt</Term> — can only use damaging moves. <Term>Encore</Term> — locked into its last move.</li>
              <li><Term>Disable</Term> — one move blocked. <Term>Infatuation</Term> — may fail to act.</li>
              <li><Term>Leech Seed</Term> — drains HP each turn to the seeder.</li>
            </UL>
            <P><Term>Prevention &amp; removal</Term>: type immunities (Fire/burn, Electric/paralysis), abilities (Limber, Water/Vital Spirit), Lum/Cheri Berries, and <Term>Safeguard</Term> — a screen that blocks major status on your side for 5 turns.</P>
          </div>
        ),
      },
    ],
  },
  {
    id: "battlefield",
    title: "The Battlefield",
    blurb: "Switching, field-wide effects, and protection.",
    lessons: [
      {
        id: "switching",
        title: "Switching",
        summary: "Pivoting, momentum, and trapping.",
        body: (
          <div className="space-y-3">
            <P><Term>Switching</Term> swaps an active Pokémon for one on the bench (it costs your action for that Pokémon that turn).</P>
            <UL>
              <li><Term>Defensive switch</Term> — bring in a Pokémon that resists the incoming move (a <Term>safe switch</Term>).</li>
              <li><Term>Offensive switch</Term> — bring in a threat as the foe is forced to react.</li>
            </UL>
            <P><Term>Pivoting</Term> — attack <em>and</em> switch in one move, keeping <Term>momentum</Term>:</P>
            <UL>
              <li><Term>U-turn</Term> (Bug), <Term>Volt Switch</Term> (Electric), <Term>Flip Turn</Term> (Water) — deal damage, then swap.</li>
              <li><Term>Parting Shot</Term> — lower the foe's Attack &amp; Sp. Atk, then swap.</li>
              <li><Term>Intimidate cycling</Term> — repeatedly switch Intimidate users to keep dropping foe Attack.</li>
              <li><Term>Regenerator</Term> — heals 1/3 HP on switch out, making pivots nearly free.</li>
            </UL>
            <P><Term>Trapping</Term> (Arena Trap, Shadow Tag, Mean Look) stops the foe switching. <Term>Switching prevention</Term> is countered by Ghost-types (immune) and Shed Shell.</P>
          </div>
        ),
      },
      {
        id: "field-hazards",
        title: "Field Effects & Hazards",
        summary: "Entry hazards, weather, terrain, and screens.",
        body: (
          <div className="space-y-3">
            <P><Term>Entry hazards</Term> sit on a side and hurt Pokémon as they switch in:</P>
            <UL>
              <li><Term>Stealth Rock</Term> — Rock-type chip on entry (hits 4× weak mons hard).</li>
              <li><Term>Spikes</Term> — damage grounded switch-ins (stacks up to 3 layers).</li>
              <li><Term>Toxic Spikes</Term> — poison grounded switch-ins.</li>
              <li><Term>Sticky Web</Term> — lowers Speed of grounded switch-ins.</li>
            </UL>
            <P><Term>Removal</Term>: Rapid Spin, Defog, or Court Change. <Term>Immunity</Term>: Flying-types and Levitate dodge grounded hazards; Toxic Spikes are absorbed by grounded Poison-types.</P>
            <P><Term>Weather</Term> (5 turns): <Term>Rain</Term> boosts Water / weakens Fire, <Term>Sun</Term> the reverse, <Term>Sand</Term> chips non-Rock/Ground/Steel and boosts Rock Sp.Def, <Term>Snow</Term> boosts Ice Defense.</P>
            <P><Term>Terrain</Term> (grounded Pokémon only, 5 turns): <Term>Electric</Term> (blocks sleep, boosts Electric), <Term>Grassy</Term> (heals, boosts Grass), <Term>Psychic</Term> (blocks priority, boosts Psychic), <Term>Misty</Term> (blocks status, weakens Dragon).</P>
            <P><Term>Screens</Term> &amp; others: <Term>Reflect</Term> (halves physical), <Term>Light Screen</Term> (halves special), <Term>Aurora Veil</Term> (both, needs snow); <Term>Gravity</Term>, <Term>Magic Room</Term>, <Term>Wonder Room</Term>, and Pledge combo effects bend the rules situationally.</P>
            <Adv label="Note — speed-control field effects">
              <P><Term>Trick Room</Term> and <Term>Tailwind</Term> are field effects too, but they change turn order — covered in <A href="/guide?lesson=turn-order">Turn Order</A>.</P>
            </Adv>
          </div>
        ),
      },
      {
        id: "protection-targeting",
        title: "Protection & Targeting",
        summary: "Protect variants and choosing targets — key in doubles.",
        level: "advanced",
        body: (
          <div className="space-y-3">
            <P><Term>Protect</Term> / <Term>Detect</Term> block all moves against the user for a turn — a core doubles tool to stall, dodge a double-up, or wait out a threat.</P>
            <UL>
              <li>Variants add an effect on contact: <Term>King's Shield</Term> (−Attack), <Term>Spiky Shield</Term> (chip), <Term>Baneful Bunker</Term> (poison), <Term>Burning Bulwark</Term> (burn).</li>
              <li><Term>Consecutive use</Term> gets less reliable — each Protect in a row has a lower success chance, so you can't spam it.</li>
              <li><Term>Wide Guard</Term> blocks spread moves; <Term>Quick Guard</Term> blocks priority — for the whole side.</li>
            </UL>
            <P><Term>Targeting</Term> matters because doubles has two foes:</P>
            <UL>
              <li>Single-target moves pick one of up to three others; <Term>spread</Term> moves hit both foes at 0.75×.</li>
              <li><Term>Double targeting</Term> — focus both attacks on one Pokémon to secure a KO.</li>
              <li><Term>Follow Me / Rage Powder</Term> — redirect the foes' single-target moves onto the user, protecting a partner.</li>
              <li><Term>Helping Hand</Term> — boosts the partner's move 1.5× this turn (an ally-targeting move).</li>
            </UL>
            <P>These mechanics are what make doubles a game of <Term>two Pokémon acting together</Term>, not two solo battles.</P>
          </div>
        ),
      },
    ],
  },
  {
    id: "strategy",
    title: "Battle Strategy",
    blurb: "Making good decisions with limited information.",
    lessons: [
      {
        id: "positioning-prediction",
        title: "Positioning & Prediction",
        summary: "Momentum, reads, and risk vs reward.",
        body: (
          <div className="space-y-3">
            <P>Good play is mostly about <Term>positioning</Term> — creating favourable matchups and keeping <Term>momentum</Term> (forcing the foe to react to you).</P>
            <UL>
              <li><Term>Safe play</Term> — a move that's fine whatever the foe does (a resisted attack, Protect on a threatened mon).</li>
              <li><Term>Prediction</Term> — reading the foe's <Term>attack</Term> or <Term>switch</Term> and acting on it (e.g. attack the switch-in, not the mon leaving).</li>
              <li><Term>Double switch</Term> — both players swap the same turn; a read here can flip the matchup.</li>
              <li><Term>Protect prediction</Term> — expecting a Protect and setting up instead of wasting an attack on it.</li>
            </UL>
            <P>Every read is <Term>risk vs reward</Term>. Sometimes <Term>sacrificing</Term> a Pokémon to bring in your win condition safely is correct. But don't over-predict: when a <Term>safe play</Term> keeps you ahead, take it. Prediction is a tool, not a habit.</P>
          </div>
        ),
      },
      {
        id: "info-win-conditions",
        title: "Information & Win Conditions",
        summary: "Reading the battle and planning your endgame.",
        body: (
          <div className="space-y-3">
            <P>Each turn reveals <Term>information</Term>: the foe's <Term>moves</Term>, <Term>items</Term>, <Term>abilities</Term>, <Term>speed order</Term>, <Term>damage dealt</Term>, and from all of it, their <Term>likely set</Term>. Track it — it turns guesses into reads.</P>
            <P>A <Term>win condition</Term> is the Pokémon or plan that will actually win you the game (e.g. "my Dragonite sweeps once their Steel is gone").</P>
            <UL>
              <li>Identify <Term>your</Term> win condition — and <Term>preserve</Term> it; don't throw it away early.</li>
              <li>Identify the <Term>opponent's</Term> — and remove its <Term>counters</Term> from their side.</li>
              <li>Plan an <Term>endgame</Term>: which of your Pokémon are <Term>expendable</Term> to get there.</li>
            </UL>
            <P><Term>Team preview</Term> (before the game) starts this: spot the foe's major <Term>threats</Term>, guess their <Term>strategy</Term>, choose your <Term>leads</Term>, and plan around their likely win condition. Picking the right 4 and lead is often half the game.</P>
          </div>
        ),
      },
    ],
  },
  {
    id: "team-building",
    title: "Team Building",
    blurb: "Roles, synergy, archetypes, and a build process.",
    lessons: [
      {
        id: "roles-synergy",
        title: "Roles & Synergy",
        summary: "What each Pokémon does and how they fit together.",
        body: (
          <div className="space-y-3">
            <P>Every team slot fills a <Term>role</Term>:</P>
            <KTable head={["Role", "Job"]} rows={[
              [<Term key="1">Sweeper</Term>, "Fast attacker that snowballs once set up."],
              [<Term key="2">Wallbreaker</Term>, "Hits so hard it breaks defensive mons."],
              [<Term key="3">Cleaner</Term>, "Finishes a weakened team late-game."],
              [<Term key="4">Wall / Tank</Term>, "Absorbs hits; walls are pure defense, tanks hit back."],
              [<Term key="5">Support / Pivot</Term>, "Redirection, screens, speed control; pivots keep momentum."],
              [<Term key="6">Lead</Term>, "Sets the tone turn one (hazards, Tailwind, Fake Out)."],
              [<Term key="7">Revenge killer</Term>, "Fast/priority answer to a threat that's swept."],
              [<Term key="8">Hazard setter / remover</Term>, "Places or clears entry hazards."],
              [<Term key="9">Speed control</Term>, "Tailwind / Trick Room / Icy Wind users."],
            ]} />
            <P><Term>Synergy</Term> is roles reinforcing each other:</P>
            <UL>
              <li><Term>Defensive</Term> — teammates cover each other's weaknesses (one resists what the other fears).</li>
              <li><Term>Offensive</Term> — attackers that break each other's checks (wallbreaker opens the sweep).</li>
              <li><Term>Type &amp; ability synergy</Term> — e.g. a Water sponge for your Fire mon; Drizzle feeding a Swift Swim sweeper.</li>
              <li><Term>Role compression</Term> — one Pokémon doing two jobs (attacker + speed control) frees a slot.</li>
            </UL>
            <P>The <A href="/teams">Teams</A> analysis panel flags shared weaknesses, coverage gaps, and speed for you.</P>
          </div>
        ),
      },
      {
        id: "cores-modes-archetypes",
        title: "Cores, Modes & Archetypes",
        summary: "Building blocks, plan B, and team styles.",
        body: (
          <div className="space-y-3">
            <P>A <Term>core</Term> is a small group (usually 2–3) built to work together:</P>
            <UL>
              <li><Term>Offensive core</Term> — mons that break each other's checks.</li>
              <li><Term>Defensive core</Term> — mons that cover each other defensively.</li>
              <li>Classic <Term>Fire / Water / Grass</Term> — the three resist each other in a ring.</li>
            </UL>
            <P><Term>Modes</Term> are different game plans inside one team — a <Term>fast mode</Term> (Tailwind), a <Term>Trick Room mode</Term>, a <Term>weather mode</Term>, or <Term>alternative leads</Term> — so you adapt at team preview instead of being one-dimensional.</P>
            <P>Common <Term>archetypes</Term>:</P>
            <UL>
              <li><Term>Balance</Term> — mix of offense and defense (the default).</li>
              <li><Term>Hyper offense</Term> — all-out attackers + speed control. <Term>Bulky offense</Term> — tankier attackers.</li>
              <li><Term>Stall</Term> — win by chip and walls (rare in short doubles games).</li>
              <li><Term>Weather</Term> (Rain / Sun / Sand / Snow) and <Term>Trick Room</Term> — built around one field effect.</li>
            </UL>
            <P>See real examples in the <A href="/">metagame</A> cores and top teams.</P>
          </div>
        ),
      },
      {
        id: "building-a-team",
        title: "Building a Team",
        summary: "A step-by-step process tying it all together.",
        body: (
          <div className="space-y-3">
            <P>Put the whole Guide to work. A practical order:</P>
            <ol className="list-decimal space-y-1 pl-5 text-slate-300">
              <li>Pick a starting <Term>Pokémon, core, or strategy</Term> you want to build around.</li>
              <li>List what it <Term>struggles against</Term>.</li>
              <li>Add Pokémon that <Term>cover those weaknesses</Term>.</li>
              <li>Establish <Term>offensive pressure</Term> (a wallbreaker / sweeper).</li>
              <li>Add <Term>defensive answers</Term> to common threats.</li>
              <li>Add <Term>speed control</Term> (Tailwind / Trick Room / Icy Wind).</li>
              <li>Add <Term>utility</Term> — redirection, Fake Out, screens.</li>
              <li>Add <Term>hazard control</Term> where relevant.</li>
              <li>Check <Term>type weaknesses &amp; resistances</Term> across all six.</li>
              <li>Check each Pokémon has a <Term>useful role</Term> (no dead slots).</li>
              <li>Identify the team's <Term>win conditions</Term>.</li>
              <li>Identify <Term>alternative modes</Term> for team preview.</li>
              <li><Term>Test</Term> it in real games.</li>
              <li><Term>Adjust</Term> moves, items, EVs and members from what you learn.</li>
            </ol>
            <P>Do steps 1–12 in <A href="/teams">Teams</A> (it checks legality, weaknesses and speed as you go), then test plays in <A href="/choicedex">ChoiceDex</A>.</P>
          </div>
        ),
      },
    ],
  },
];

// Flattened lesson order for prev/next + progress.
export const FLAT_LESSONS = GUIDE_SECTIONS.flatMap((s) =>
  s.lessons.map((l) => ({ ...l, sectionId: s.id, sectionTitle: s.title })),
);
export const TOTAL_LESSONS = FLAT_LESSONS.length;
