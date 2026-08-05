# AssaultDex Agent Rules

Read `ASSAULTDEX_SPEC.md` before architectural/product decisions.

* AssaultDex support only Pokémon Champions doubles.
* No assume mechanics from older Pokémon games.
* No public API.
* External data must use server-side provider adapters.
* Never invent mechanics, formulas, statistics, provider data.
* Keep battle logic separate from UI + persistence.
* Use strict TypeScript, validate external data.
* Work one implementation phase at time.
* No start later phases before current phase pass.
* Add tests for calculations + confirmed bugs.
* Run type checks, linting, tests, production builds.
* Report command results accurately.
* Preserve working code unless change justified.
* Document assumptions + unverified mechanics.