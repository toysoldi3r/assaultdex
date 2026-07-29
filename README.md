# AssaultDex

Decision support for competitive **Pokémon Champions doubles**: a Pokédex, team
builder, the **ChoiceDex** battle assistant, and battle analysis.

> **Mechanics are provisional.** Pokémon Champions mechanics are not publicly
> documented, so every formula (type chart, speed, damage, field effects) is a
> mainline-derived placeholder flagged as unverified in
> `src/domain/mechanics/assumptions.ts` and surfaced in the UI. Pokémon data is
> documented **fixture** data, not a live provider feed. See
> `docs/ARCHITECTURE.md`.

## Features

- **Pokédex** — search, Pokémon pages with base stats, provisional type
  matchups, and data provenance.
- **Teams** — create/save teams, immutable versions with diff/compare,
  collections, legality validation, basic team analysis, notes, duplicate,
  delete, JSON import/export.
- **ChoiceDex** — interactive battle editor with live recommendations, lead
  analysis, opponent-speed inference, matchup matrix, scenario sandbox, a
  bounded branching turn explorer, Monte-Carlo simulation, and an interactive
  practice opponent (four difficulties).
- **Battles** — provisional-format replay import, per-turn post-battle analysis
  (actual vs recommended on expected value), a personal dashboard, and
  confidence calibration (Brier score + reliability buckets). History is
  deletable.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Prisma · Zod ·
Vitest · Tailwind. Development/CI uses **SQLite** so everything runs with no
external DB server; the production target is PostgreSQL.

## Architecture

```
src/app, src/components   UI (Next.js)         depends inward only
src/server                persistence (Prisma repositories), rate limiting
src/domain                pure engines: mechanics, ChoiceDex, sim, analysis (NO I/O)
src/data                  provider adapters, Zod schemas, fixtures, normalization
```

The pure `src/domain` layer may not import UI, persistence, data adapters, or the
framework (enforced by ESLint `no-restricted-imports`). Because it is pure, the
recommendation/simulation engines also run client-side for the interactive
ChoiceDex.

## Setup

Requires Node 22+ and pnpm.

```bash
pnpm install            # installs deps and generates the Prisma client
cp .env.example .env    # DATABASE_URL="file:./dev.db"
pnpm exec prisma migrate deploy   # apply migrations
pnpm db:seed            # import fixture Pokémon (idempotent)
pnpm dev                # http://localhost:3000
```

## Validation

```bash
pnpm typecheck   # tsc --noEmit
pnpm lint        # next lint
pnpm test        # vitest (89 tests)
pnpm build       # prisma generate && next build
```

All four pass. Tests asserting values from unverified mechanics are prefixed
`[provisional]`.

## Deployment

Production uses PostgreSQL. Switch the datasource in `prisma/schema.prisma` to
`provider = "postgresql"`, regenerate migrations, set `DATABASE_URL` to a
`postgresql://` URL, and run `pnpm exec prisma migrate deploy` as a release step.
A multi-stage `Dockerfile` (Next.js standalone output) and a `docker-compose.yml`
describing the app + Postgres topology are included. `/api/health` reports
process and database status for monitoring.

## Roadmap

Phases 1–4 and 6–10 are implemented (see `docs/ARCHITECTURE.md`). Phase 5
(usage/win-rate/core statistics) is intentionally deferred until a verified
Pokémon Champions usage source exists — statistics are never fabricated. The
provider-adapter interface and provenance/reliability columns are already in
place for it. User accounts/authentication are also a planned addition.
