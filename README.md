# AssaultDex

Decision support for competitive **Pokémon Champions doubles**: a Pokédex, team
builder, the **ChoiceDex** battle assistant, battle analysis, and a reference
database.

> **How accurate is this?** The pool is the full **Pokémon Champions roster (235
> species/forms)**, built from the authoritative roster plus `@pkmn/dex`
> (Pokémon Showdown data). Champions battle mechanics aren't publicly
> documented, so every formula (type chart, speed, damage, field effects) is a
> mainline-derived **placeholder, flagged as unverified in the UI** — treat
> calculations as guidance, not gospel. Metagame stats come from a committed
> ladder snapshot (usage %, win rate, top teams, cores); nothing is fetched at
> runtime and no number is fabricated.

## What you can do

- **Pokédex** — search by name, type, ability, or move; per-Pokémon base stats,
  type matchups, common sets, and items.
- **Teams** — a Showdown-style builder with legality checks, team analysis, and
  versioned saves; import/export in the standard paste format.
- **ChoiceDex** — a live battle assistant: set up both sides, then get the best
  play each turn as you enter what happens. Includes lead analysis,
  opponent-speed inference, a matchup matrix, Monte-Carlo simulation, and a
  practice opponent. Active Pokémon can Mega Evolve, Transform (Ditto), use
  Illusion (Zoroark) or Commander (Dondozo) — all reflected in the damage/KO and
  recommendation math.
- **Database** — reference pages for items and abilities (with the Pokémon that
  carry each), a move-type effectiveness grid, a type chart, and a two-Pokémon
  damage calculator, each with Champions / full-dex toggles.
- **Battles** — import a finished battle and review it turn by turn (your play
  vs the recommended one), with a personal dashboard and confidence calibration.
- **Guide & Sources** — an intro to the app and competitive doubles, plus a
  curated list of the major Pokémon community sites.

Prefer light mode? Toggle it top-right — the choice is remembered.

## Development

Next.js 15 (App Router) · React 19 · TypeScript · Prisma · Tailwind. Runs on
SQLite locally with committed fixtures, so no external database is needed.

```bash
pnpm install            # deps + Prisma client
cp .env.example .env    # DATABASE_URL="file:./dev.db"
pnpm exec prisma migrate deploy
pnpm db:seed            # import the Champions pool (idempotent)
pnpm dev                # http://localhost:3000
```

`pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` all run in CI on
every push. Architecture and deployment notes (including the PostgreSQL
production path) live in [`docs/`](docs/).
