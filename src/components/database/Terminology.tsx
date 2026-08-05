const TERMS: { term: string; def: string }[] = [
  { term: "OHKO / 1HKO", def: "One-Hit KO — a move that knocks out the target from full HP in a single hit." },
  { term: "2HKO", def: "Two-Hit KO — takes two hits to knock out the target." },
  { term: "STAB", def: "Same-Type Attack Bonus — a move whose type matches the user's type deals ×1.5 damage (×2 with Adaptability)." },
  { term: "EV", def: "Effort Value — up to 508 points spread across stats (max 252 per stat) to tune a Pokémon; 4 EVs ≈ 1 stat point at level 50." },
  { term: "IV", def: "Individual Value — fixed per-Pokémon values 0–31 per stat; usually 31, sometimes 0 Attack on special attackers." },
  { term: "Nature", def: "Raises one stat by 10% and lowers another by 10% (e.g. Adamant: +Atk −SpA)." },
  { term: "Spread move", def: "A move that hits multiple targets in doubles; its damage is reduced to ×0.75." },
  { term: "Speed tier", def: "A Pokémon's effective Speed stat, used to determine who moves first." },
  { term: "Speed control", def: "Tools that change turn order: Tailwind, Trick Room, Icy Wind, Thunder Wave, etc." },
  { term: "Priority", def: "A move's turn-order bracket. Positive priority (Quick Attack, Fake Out) moves before normal moves regardless of Speed." },
  { term: "Redirection", def: "Moves/abilities (Follow Me, Rage Powder, Lightning Rod, Storm Drain) that pull attacks toward one Pokémon." },
  { term: "Pivot", def: "A Pokémon (or move like U-turn / Volt Switch) that switches out after attacking to gain momentum." },
  { term: "Bulk", def: "A Pokémon's defensive capacity — a combination of HP and defenses." },
  { term: "Sweeper", def: "An offensive Pokémon that aims to KO multiple opponents, often after a setup move or speed boost." },
  { term: "Wallbreaker", def: "A strong attacker meant to break through defensive Pokémon (walls)." },
  { term: "Setup", def: "Using a move (Swords Dance, Nasty Plot, Dragon Dance) to raise stats before attacking." },
  { term: "Hazards", def: "Entry hazards (Stealth Rock, Spikes, Toxic Spikes, Sticky Web) that damage or debuff Pokémon switching in." },
  { term: "Tera / Terastallization", def: "A mechanic that changes a Pokémon's type to its Tera Type and boosts matching-type moves." },
  { term: "Lead", def: "The two Pokémon you send out first at the start of a doubles game." },
  { term: "Bring / team preview", def: "Choosing which 4 of your 6 Pokémon to bring after seeing the opponent's team." },
];

export function Terminology() {
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-400">Common competitive terms and abbreviations.</p>
      <dl className="grid gap-2 sm:grid-cols-2">
        {TERMS.map((t) => (
          <div key={t.term} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
            <dt className="text-sm font-semibold text-amber-300">{t.term}</dt>
            <dd className="mt-0.5 text-xs text-slate-300">{t.def}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
