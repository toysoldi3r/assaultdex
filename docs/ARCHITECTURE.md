# AssaultDex — Architecture & Phase 1 Design

This document answers the eleven "First task" deliverables from
`ASSAULTDEX_SPEC.md`, then defines the first vertical slice that this
repository implements. It is written **before** later phases and covers only
Phase 1.

> **Mechanics status: PROVISIONAL.** Pokémon Champions is not publicly
> documented. Per `AGENTS.md`, no mechanic, formula, statistic, or provider
> datum may be invented or assumed from older games. Every mechanic in this
> slice is therefore marked `provisional` and centralised in
> `src/domain/mechanics/assumptions.ts`. All fixture data is documented test
> data, not authoritative provider data. When verified Champions data exists,
> the provisional flags and fixtures are replaced without touching UI or
> persistence.

---

## 1. Repository assessment

Starting state of the repository:

| File | Purpose |
| --- | --- |
| `ASSAULTDEX_SPEC.md` | Full product specification. |
| `AGENTS.md` | Agent rules (scope, no-invention, phase discipline). |
| `README.md` | One-line placeholder. |

Findings:

- **Greenfield.** No existing application code, stack, build tooling, tests,
  or CI. Nothing to reuse; nothing to preserve. We choose the stack fresh
  from the spec's "Preferred stack".
- **No running database.** The container has the `psql` client but no
  Postgres server. Phase 1 therefore runs on **SQLite through Prisma** so
  migrations, tests, and the production build all run without an external
  service. The Prisma schema and repository layer are provider-agnostic; the
  production target remains PostgreSQL (documented in
  [Risks](#10-risks-and-unverified-mechanics)).
- **Mechanics are unverified.** The spec's own game ("Pokémon Champions") has
  no public mechanics. This is the dominant design constraint: mechanics are
  isolated, provisional, and individually flagged.

## 2. Architecture

Layered, with a strict dependency direction. Battle logic never imports UI or
persistence (spec: "Keep battle calculations separate from the UI and
database").

```
          ┌───────────────────────────────────────────┐
   UI      │  src/app  (Next.js App Router, React)      │
          │  src/components                            │
          └───────────────┬───────────────────────────┘
                          │ calls (server actions / RSC)
          ┌───────────────▼───────────────────────────┐
 APP/SVC   │  src/server  (repositories, prisma client) │
          └───────┬───────────────────────┬───────────┘
                  │                       │
   DOMAIN ┌───────▼────────┐      DATA ┌──▼──────────────────────┐
          │ src/domain     │           │ src/data                │
          │ pure mechanics │           │ provider adapters,      │
          │ + scoring      │           │ Zod schemas, fixtures,  │
          │ (no I/O)       │           │ normalization           │
          └────────────────┘           └─────────────────────────┘
```

- **`src/domain`** — Pure, deterministic TypeScript. No `fetch`, no Prisma, no
  React. Type effectiveness, speed, damage, legal-action generation, ChoiceDex
  scoring and recommendation. This is the most heavily tested layer.
- **`src/data`** — Server-side provider adapters behind a common interface,
  Zod validation of all external/fixture input, and normalization to internal
  domain types. Fixtures live here.
- **`src/server`** — Persistence. Prisma client and repository functions for
  teams, versions, and collections. The only layer that talks to the DB.
- **`src/app` / `src/components`** — Next.js UI and server actions. Depends
  inward only.

Rules enforced by ESLint `no-restricted-imports`: `src/domain` may not import
from `app`, `server`, `data`, or `next`.

## 3. Folder structure

```
assaultdex/
  docs/ARCHITECTURE.md         # this document
  prisma/
    schema.prisma              # SQLite (dev) — provider-agnostic models
    migrations/                # committed migrations
    seed.ts                    # seeds Pokémon from fixtures via the adapter
  src/
    domain/                    # PURE battle logic (no I/O)
      types/                   # domain types (Pokemon, Move, BattleState…)
      mechanics/               # assumptions, typeChart, typeEffectiveness,
                               #   speed, damage, legalActions
      choicedex/               # scoring, recommend
    data/                      # provider adapters + validation + fixtures
      providers/               # ProviderAdapter interface + fixture adapter
      schemas/                 # Zod schemas for external/fixture data
      fixtures/                # documented fixture data (JSON/TS)
      normalize.ts             # external → domain normalization
    server/                    # persistence
      db.ts                    # prisma client singleton
      repositories/            # pokemonRepo, teamRepo
    app/                       # Next.js routes
      pokemon/ , teams/ , choicedex/
    components/
    lib/
  vitest.config.ts, next.config.ts, tsconfig.json, eslint.config.mjs …
```

## 4. Database overview

Phase 1 persists only what the slice needs: imported Pokémon reference data,
teams, immutable team versions, and collections. (Battle state in Phase 1 is
transient and client-driven; it is not persisted yet.)

Models (`prisma/schema.prisma`):

- **Pokemon** — normalized reference row. `provider`, `externalId`,
  `retrievedAt`, `dataVersion`, `normalizationVersion`, `updateStatus`
  (spec: provenance columns). `(provider, externalId)` unique so imports are
  idempotent (spec: "Imports must be repeatable without creating
  duplicates").
- **Move / Ability / Item / Nature** (Phase 1 keeps moves inline on the
  Pokemon fixture; the tables exist for later phases but only Pokemon is
  populated in the slice).
- **Collection** — named grouping of teams. Private by default.
- **Team** — belongs to a collection (optional in Phase 1, no auth yet), has
  many versions.
- **TeamVersion** — immutable snapshot: `versionNumber`, `label`, `createdAt`,
  and the six Pokémon sets stored as validated JSON. Comparing two versions is
  a pure diff over these snapshots.

Idempotent import is implemented with `upsert` on `(provider, externalId)`.

## 5. Mechanics-engine design

All mechanics live in `src/domain/mechanics` and are pure functions over
plain data. Each mechanic references a central assumption record:

- **`assumptions.ts`** — `MECHANICS_STATUS = 'provisional'` and an
  `ASSUMPTIONS` registry: id, description, source (`mainline-derived` /
  `fixture`), and `verified: false`. Every engine result carries the
  assumption ids it relied on, so the UI can surface "Assumptions" and never
  present provisional output as verified.
- **`typeChart.ts` / `typeEffectiveness.ts`** — 18-type multiplier lookup for
  single and dual types (0/¼/½/1/2/4). Flagged provisional for Champions.
- **`speed.ts`** — effective speed from base stat + nature + EV/IV + a
  provisional item/ability/field hook, plus move-order resolution including
  priority and speed ties (returns tie probability rather than a fabricated
  winner).
- **`damage.ts`** — provisional mainline-style damage: returns the full 16-roll
  min/max/expected spread, percentages, and OHKO/2HKO/survival probabilities.
  Never returns a single "guaranteed" number (spec: "Never describe an
  uncertain result as guaranteed").
- **`legalActions.ts`** — generates all legal action combinations for the two
  active user Pokémon (each move × legal target, plus switches) and likely
  opponent actions from revealed/inferred data.

Determinism: given the same inputs, every function returns identical output —
required for tests and for reproducible recommendations.

## 6. ChoiceDex scoring design

`src/domain/choicedex`.

- Scoring is **transparent and factor-decomposed** (spec: "Store each factor
  separately"). `scoreAction` returns a `ScoreBreakdown`: a list of named
  factors (expected damage, KO probability, survival, speed control, …), each
  with a raw value, a normalized 0–1 contribution, and the weight applied.
  The final score is the weighted sum; the breakdown is retained, not just the
  total.
- **Profiles** (`Balanced`, `Safest`, `HighestEV`, `MaxDamage`, …) supply
  weight vectors only. They never change mechanics or probabilities (spec).
- **`recommend`** ranks complete action combinations and returns, per
  recommendation: both user actions + targets, damage/KO/survival
  probabilities, expected resulting position (provisional), main risk,
  assumptions used, a confidence value, an alternative, and a plain-language
  explanation.
- Phase 1 ships a deterministic single-turn evaluation. Simulation/branching
  (Phases 7–8) are out of scope and not stubbed as if working.

## 7. Opponent-inference design

Full inference is Phase 6. Phase 1 ships only the **interface and data shape**
so the slice can carry "inferred/unknown" states honestly, without a working
Bayesian updater:

- `PossibilityDistribution<T>` — prior, current, supporting/contradictory
  evidence, confidence. A possibility is removed only when confirmed evidence
  makes it impossible.
- Phase 1 opponent sets are entered/unknown, tagged with an information tier
  (`confirmed` / `entered` / `calculated` / `inferred` / `unknown`). No
  probability updates are performed yet; the types exist so later phases plug
  in without reshaping the battle state.

## 8. External-provider design

`src/data/providers`. Every provider implements `ProviderAdapter`:

```ts
interface ProviderAdapter<Raw, Domain> {
  readonly provider: string;
  fetchAll(opts): Promise<RawPage<Raw>>;   // pagination
  validate(raw: unknown): Raw;             // Zod
  normalize(raw: Raw): Domain;             // → domain type + provenance
}
```

Cross-cutting concerns required by the spec (auth, timeouts, pagination, rate
limits, retries, caching, failure handling, normalization) are defined on the
adapter contract and helper wrappers. Phase 1 ships **one** adapter:
`fixturePokemonProvider` — reads documented local fixtures, validates with
Zod, and normalizes to the domain `Pokemon` type with provenance
(`provider='fixture'`, `retrievedAt`, `dataVersion`, `normalizationVersion`).
No live network provider is claimed. Previously imported data survives
provider outages because it lives in the DB, not fetched per request.

## 9. Testing strategy

- **Vitest** for unit tests, colocated under `__tests__`. Focus on the pure
  domain layer: type effectiveness (single/dual, immunities), speed & priority
  ordering + ties, damage spread/percent/KO probabilities, legal-action
  generation, scoring factor decomposition, and recommendation ranking.
- **Provisional tests.** Tests that assert values from unverified mechanics are
  marked provisional (title prefix `[provisional]`) so a mechanics change is
  expected to update them (spec: "Mark tests based on unverified mechanics as
  provisional").
- **Validation tests** for the Zod fixture schema and normalization
  (idempotent, provenance present).
- **Regression tests** are added for every calculation bug found later.
- Commands: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
  Playwright is configured for later end-to-end phases but no e2e is claimed
  as passing in Phase 1.

## 10. Risks and unverified mechanics

| Risk / assumption | Handling |
| --- | --- |
| **Champions mechanics unknown.** Type chart, damage, speed, priority are all mainline-derived guesses. | Centralised in `assumptions.ts`, flagged `verified:false`, surfaced in UI, provisional tests. Swap when real data exists. |
| **Fixture data is not a provider feed.** Base stats/types are public Pokédex values; move power/accuracy provisional. | `provider='fixture'`, clearly labelled; not presented as competitive/usage data. |
| **SQLite ≠ PostgreSQL.** Migration SQL and some types differ. | Repository layer is provider-agnostic; schema avoids PG-only features in Phase 1. Production swap tracked as a Phase 10 task. |
| **No auth yet.** Teams are unowned in Phase 1. | Accounts are Phase 10; models leave room for `userId` without reshaping. Collections default private. |
| **Usage/win-rate stats.** | Out of scope for the slice; not fabricated. Homepage shows only what the slice actually has. |

## 11. Phase 1 acceptance criteria

The first vertical slice is complete when all of the following hold and every
validation command passes:

1. Pokémon data imports from documented fixtures through the provider adapter,
   with Zod validation and provenance, idempotently (re-running the seed
   creates no duplicates).
2. A user can search Pokémon and open a Pokémon page showing types, base
   stats, provisional type matchups, and provenance.
3. A user can create and save a team of up to six Pokémon (validated with Zod).
4. A user can create a new team version and compare two versions (a diff).
5. A team can be placed in a collection.
6. A user can select two active user Pokémon and two active opponent Pokémon.
7. A basic battle state can be entered (active Pokémon, HP, simple field).
8. The engine computes type effectiveness, effective speed/order, and a damage
   spread (min/max/expected, %, OHKO/2HKO/survival).
9. Legal actions are generated for both active user Pokémon.
10. ChoiceDex displays ranked recommendations, each with its factor
    breakdown, probabilities, assumptions, confidence, risk, and explanation —
    never presented as guaranteed.

Validation: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all pass.

---

## Phase 2 — team builder, validation, versions, collections, basic analysis (implemented)

Started only after Phase 1 passed all checks (spec: one phase at a time).

- **Full set editing.** `TeamEditor` (client) edits every member's level, ability,
  item, nature, up to four moves (from the species' legal move list), and
  EV/IV spread, then saves an immutable new version. Nothing is saved when the
  team is illegal.
- **Legality validation** (`domain/team/validate.ts`, pure): team size, species
  clause, level range, move count/uniqueness/legality, nature legality, EV caps
  (≤252/stat, ≤508 total, multiple-of-4 warning), IV range. Surfaced live in the
  editor and summarised on the team page.
- **Basic team analysis** (`domain/team/analysis.ts`, pure, provisional): shared
  defensive weaknesses, offensive coverage gaps, speed tiers, speed-control
  detection (priority + control moves), and single-Pokémon coverage dependence.
  Analyses that need metagame/usage data (common leads, cores) are intentionally
  **not** included — that is Phase 5 and is not fabricated.
- **Lifecycle:** duplicate, delete, restore an earlier version (appended as a new
  version — history stays immutable), team notes, JSON export (route handler)
  and JSON import (validated against the snapshot schema).
- **Resolver** (`server/teamResolve.ts`) bridges stored snapshots to the pure
  validate/analysis functions using reference data, keeping the domain layer free
  of persistence/data-adapter imports.
- **Migration** `team_notes` adds `Team.notes`.

Validation: `pnpm typecheck && pnpm lint && pnpm test` (41 tests) `&& pnpm build`
all pass. Phases 3–10 are **not** started.

---

## Phase 3 — type, speed, damage, field-state, and legal-action engines (implemented)

Deepens the Phase 1 provisional engines into fuller mechanics, still flagged
provisional and unverified for Champions.

- **Field state.** `FieldState` (whole-field: weather, terrain, Trick Room) and a
  new per-side `SideConditions` (Tailwind, Reflect, Light Screen, Aurora Veil) on
  each `SideState`. `mechanics/field.ts` provides grounding and weather/terrain
  multipliers.
- **Damage engine.** Adds weather (Fire/Water under sun/rain), terrain
  (grounded-user ×1.3 boosts; Misty halves Dragon), screens (1/3 reduction in
  doubles, ignored on crit), and optional critical hits (ignore relevant stat
  stages, ×1.5). Returns a full `modifiers` breakdown for transparency; every
  applied modifier is surfaced in ChoiceDex.
- **Move targeting.** Moves carry a `target` (`normal` / `all-adjacent-foes` /
  `all-adjacent` / `self` / `ally`). The spread modifier is derived from the
  target, and the legal-action engine is target-aware: single-target moves
  enumerate targets, spread moves make one action that hits all foes, and
  self/ally moves target the user's side.
- **Speed engine.** Adds Tailwind (×2) via side conditions, alongside existing
  priority, paralysis, stat stages, and Trick Room.
- **New assumptions** (`weather`, `terrain`, `screens`, `grounding`, `tailwind`)
  are registered and attached to results.
- **UI.** ChoiceDex gains weather/terrain/Trick Room/Tailwind controls, a field
  summary, "→ both foes" for spread moves, and a per-hit modifier list.

Items and abilities are deliberately **not** given concrete effects yet: their
Champions behaviour is unverified and Phase 3's title does not include them. The
engine architecture (per-side conditions, modifier pipeline, targeting) is the
extension point for them later.

Validation: `pnpm typecheck && pnpm lint && pnpm test` (49 tests) `&& pnpm build`
all pass. Phases 4–10 are **not** started.

---

## Phase 4 — lead analysis, interactive battle editor, recommendations (implemented)

Because the domain layer is pure (no I/O), the recommendation engine runs
**client-side**: ChoiceDex is now interactive, recomputing live as the state
changes, with no server round-trip per edit.

- **Lead analysis** (`domain/choicedex/leads.ts`, pure, tested): ranks the
  user's candidate lead pairs against every likely opponent lead pair using the
  recommendation and speed engines. Transparent factors — damage pressure,
  defensive position, speed control, KO safety — with best/worst matchup and an
  explanation. Metagame-driven lead criteria (common opponent strategies) are
  omitted (Phase 5), not fabricated.
- **Interactive battle editor** (`components/choicedex/BattleEditor.tsx`,
  client): edit both sides' species, HP%, status, and stat stages, plus field
  (weather/terrain/Trick Room) and per-side Tailwind. Recommendations update
  live. Turn history with **record / undo / return-to-earlier-turn** and
  per-turn notes (spec: "Support undo, corrections, and returning to earlier
  turns").
- **Client build helper** (`lib/choicedexBuild.ts`): turns reference Pokémon +
  editor form state into a domain `BattleState`; imports only pure domain + the
  fixture natures, so it is safe in client components.
- **Shared presentation** (`components/choicedex/Recommendations.tsx`): the
  ranked-recommendation view (actions, damage rolls, KO/2HKO, factor breakdown,
  modifiers, risk, assumptions, confidence) reused across editor views.
- The old GET-form server page and its `lib.ts` builder were replaced by the
  client editor.

Validation: `pnpm typecheck && pnpm lint && pnpm test` (52 tests) `&& pnpm build`
all pass. Phases 5–10 are **not** started.

---

## Phase 5 — statistics (DEFERRED)

Usage, win-rate, trend, core, counter, and lead **statistics** require a real
Pokémon Champions usage feed. None is publicly available, and AGENTS.md forbids
inventing statistics or provider data. Rather than ship fabricated numbers,
Phase 5 is **deferred** until a verified source exists (a permitted API, or a
scraper built once the site is otherwise complete). The provider-adapter
interface (`data/providers/types.ts`) is the seam a usage adapter will plug into,
and every planned statistic already has its provenance/reliability columns
designed. No statistics UI is shipped rather than a fake one.

## Phase 6 — opponent-set inference (implemented)

Evidence-driven inference that needs no usage data. (Usage-based *priors* are the
one deferred input, tied to Phase 5.)

- **Possibility distributions** (`domain/choicedex/inference.ts`): generic
  distributions over an unknown property with uniform priors, `confirm` (all
  other values become impossible), `eliminate` (rule out only on confirmed
  evidence — a possibility is never dropped otherwise, per spec), renormalization
  and confidence. Supporting/contradictory evidence and information tier are
  tracked.
- **Speed/spread inference** (`domain/choicedex/speedInference.ts`): enumerate an
  opponent's Speed across a uniform spread grid (EV steps of 4, IV 0/31, nature
  ±/0) and narrow it with observed move-order evidence (faster/slower/tie than a
  benchmark). Reports the surviving Speed range, per-nature share, whether
  max-Speed investment is still possible, how much of the grid was ruled out, and
  confidence. Priors are explicitly non-usage (`ASSUMPTIONS.spreadGridPrior`).
- **UI** (`components/choicedex/OpponentInference.tsx`): pick an opponent, add
  move-order observations, and see the narrowed Speed range, nature likelihood
  bars, ruled-out count, and assumptions — live.

Validation: `pnpm typecheck && pnpm lint && pnpm test` (62 tests) `&& pnpm build`
all pass. Phase 5 is deferred; Phases 7–10 are **not** started.

---

## Phase 7 — sandbox, matchup matrix, turn explorer (implemented)

All mechanics-driven; no statistics needed.

- **Scenario sandbox** (`domain/choicedex/sandbox.ts`): `cloneState` /
  `withScenario` copy a state so it can be edited without touching the original
  (spec: "Do not modify the original battle"); `compareScenarios` diffs the best
  recommendation (score, expected damage, KO probability) between baseline and
  variant.
- **Matchup matrix** (`domain/choicedex/matchup.ts`): for each of the user's
  Pokémon vs each opponent, the best single-target offense (best move, expected
  %, OHKO) and the speed relationship. The opponent set is caller-supplied
  (matrices vs "common" Pokémon/cores are deferred with the statistics phase).
- **Branching turn explorer** (`domain/choicedex/turnExplorer.ts`): a bounded
  decision tree of future turns — the user's top action lines (beam search), the
  opponent's best response, and low/high damage-roll chance branches with
  per-node probability and expected value. Bounded by depth, beam width,
  probability threshold, and a node budget; transitions clone the state
  (originals never mutate).
- **UI**: `MatchupMatrix`, `Sandbox`, and `TurnExplorer` client components, each
  a ChoiceDex panel, computing live in-browser.

Tournament preparation (also in the phase title) is partially served here — the
matchup matrix against a chosen opponent set is the core "matchup plans" tool —
with the persistence-heavy parts (saved opponent rosters, practice records,
battle reports) tied to later phases.

Validation: `pnpm typecheck && pnpm lint && pnpm test` (68 tests) `&& pnpm build`
all pass. Phase 5 is deferred; Phases 8–10 are **not** started.

---

## Phase 8 — simulations and practice opponent (implemented)

Mechanics-driven Monte-Carlo, no statistics.

- **Stochastic transition** (`domain/sim/transition.ts`): resolves a turn with a
  seeded PRNG (mulberry32) — priority/Speed ordering, accuracy checks, and a
  random damage roll per hit. Clones the state (originals never mutate).
- **Policies** (`domain/sim/policy.ts`): `greedyPolicy`, `randomPolicy`, and the
  practice-opponent `practicePolicy` at four difficulties (basic / standard /
  competitive / high-variance). Every policy takes only the current state, so
  the practice opponent **structurally cannot read the user's pending choice**
  (spec).
- **Simulation** (`domain/sim/simulate.ts`): `simulateBattle` plays a full game;
  `runSimulations` (and the chunk-friendly `accumulate`/`finalize`) aggregate win
  probability with a 95% Wald CI, loss / draw / timeout rates, average KOs,
  average turns and variance, and outcome counts. Reproducible by seed and
  cancellable via callback.
- **UI**: `Simulator` runs rollouts in cancellable chunks with a live progress
  bar and shows a **fast deterministic recommendation first** (spec); `Practice`
  is an interactive turn-by-turn mode against the AI at a chosen difficulty.

Validation: `pnpm typecheck && pnpm lint && pnpm test` (75 tests) `&& pnpm build`
all pass. Phase 5 is deferred; Phases 9–10 are **not** started.

---

## Phase 9 — replays, post-battle reports, dashboard, calibration (implemented)

Needs persistence (battle history) but no usage statistics.

- **Provisional replay format.** No confirmed Champions replay format exists, so
  `data/schemas/battle.ts` defines a clearly-versioned internal format
  (`assaultdex-provisional-v1`) validated with Zod, and `data/replay.ts` parses
  it and reports unsupported/contradictory data (spec: "use an interface and
  test fixtures rather than claiming full replay support"). It is replaced when a
  real format is confirmed.
- **Post-battle analysis** (`domain/analysis/postBattle.ts`): per turn, compares
  the action actually taken against the engine's recommendation on **expected**
  value — separating decision quality from the random result and from
  information learned later (spec). Flags missed KOs, turning points, and
  high-uncertainty turns; emits KO prediction/outcome pairs for calibration.
- **Confidence calibration** (`domain/analysis/calibration.ts`): Brier score and
  reliability buckets (predicted mean vs observed frequency, with sample sizes)
  from predictions made before the outcome was known.
- **Personal dashboard** (`domain/analysis/dashboard.ts`): record, win rate over
  decisive games, average decision quality, mistake totals, and aggregate
  calibration — with a small-sample flag so conclusions aren't over-drawn.
- **Persistence** (`BattleRecord` model + `battleRepo`): save/list/get and
  **delete individual battles or the whole history** (spec: users can delete
  their battle history and analytics). `battleGenerate.ts` produces a clearly
  labelled generated sample battle by simulating against the practice AI, so the
  dashboard has data before a real replay feed exists.
- **UI**: a new `/battles` route — dashboard, calibration table, generate/import
  forms, history, delete-all — plus `/battles/[id]` per-turn analysis.

Validation: `pnpm typecheck && pnpm lint && pnpm test` (85 tests) `&& pnpm build`
all pass. Phase 5 is deferred; Phase 10 is **not** started.
