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
