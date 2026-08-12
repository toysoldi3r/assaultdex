# AssaultDex

Decision support for competitive **Pokémon Champions doubles**: a metagame
dashboard, a Pokédex, a team builder, the **ChoiceDex** live battle assistant,
turn-by-turn battle analysis, and a reference database.

> **How accurate is this?** The pool is the full **Pokémon Champions roster (235
> species/forms)**, built from the authoritative roster plus `@pkmn/dex`
> (Pokémon Showdown data). Champions battle mechanics aren't publicly
> documented, so every formula (type chart, speed, damage, field effects) is a
> mainline-derived **placeholder, flagged as unverified in the UI** — treat
> calculations as guidance, not gospel. Metagame stats come from a committed
> ladder snapshot (usage %, win rate, top teams, cores); nothing is fetched at
> runtime and no number is fabricated.

## What you can do

- **Home** — a metagame dashboard over the committed ladder snapshot: a ranked
  ladder (usage, win rate, or distinct teams), the most common cores (2–4
  Pokémon), and the top exact team compositions you can open straight into the
  builder.
- **Guide** — an intro to the app and to competitive doubles (targeting, spread
  moves, Protect, support, speed control, Bo3).
- **Pokédex** — search the roster by name, type, ability, or move; each entry
  has base stats, type matchups, common sets, and items, with a full-dex
  reference view alongside the Champions pool.
- **Teams** — a Showdown-style builder with legality checks (species and item
  clauses), team analysis, EV sliders, and versioned saves; import/export in the
  standard paste format.
- **ChoiceDex** — a live battle assistant: set up both sides, then get the best
  play each turn as you enter what happens, and step back a round at any time.
  Includes lead analysis, opponent-speed inference, a matchup matrix,
  Monte-Carlo simulation, and a practice opponent. Active Pokémon can Mega
  Evolve (one per team), Transform (Ditto), use Illusion (Zoroark) or Commander
  (Dondozo), and field-setting abilities apply on entry/Mega — all reflected in
  the damage/KO and recommendation math.
- **Battles** — import a finished battle (or one generated against the practice
  AI) and review it turn by turn (your play vs the recommended one), with a
  personal dashboard and confidence calibration.
- **Database** — reference tabs for **Items** and **Abilities** (each with
  advanced filters and the Pokémon that carry them), **Moves** (filter by type,
  category, and power range), a two-Pokémon **damage Calculator**, and a
  **Knowledgebase** of competitive terms and building-block explainers. A
  separate type chart and move-vs-dual-type effectiveness grid live under
  **Types**. Each list has Champions / full-dex toggles.
- **Sources** — a curated list of the major Pokémon community sites for usage
  stats, tournament data, mechanics reference, and team help.

Search or jump to any section from the top bar (⌘K). Prefer light mode? Toggle
it top-right — the choice is remembered.

## Run it locally

Next.js 15 (App Router) · React 19 · TypeScript · Prisma · Tailwind. Runs on
SQLite with committed fixtures, so no external database is needed — you only
need **Node 22+** and **pnpm**.

First-time setup (run once):

```bash
pnpm install                     # install deps + generate the Prisma client
cp .env.example .env             # sets DATABASE_URL="file:./dev.db"
pnpm db:migrate                  # create the local SQLite database
pnpm db:seed                     # import the Champions pool (idempotent)
```

Then boot the website:

```bash
pnpm dev                         # dev server with hot reload → http://localhost:3000
```

To run the production build instead:

```bash
pnpm build                       # prisma generate + next build
pnpm start                       # serve the build → http://localhost:3000
```

Open <http://localhost:3000> in your browser. If a page errors on first run,
make sure the setup steps above (migrate + seed) have completed.

## Development

`pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` all run in CI on
every push. Common scripts:

```bash
pnpm test            # vitest (once);  pnpm test:watch for watch mode
pnpm typecheck       # tsc --noEmit
pnpm lint            # next lint
pnpm db:seed         # re-import the Champions pool (idempotent)
```

Architecture, data-verification, and deployment notes (including the PostgreSQL
production path) live in [`docs/`](docs/).
