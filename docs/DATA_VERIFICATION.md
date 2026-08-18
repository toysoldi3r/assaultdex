# Data verification

The Pokémon dataset (`src/data/fixtures/pokemon.json`) is **generated**, not
hand-authored, from two independent sources:

- **Pool membership** — `src/data/fixtures/championsRoster.json`, the
  user-provided authoritative list of every Pokémon available in Pokémon
  Champions (213 entries, including forms).
- **Base stats, types, abilities, movepools, move data** — `@pkmn/dex`
  (Pokémon Showdown's dataset: accurate, offline, MIT-licensed).

Regenerate with `pnpm generate:fixtures`. `@pkmn/dex` is a **dev dependency**;
the app ships only the generated JSON.

## What is verified vs. provisional

| Data | Status | Source |
| --- | --- | --- |
| **Pool membership** | Authoritative | user-provided Champions roster |
| **Base stats** | Verified | `@pkmn/dex` (Showdown), cross-checkable vs PokéAPI |
| **Types** | Verified | `@pkmn/dex`; **cross-checked against the roster's types (0 conflicts)** |
| **Abilities** | Verified | `@pkmn/dex` |
| **Movepools** | Verified (mainline learnsets) | `@pkmn/dex` learnsets |
| **Move power / accuracy / priority / target** | Verified mainline values, **provisional for Champions** | `@pkmn/dex` |
| **Damage / speed / type-effectiveness formulas** | **Provisional** | mainline-derived (see `mechanics/assumptions.ts`) |

Notes:

- The `moves` array on each Pokémon is a **curated playable subset** (STAB /
  high-power damaging moves + key utility, ≤10) with full battle data; the
  `movepool` array is the **complete** legal move list used for team-legality
  validation and display.
- **Special move mechanics** are data-driven from `@pkmn/dex` and honoured by the
  damage engine: offensive-stat overrides (Body Press → Defense), target-stat
  moves (Foul Play → the target's Attack), defensive-stat overrides
  (Psyshock/Secret Sword → physical Defense), and multi-hit moves (Dragon Darts
  ×2, Population Bomb ×10). These follow documented mainline rules and remain
  provisional for Champions like the rest of the damage math.
- **Abilities and items** are modeled as data-driven multipliers/immunities in
  the damage and speed engines: e.g. Adaptability, Technician, Guts, Huge Power,
  type/low-HP boosters, Tough Claws/Iron Fist (via move flags); Thick Fat,
  Multiscale, Ice Scales, Filter, Fur Coat; immunities (Levitate, Flash Fire,
  Water/Volt Absorb, Sap Sipper, Bulletproof); speed abilities (Chlorophyll,
  Swift Swim, …); and items (Choice Band/Specs/Scarf, Life Orb, Assault Vest,
  Muscle Band/Wise Glasses, Expert Belt, type boosters). Move flags/secondaries
  come from `@pkmn/dex`; the ability/item *effect values* are hand-coded
  documented mainline behaviour (ASSUMPTIONS.abilityEffects / itemEffects),
  provisional for Champions.
- **Move secondary effects** (status/flinch/stat changes, with their chances)
  come from `@pkmn/dex` and are applied in **simulations**
  (ASSUMPTIONS.secondaryEffects). They are also surfaced in the UI as short
  effect chips (Pokémon page move table and ChoiceDex recommendation rows) via
  `mechanics/moveEffects.ts`.
- **On-entry ability effects** (Intimidate −1 Atk to foes; weather setters like
  Drought/Drizzle/Sand Stream/Snow Warning; terrain setters like Electric/
  Grassy/Misty/Psychic Surge) are auto-applied when the initial battle state is
  built (`mechanics/entry.ts`, ASSUMPTIONS.entryEffects). A manually-selected
  weather/terrain is never overridden. The ChoiceDex editor lists what fired.
- **Reactive held items** (Sitrus Berry heal at ≤50% HP, Weakness Policy +2 Atk/
  SpA when hit super-effectively, Focus Sash surviving a KO from full HP) trigger
  during **simulations** (`sim/transition.ts`, ASSUMPTIONS.reactiveItems).
- **End-of-turn residuals and multi-turn durations** (`sim/residual.ts`,
  ASSUMPTIONS.residualEffects) run each turn in every simulation-stepping tool:
  sandstorm chip (−1/16, skips Rock/Ground/Steel and immune abilities/Safety
  Goggles), burn (−1/16), poison (−1/8), **badly-poisoned Toxic ramp** (n/16,
  incrementing each turn), Leftovers (+1/16), Poison Heal, Magic Guard immunity,
  and **Perish Song** (faints at 0). Weather, terrain, Trick Room, Reflect,
  Light Screen, Aurora Veil, and Tailwind carry optional turn counters that count
  down and expire; an undefined counter persists (unchanged single-turn
  behaviour). Screens are now settable per side in the battle editor.
- **Entry hazards and Gravity** (`mechanics/hazards.ts`, ASSUMPTIONS.hazards):
  Stealth Rock (1/8 × Rock type-effectiveness), Spikes (1/8·1/6·1/4 to grounded),
  Toxic Spikes (poison/badly-poison grounded non-immune; Poison absorbs, Steel
  immune), and Sticky Web (−1 Speed to grounded). Heavy-Duty Boots grant full
  immunity and Magic Guard ignores the chip. Gravity grounds every Pokémon
  (affecting terrain and hazards). Surfaced per-Pokémon in the battle view's
  detail panel as an on-switch-in readout with an "apply" action.
- **Opponent spread inference from a hit** (`choicedex/spreadInference.ts`,
  ASSUMPTIONS.statInference): given your Pokémon's HP before/after a hit, the
  tool enumerates the opponent's EV/IV/nature grid and keeps only spreads whose
  damage rolls are consistent with the observed change — inferring their Atk/SpA
  (offense) or HP+Def/SpD bulk (defense). Uniform prior, provisional damage math.
- Data values are **mainline** (via Showdown). If Pokémon Champions rebalanced
  any stat, ability, or movepool, this dataset would differ — that is the same
  provisional caveat that applies to the mechanics engine, and is flagged rather
  than asserted as first-party Champions data.

## Cross-checks performed

1. **Roster ↔ types.** The generator compares every species' Showdown types
   against the authoritative roster's `Type1`/`Type2`. Result on the current
   roster: **213/213 match, 0 conflicts.**
2. **Fixtures ≡ pool.** `src/data/__tests__/roster.test.ts` asserts the fixture
   set is exactly the roster (same count, unique ids, all fields populated), so
   the site contains **only** the listed Pokémon.
3. **PokéAPI diff (optional, second source).** `scripts/verifyFixtures.ts`
   diffs base stats / types / abilities against PokéAPI, an independent source.
   It requires outbound access to `pokeapi.co`, which is blocked by this
   environment's egress policy; run it in CI or locally to produce
   `docs/DATA_VERIFICATION_AUTORUN.md`.

## Corrections this made

The authoritative roster overrode several earlier web-search assumptions:
removed as **not in the pool** — Amoonguss, Gholdengo, Rillaboom, Annihilape,
Grimmsnarl, Metagross (and earlier: Chien-Pao, Flutter Mane, Landorus-Therian,
Urshifu-Rapid-Strike). **Skeledirge, previously excluded on a conflicting
report, is in the pool** per the list and is included.

## Sources

- Pokémon Champions roster — user-provided authoritative list
- `@pkmn/dex` — https://github.com/pkmn/ps (Pokémon Showdown data, MIT)
- PokéAPI — https://pokeapi.co/ (independent cross-check; egress-blocked here)
- Held-item icons — PokéAPI sprite set, https://github.com/PokeAPI/sprites
  (CC0-1.0). Fetched out of band by `pnpm refresh:item-icons` and committed
  under `public/itemicons/`; nothing is fetched at runtime. Champions-only Mega
  Stones have no sprite and render as their name.
- Pokémon artwork — official artwork and 3D HOME renders from the PokéAPI
  sprite set (same repo). Fetched out of band by `pnpm refresh:pokemon-art`,
  trimmed / downscaled to 384px and re-encoded as WebP (needs Python 3 +
  Pillow), then committed under `public/pokeart/<style>/` (`artwork`, `home`);
  nothing is fetched at runtime. The display menu (top-right) picks the live
  sprite style — pixel icons, official artwork, or 3D renders — for every
  Pokémon in the app; a slug with no art file falls back to the pixel menu
  icon. Held-item icons have only the one PokéAPI set (no artwork/3D equivalent
  exists), so they are unaffected by the sprite-style choice.
