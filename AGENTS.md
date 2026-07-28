# AssaultDex Agent Rules

Read `docs/ASSAULTDEX_SPEC.md` before making architectural or product decisions.

* AssaultDex supports only Pokémon Champions doubles.
* Do not assume mechanics from older Pokémon games.
* Do not expose a public API.
* External data must use server-side provider adapters.
* Never invent mechanics, formulas, statistics, or provider data.
* Keep battle logic separate from UI and persistence.
* Use strict TypeScript and validate external data.
* Work on one implementation phase at a time.
* Do not start later phases before the current phase passes.
* Add tests for calculations and confirmed bugs.
* Run type checks, linting, tests, and production builds.
* Report command results accurately.
* Preserve working code unless a change is justified.
* Document assumptions and unverified mechanics.
