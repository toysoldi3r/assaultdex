# AssaultDex

Decision support for competitive **Pokémon Champions doubles**. This repository
contains the **Phase 1 vertical slice** described in `ASSAULTDEX_SPEC.md`.

> **Mechanics are provisional.** Pokémon Champions mechanics are not publicly
> documented, so every formula (type chart, speed, damage) is a
> mainline-derived placeholder flagged as unverified in
> `src/domain/mechanics/assumptions.ts`. Pokémon data is documented **fixture**
> data, not a live provider feed. See `docs/ARCHITECTURE.md`.

## What the slice does

- Import Pokémon from documented fixtures through a validated provider adapter
  (idempotent).
- Search Pokémon and open a Pokémon page (types, base stats, provisional
  matchups, provenance).
- Create and save teams; save immutable versions and compare them; file teams
  in collections.
- ChoiceDex: pick two user and two opponent active Pokémon, enter a basic battle
  state, and get ranked recommendations with damage/KO/survival probabilities, a
  transparent factor breakdown, assumptions, confidence, and an explanation.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Prisma · Zod ·
Vitest · Tailwind. Development/CI uses **SQLite** so the slice runs with no
external database server; the production target is PostgreSQL.

## Architecture (layers)

```
src/app, src/components   UI (Next.js)         depends inward only
src/server                persistence (Prisma repositories)
src/domain                pure battle logic + scoring (NO I/O)   ← lint-enforced
src/data                  provider adapters, Zod schemas, fixtures, normalization
```

The pure `src/domain` layer may not import UI, persistence, data adapters, or
the framework (enforced by ESLint `no-restricted-imports`).

## Setup

Requires Node 22+ and pnpm.

```bash
pnpm install            # installs deps and generates the Prisma client
cp .env.example .env    # DATABASE_URL="file:./dev.db"
pnpm exec prisma migrate deploy   # apply migrations
pnpm db:seed            # import fixture Pokémon (idempotent)
pnpm dev                # http://localhost:3000
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma datasource. Phase 1 default: `file:./dev.db` (SQLite). Production: a `postgresql://` URL (also switch the datasource `provider` in `prisma/schema.prisma`). |

## Validation

```bash
pnpm typecheck   # tsc --noEmit
pnpm lint        # next lint
pnpm test        # vitest (32 tests)
pnpm build       # prisma generate && next build
```

All four pass on this slice. Tests that assert values from unverified mechanics
are prefixed `[provisional]`.

## Scope

Only the Phase 1 vertical slice is implemented. Later phases (statistics, opponent
inference, sandbox, simulations, replays, accounts, etc.) are **not** started and
their data is not fabricated.
