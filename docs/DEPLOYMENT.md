# Deploying AssaultDex

Local dev runs on **SQLite** (no DB server). Hosting uses **PostgreSQL**, because
most hosts have an ephemeral filesystem where a SQLite file would not persist.
The repo ships both:

- `prisma/schema.prisma` — SQLite (default; local dev / CI).
- `prisma/schema.postgres.prisma` — PostgreSQL (production; identical models).

The application code is unchanged between the two — JSON-shaped columns are stored
as validated TEXT, so only the datasource provider differs.

---

## Option A — Vercel + a hosted Postgres (easiest managed path)

1. **Create a Postgres database** (Neon, Supabase, or Vercel Postgres) and copy
   its connection string.
2. **Import the repo into Vercel** (New Project → your Git repo → branch
   `claude/caveman-mode-first-slice-t0bu8q`). Framework preset: Next.js.
3. **Environment variables** (Vercel → Settings → Environment Variables):
   - `DATABASE_URL` = your `postgresql://…` string.
4. **Build command** — override Vercel's default so it generates the Prisma client
   against the Postgres schema:
   ```
   pnpm db:generate:pg && pnpm build
   ```
5. **Create the schema + seed once.** From your machine, pointed at the same
   database:
   ```bash
   DATABASE_URL="postgresql://…" pnpm deploy:setup:pg
   ```
   (`deploy:setup:pg` = generate client + `prisma db push` + seed the 8 Pokémon.)
6. **Deploy.** Open the Vercel URL — the Pokédex should be populated.

> Note: the committed migrations under `prisma/migrations/` are SQLite. For
> Postgres, `db push` (used above) creates the schema directly without migration
> files, which is the simplest first deploy. If you want Postgres migration
> history, run `prisma migrate dev --name init --schema prisma/schema.postgres.prisma`
> against a Postgres database and commit the generated `prisma/migrations`.

## Option B — Docker + Postgres on a VPS (self-hosted)

The repo has a multi-stage `Dockerfile` (Next.js standalone) and a
`docker-compose.yml` that runs the app + Postgres.

1. On the server, in the repo:
   ```bash
   docker compose up -d --build        # starts db + app
   ```
2. Create the schema + seed once (run against the compose Postgres):
   ```bash
   docker compose exec app sh -lc \
     'DATABASE_URL=$DATABASE_URL pnpm db:push:pg && pnpm db:seed'
   ```
   (Or run `pnpm deploy:setup:pg` from any machine with network access to the DB.)
3. The app listens on port 3000 (compose maps it). Put a reverse proxy (Caddy,
   Nginx, Traefik) in front for TLS.

The Docker image already sets the recommended security headers (via
`next.config.ts`) and exposes `/api/health` for uptime checks.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | `postgresql://user:pass@host:5432/db` in production; `file:./dev.db` locally. |
| `NODE_ENV` | recommended | `production` for hosting. |

No other secrets are needed in this build (no auth/third-party keys yet).

## Post-deploy checklist

- `GET /api/health` returns `{"status":"ok","db":"up"}`.
- The Pokédex lists 8 Pokémon (seed ran).
- Security headers present (`curl -sI https://your-host/ | grep -i content-security-policy`).

## Switching the default to Postgres permanently (optional)

If you no longer need the SQLite dev path, you can make Postgres the only schema:
copy `prisma/schema.postgres.prisma` over `prisma/schema.prisma`, delete the
SQLite `prisma/migrations`, and regenerate. Until then, keep both so local dev
stays zero-setup.
