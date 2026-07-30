# Fixture data verification

This file records cross-source verification of the fixture Pokémon shipped in
`src/data/fixtures/pokemon.json` and notes any conflicts. Regenerate the
automated portion with `pnpm tsx scripts/verifyFixtures.ts` in an environment
that can reach PokéAPI (see the egress note below).

## What is verified vs. provisional

| Data | Verifiability | Source of truth |
| --- | --- | --- |
| **Base stats** | Verifiable public data | PokéAPI, PokémonDB, Serebii |
| **Types** | Verifiable public data | PokéAPI, PokémonDB, Serebii |
| **Abilities** | Verifiable public data | PokéAPI (`abilities[]`), PokémonDB, Serebii |
| **Pool membership (Champions-legal)** | Verifiable | Champions roster (Game8, Serebii Champions Pokédex, PokéBase-Champions) |
| **Movepools (which moves a species can learn)** | **Curated, provisional** | The 4-move sets are hand-picked competitive examples using real move names, **not** full learnsets; a learnset source is needed to verify completeness |
| **Move power / accuracy / priority / target** | **Provisional** | Mainline-derived; unverified for Champions |
| **Damage / speed / type-effectiveness formulas** | **Provisional** | Mainline-derived; unverified for Champions (see `mechanics/assumptions.ts`) |

Base stats, types, and abilities are treated as authoritative and cross-checked.
Movepools are curated example sets (real moves, not full learnsets) and mechanic
data remains provisional by design — neither is asserted as fully verified here.
`scripts/verifyFixtures.ts` checks base stats, types, **and abilities** against
PokéAPI (ability names are compared case/format-insensitively).

## Egress note

Live PokéAPI verification could not be executed in the build session: outbound
egress to `pokeapi.co:443` is **denied by the environment's network policy**
(the agent proxy returns 403 for that host, and likewise for third-party
Champions API hosts). The automated script `scripts/verifyFixtures.ts` performs
the live PokéAPI diff and is intended to be run where that egress is allowed
(e.g. CI or a developer machine). The cross-check below was therefore performed
against multiple public web sources instead.

## Cross-check results (2026-07)

Fixture base stats, types, and abilities were compared against public Pokédex
sources (PokémonDB, Serebii — including Serebii's dedicated Champions Pokédex —
and PokéBase's Champions pages). The **29** fixtures use canonical public values;
the original eight were manually cross-checked (all match, 0 conflicts), and the
later additions use canonical Pokédex values from the same sources. Run
`scripts/verifyFixtures.ts` for the mechanized PokéAPI diff (stats + types +
abilities) across all 29 where egress is allowed.

| Species | Types | HP | Atk | Def | SpA | SpD | Spe |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Incineroar | Fire/Dark | 95 | 115 | 90 | 80 | 90 | 60 |
| Rillaboom | Grass | 100 | 125 | 90 | 60 | 70 | 85 |
| Amoonguss | Grass/Poison | 114 | 85 | 70 | 85 | 80 | 30 |
| Gholdengo | Steel/Ghost | 87 | 60 | 95 | 133 | 91 | 84 |
| Garchomp | Dragon/Ground | 108 | 130 | 95 | 80 | 85 | 102 |
| Dragonite | Dragon/Flying | 91 | 134 | 95 | 100 | 100 | 80 |
| Tyranitar | Rock/Dark | 100 | 134 | 110 | 95 | 100 | 61 |
| Corviknight | Flying/Steel | 98 | 87 | 105 | 53 | 85 | 67 |
| Kingambit | Dark/Steel | 100 | 135 | 120 | 60 | 85 | 50 |
| Annihilape | Fighting/Ghost | 110 | 115 | 80 | 50 | 90 | 90 |
| Dragapult | Dragon/Ghost | 88 | 120 | 75 | 100 | 75 | 142 |
| Grimmsnarl | Dark/Fairy | 95 | 120 | 65 | 95 | 75 | 60 |
| Whimsicott | Grass/Fairy | 60 | 67 | 85 | 77 | 75 | 116 |
| Pelipper | Water/Flying | 60 | 50 | 100 | 95 | 70 | 65 |
| Milotic | Water | 95 | 60 | 79 | 100 | 125 | 81 |
| Glimmora | Rock/Poison | 83 | 55 | 90 | 130 | 81 | 86 |
| Excadrill | Ground/Steel | 110 | 135 | 60 | 50 | 65 | 88 |
| Toxapex | Poison/Water | 50 | 63 | 152 | 53 | 142 | 35 |
| Garganacl | Rock | 100 | 100 | 130 | 45 | 90 | 35 |
| Archaludon | Steel/Dragon | 90 | 105 | 130 | 125 | 85 | 85 |
| Gyarados | Water/Flying | 95 | 125 | 79 | 60 | 100 | 81 |
| Arcanine | Fire | 90 | 110 | 80 | 100 | 80 | 95 |
| Metagross | Steel/Psychic | 80 | 135 | 130 | 95 | 90 | 70 |
| Talonflame | Fire/Flying | 78 | 81 | 71 | 74 | 69 | 126 |
| Hydreigon | Dark/Dragon | 92 | 105 | 90 | 125 | 90 | 98 |
| Kommo-o | Dragon/Fighting | 75 | 110 | 125 | 100 | 105 | 85 |
| Scizor | Bug/Steel | 70 | 130 | 100 | 55 | 80 | 65 |
| Meowscarada | Grass/Dark | 76 | 110 | 70 | 81 | 70 | 123 |
| Quaquaval | Water/Fighting | 85 | 120 | 80 | 85 | 75 | 85 |

### Pool-legality check

All 29 are regular, fully-evolved species with **no** legendary, mythical,
Ultra Beast, or Paradox status, matching the Pokémon Champions pool rules. Each
addition's presence in the Champions pool was confirmed against the roster
sources below (Game8, Pikalytics Champions, and PokéBase/Pokémon-Zone Champions
pages). (Removed earlier for violating the pool rules: Chien-Pao, Flutter Mane,
Landorus-Therian, Urshifu-Rapid-Strike.)

### Conflicts / exclusions noted

- **Skeledirge** — **excluded (conflicting reports).** Meowscarada and Quaquaval
  (its Paldea-starter siblings) are confirmed in the pool, but community reports
  conflict on whether Skeledirge is present ("Gen 9 starter trio missing one").
  Rather than add a species whose legality is disputed, it is left out until
  first-party confirmation. Re-evaluate when the official roster is unambiguous.
- **Salamence** — **not added.** Mega Salamence is reported absent from Champions
  and base Salamence's pool status was unclear in the sources checked; omitted
  pending confirmation.

## Known assumptions / potential future conflicts

- **Rebalancing risk.** Champions could adjust base stats or movepools relative
  to the mainline games. The sources consulted (including Champions-specific
  Pokédex pages) show these species' base stats unchanged, but a first-party
  confirmation is not available; treat as verified-against-community-sources,
  not first-party.
- **Move data is provisional** and intentionally excluded from this
  verification. When a permitted Champions move/mechanic source exists, extend
  `scripts/verifyFixtures.ts` to diff move data too.
- **PokéAPI does not model Champions.** It confirms base stats/types of a species
  but not pool membership or Champions mechanics ([PokeAPI issue #1484] is closed
  without Champions support), which is why pool-legality is verified separately.

## Sources

- PokéAPI — https://pokeapi.co/ (base stats/types; blocked by egress in-session)
- PokémonDB — https://pokemondb.net/
- Serebii Champions Pokédex — https://www.serebii.net/pokedex-champions/
- PokéBase (Champions) — https://pokebase.app/pokemon-champions
- Pikalytics (Champions) — https://www.pikalytics.com/
- Game8 Champions roster — https://game8.co/games/Pokemon-Champions/archives/501889
- PokeAPI issue #1484 — https://github.com/PokeAPI/pokeapi/issues/1484
