// Competitive terminology: each term has its own explainer page (short
// definition + longer body + a small visual keyed by `visual`). Pure data so
// the /database/terminology pages render generically.

export type TermVisualKind =
  | "ohko"
  | "2hko"
  | "stab"
  | "ev"
  | "iv"
  | "nature"
  | "spread-move"
  | "speed-tier"
  | "speed-control"
  | "priority"
  | "redirection"
  | "pivot"
  | "bulk"
  | "sweeper"
  | "wallbreaker"
  | "setup"
  | "hazards"
  | "tera"
  | "lead"
  | "team-preview"
  | "wincon";

export interface TermEntry {
  slug: string;
  term: string;
  /** One-line definition (also shown on the terminology index cards). */
  short: string;
  /** Longer explanation, one entry per paragraph. */
  body: string[];
  visual: TermVisualKind;
}

export const TERMS: TermEntry[] = [
  {
    slug: "ohko",
    term: "OHKO / 1HKO",
    short: "One-Hit KO - a move that faints the target from full HP in a single hit.",
    body: [
      "An OHKO (one-hit knockout) is when a single attack takes the target from full HP straight to fainting. \"This Earthquake OHKOs their Landorus\" means it deals 100% or more of that Pokémon's HP.",
      "OHKOs decide a lot of doubles games: if you can guarantee one, you remove a threat before it acts. Damage calculators express this as a percentage - anything reaching 100% is a guaranteed OHKO.",
    ],
    visual: "ohko",
  },
  {
    slug: "2hko",
    term: "2HKO",
    short: "Two-Hit KO - it takes two hits to knock out the target.",
    body: [
      "A 2HKO takes two attacks to faint the target. A move that does 50-99% is a 2HKO: one hit leaves them alive, a second finishes the job.",
      "2HKOs matter because the target gets a turn in between - to attack back, switch, protect, or heal. Recovery, Leftovers, or a friendly Life Dew can turn a 2HKO into a 3HKO.",
    ],
    visual: "2hko",
  },
  {
    slug: "stab",
    term: "STAB",
    short: "Same-Type Attack Bonus - a move matching the user's type deals ×1.5.",
    body: [
      "Same-Type Attack Bonus multiplies a move's power by 1.5 when the move's type matches one of the user's types. A Fire-type using a Fire move gets STAB; using a Ground move it does not.",
      "The ability Adaptability raises STAB to ×2, and Terastallizing into a type you already had pushes STAB even higher. STAB is why Pokémon usually run one or two of their own-type moves as their main attacks.",
    ],
    visual: "stab",
  },
  {
    slug: "ev",
    term: "EV (Effort Value)",
    short: "Up to 508 tuning points spread across stats (max 252 per stat).",
    body: [
      "Effort Values are points you assign to a Pokémon's stats to shape its role. You get 508 total, up to 252 in any one stat. At level 50, every 8 EVs is worth roughly 1 point in that stat (4 EVs at level 100).",
      "A fast attacker might run 252 Speed / 252 Attack; a wall might run 252 HP and split the rest between defenses. EVs are the main way two copies of the same Pokémon end up playing completely differently.",
    ],
    visual: "ev",
  },
  {
    slug: "iv",
    term: "IV (Individual Value)",
    short: "Fixed per-Pokémon values 0-31 per stat; usually 31.",
    body: [
      "Individual Values are a Pokémon's innate 0-31 rating in each stat, baked in when it's caught or bred. Competitive Pokémon usually have 31 (\"perfect\") IVs everywhere.",
      "The common exception is a 0 Attack IV on special attackers: it minimises the damage they take from confusion and from Foul Play, since they never use their own Attack anyway.",
    ],
    visual: "iv",
  },
  {
    slug: "nature",
    term: "Nature",
    short: "Raises one stat 10% and lowers another 10%.",
    body: [
      "A nature raises one stat by 10% and lowers another by 10% - for example Adamant is +Attack, -Special Attack. Five natures are neutral (they raise and lower the same stat, so they do nothing).",
      "Natures never touch HP. You pick one that boosts your Pokémon's key stat and drops one it doesn't use: a physical attacker takes Adamant or Jolly, a special attacker Modest or Timid.",
    ],
    visual: "nature",
  },
  {
    slug: "spread-move",
    term: "Spread move",
    short: "A move that hits multiple targets in doubles; damage is ×0.75.",
    body: [
      "A spread move hits more than one Pokémon at once - both opponents (Heat Wave, Rock Slide, Muddy Water) or every other Pokémon on the field (Earthquake, Discharge). In doubles, spread moves have their damage reduced to ×0.75.",
      "That trade-off - less damage per target, but hitting two - is central to doubles. Rock Slide's flinch chance on both foes, or Earthquake softening the whole field, can be worth more than a single-target move.",
    ],
    visual: "spread-move",
  },
  {
    slug: "speed-tier",
    term: "Speed tier",
    short: "A Pokémon's effective Speed, used to decide who moves first.",
    body: [
      "A speed tier is simply a Pokémon's final Speed stat (after IVs, EVs, nature, and boosts) placed on a ladder against everything else. The faster Pokémon in a matchup acts first each turn.",
      "Teambuilding often means hitting a specific tier: enough Speed to outrun a common threat, or deliberately slow to move last (useful under Trick Room). One Speed point can decide a game.",
    ],
    visual: "speed-tier",
  },
  {
    slug: "speed-control",
    term: "Speed control",
    short: "Tools that change turn order: Tailwind, Trick Room, Icy Wind, Thunder Wave.",
    body: [
      "Speed control is any tool that changes who moves first without just building Speed. Tailwind doubles your team's Speed for a few turns; Trick Room reverses the order so the slowest act first; Icy Wind and Thunder Wave slow the opponent.",
      "Almost every doubles team carries some speed control - it's how you make sure your attackers move before theirs, which in a format full of OHKOs is often the whole game.",
    ],
    visual: "speed-control",
  },
  {
    slug: "priority",
    term: "Priority",
    short: "A move's turn-order bracket; positive priority moves before normal moves.",
    body: [
      "Priority is a bracket that overrides Speed. Positive-priority moves (Fake Out, Quick Attack, Extreme Speed, Grassy Glide in terrain) always go before normal moves, no matter how slow the user is. Negative priority (Trick Room setup, Dragon Tail) goes last.",
      "Within the same bracket, Speed still decides order. Priority is how a slow Pokémon can pick off a weakened fast one, or how Fake Out flinches something before it can act.",
    ],
    visual: "priority",
  },
  {
    slug: "redirection",
    term: "Redirection",
    short: "Moves/abilities that pull attacks toward one Pokémon.",
    body: [
      "Redirection draws the opponent's single-target attacks onto one of your Pokémon. Follow Me and Rage Powder force foes to target the user; abilities like Lightning Rod (Electric) and Storm Drain (Water) pull moves of that type in and even boost the holder.",
      "In doubles this protects a fragile partner: your Amoonguss clicks Rage Powder so your sweeper is free to set up or attack without being targeted. Spread moves ignore redirection.",
    ],
    visual: "redirection",
  },
  {
    slug: "pivot",
    term: "Pivot",
    short: "A Pokémon or move that switches out after attacking to gain momentum.",
    body: [
      "A pivot moves out of a bad matchup and brings in something better while keeping the initiative. Moves like U-turn, Volt Switch, and Flip Turn deal damage and then switch the user out in the same turn.",
      "Pivoting keeps momentum: you chip the opponent, dodge an incoming attack, and land a favourable matchup on your terms instead of being forced to stay in.",
    ],
    visual: "pivot",
  },
  {
    slug: "bulk",
    term: "Bulk",
    short: "A Pokémon's defensive capacity - a mix of HP and defenses.",
    body: [
      "Bulk is how much punishment a Pokémon can take. It combines HP with Defense and Special Defense: effective bulk is roughly HP multiplied by the relevant defense, which is why HP investment helps against both physical and special hits.",
      "A \"bulky\" Pokémon survives hits that would OHKO a frailer one, letting it set up, redirect, or support across several turns.",
    ],
    visual: "bulk",
  },
  {
    slug: "sweeper",
    term: "Sweeper",
    short: "An offensive Pokémon that aims to KO several opponents in a row.",
    body: [
      "A sweeper is built to knock out multiple opponents, usually after a setup move or a Speed boost puts it out of range of revenge kills. High Attack (or Special Attack) and enough Speed are its core requirements.",
      "The classic pattern: click a setup move once (Swords Dance, Dragon Dance), then out-speed and OHKO the rest of the opposing team. A well-timed sweeper often closes out the game on its own.",
    ],
    visual: "sweeper",
  },
  {
    slug: "wallbreaker",
    term: "Wallbreaker",
    short: "A strong attacker meant to break through defensive Pokémon (walls).",
    body: [
      "A wallbreaker hits hard enough to punch through the defensive Pokémon that would normally sponge attacks. It trades the Speed a sweeper wants for raw power - Choice Band, Life Orb, or a huge Attack stat.",
      "Where a sweeper cleans up a weakened team, a wallbreaker's job is earlier: remove the wall that's holding your sweeper back, so the sweep can happen.",
    ],
    visual: "wallbreaker",
  },
  {
    slug: "setup",
    term: "Setup",
    short: "Using a move to raise stats before attacking.",
    body: [
      "Setup is spending a turn on a stat-boosting move so your later attacks hit harder or move first. Swords Dance and Nasty Plot give +2 offense; Dragon Dance gives +1 Attack and +1 Speed; Calm Mind boosts special attack and defense.",
      "Setup is a gamble - you don't deal damage that turn - so it's safest behind protection, redirection, or after forcing a switch.",
    ],
    visual: "setup",
  },
  {
    slug: "hazards",
    term: "Hazards",
    short: "Entry hazards that damage or debuff Pokémon switching in.",
    body: [
      "Entry hazards sit on a side of the field and punish Pokémon switching in. Stealth Rock chips based on Rock weakness; Spikes damage grounded switch-ins; Toxic Spikes poison them; Sticky Web lowers their Speed.",
      "Hazards are less dominant in doubles than singles (fewer switches, and moves like Rapid Spin, Defog, or Tidy Up clear them), but chip damage still turns 2HKOs into OHKOs over a game.",
    ],
    visual: "hazards",
  },
  {
    slug: "tera",
    term: "Tera / Terastallization",
    short: "Changes a Pokémon's type to its Tera Type and boosts matching moves.",
    body: [
      "Terastallizing changes a Pokémon into its single Tera Type for the rest of the battle. It can shore up a weakness (Tera Steel to resist common attacks) or supercharge offense (Tera-ing into a STAB type raises that STAB to ×2).",
      "You get one Tera per game, per side, so when to use it - defensively to survive, or offensively to break through - is a major decision.",
    ],
    visual: "tera",
  },
  {
    slug: "lead",
    term: "Lead",
    short: "The two Pokémon you send out first in a doubles game.",
    body: [
      "Your lead is the pair of Pokémon you start the battle with. In doubles that first pair sets the tone: fast offense, a Trick Room setter under protection, or a redirect-and-support core.",
      "Choosing a lead is a matchup decision made at team preview - you pick the two Pokémon that best handle what the opponent is likely to bring.",
    ],
    visual: "lead",
  },
  {
    slug: "team-preview",
    term: "Bring / team preview",
    short: "Choosing which 4 of your 6 Pokémon to bring after seeing the opponent's team.",
    body: [
      "At team preview both players see each other's six Pokémon and then choose which four to bring. \"Bring\" is that selection - and which two of the four lead.",
      "This is where games are often decided: you pick the four Pokémon that best answer the opponent's threats, and leave your bad matchups in the back.",
    ],
    visual: "team-preview",
  },
  {
    slug: "wincon",
    term: "Win condition (wincon)",
    short: "The Pokémon or plan you expect to actually win the game with.",
    body: [
      "A win condition - \"wincon\" - is the Pokémon or line of play you're steering the game toward to close it out. Often it's a sweeper that, once its checks are gone, KOs the rest of the team; sometimes it's a strategy like Trick Room or Tailwind offense.",
      "Good play is about protecting your own wincon while removing the opponent's. Recognising \"their wincon is that Booster-boosted sweeper\" tells you what you must deal with before it takes over.",
    ],
    visual: "wincon",
  },
];

export function getTerm(slug: string): TermEntry | undefined {
  return TERMS.find((t) => t.slug === slug);
}
