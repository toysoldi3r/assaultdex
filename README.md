# AssaultDex

Decision support for competitive **Pokémon Champions doubles**: a Pokédex, team
builder, the **ChoiceDex** battle assistant, battle analysis, and a reference
database.

> **Data & mechanics.** The Pokédex is the full **Pokémon Champions pool (213
> species/forms)**, generated from the authoritative roster + `@pkmn/dex`
> (Pokémon Showdown data) — see `docs/DATA_VERIFICATION.md`. Champions battle
> mechanics are not publicly documented, so every formula (type chart, speed,
> damage, field effects) is a mainline-derived placeholder flagged as unverified
> in `src/domain/mechanics/assumptions.ts` and surfaced in the UI.

## Features

- **Pokédex** — search, Pokémon pages with base stats, provisional type
  matchups, and data provenance.
- **Teams** — create/save teams, immutable versions with diff/compare,
  collections, legality validation, basic team analysis, notes, duplicate,
  delete, JSON import/export.
- **ChoiceDex** — interactive battle editor with live recommendations, lead
  analysis, opponent-speed inference, matchup matrix, scenario sandbox, a
  bounded branching turn explorer, Monte-Carlo simulation, and an interactive
  practice opponent (four difficulties). Active Pokémon support in-battle form
  changes — **Mega Evolution** (swaps stats/typing/ability and locks the Mega
  Stone), **Ditto Transform**, **Zoroark Illusion**, and Dondozo's
  **Commander** boost — all folded into the damage/KO and recommendation math.
- **Battles** — provisional-format replay import, per-turn post-battle analysis
  (actual vs recommended on expected value), a personal dashboard, and
  confidence calibration (Brier score + reliability buckets). History is
  deletable.
- **Database** — reference pages for items and abilities (with the Pokémon that
  carry each), a move-type effectiveness grid, a damage calculator, and
  Champions/full-dex toggles.
- **Guide & Sources** — an onboarding guide to the site and competitive play,
  plus a curated list of external Pokémon resources.

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
pnpm test        # vitest (145 tests)
pnpm build       # prisma generate && next build
```

All four pass. Tests asserting values from unverified mechanics are prefixed
`[provisional]`.

## Deployment

Local dev uses SQLite; hosting uses PostgreSQL. The repo ships both schemas
(`prisma/schema.prisma` for SQLite, `prisma/schema.postgres.prisma` for
production) plus a standalone `Dockerfile` and a `docker-compose.yml`. Quick
paths:

- **Vercel + hosted Postgres** (Neon/Supabase): set `DATABASE_URL`, build with
  `pnpm db:generate:pg && pnpm build`, and run `pnpm deploy:setup:pg` once to
  create the schema and seed.
- **Docker + Postgres on a VPS**: `docker compose up -d --build`, then seed.

See **`docs/DEPLOYMENT.md`** for step-by-step instructions. `/api/health` reports
process + database status for monitoring.

## Roadmap

Phases 1–10 are implemented (see `docs/ARCHITECTURE.md`). Phase 5
(usage/win-rate/core statistics) is served from a snapshot committed in-repo and
refreshed out-of-band (`pnpm refresh:usage`), so nothing is fetched at
runtime and no statistic is ever fabricated — the home page surfaces usage %,
win rate, top teams, and common cores from it. User accounts/authentication
remain a planned addition.
