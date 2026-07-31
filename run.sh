#!/usr/bin/env bash
# AssaultDex one-shot launcher.
#
#   ./run.sh          # dev server (hot reload) on http://localhost:3000
#   ./run.sh prod     # production build + start
#   ./run.sh --fresh  # wipe the local DB, then dev server
#
# Does everything from a clean checkout: checks tools, sets up the SQLite
# database, seeds the 213-Pokémon dataset, and boots the site.

set -euo pipefail
cd "$(dirname "$0")"

MODE="dev"
FRESH=0
for arg in "$@"; do
  case "$arg" in
    prod|production) MODE="prod" ;;
    --fresh) FRESH=1 ;;
    -h|--help)
      sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "Unknown argument: $arg (use: prod, --fresh, --help)"; exit 1 ;;
  esac
done

say() { printf '\n\033[1;33m▶ %s\033[0m\n' "$1"; }

# --- 1. Node ---------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  say "Node.js not found — attempting install"
  if command -v brew >/dev/null 2>&1; then
    brew install node
  elif command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  elif command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y nodejs
  fi
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Could not install Node automatically. Install Node 20+ from https://nodejs.org and re-run."
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node 20+ required (found $(node -v)). Please upgrade."
  exit 1
fi

# --- 2. pnpm ---------------------------------------------------------------
if ! command -v pnpm >/dev/null 2>&1; then
  say "pnpm not found — enabling via corepack"
  if command -v corepack >/dev/null 2>&1; then
    corepack enable >/dev/null 2>&1 || true
    corepack prepare pnpm@latest --activate >/dev/null 2>&1 || true
  fi
  if ! command -v pnpm >/dev/null 2>&1; then
    npm install -g pnpm
  fi
fi

# --- 3. Env ----------------------------------------------------------------
if [ ! -f .env ]; then
  say "Creating .env (SQLite)"
  cp .env.example .env
fi

# --- 4. Dependencies -------------------------------------------------------
if [ ! -d node_modules ]; then
  say "Installing dependencies"
  # pnpm v10 exits non-zero on ERR_PNPM_IGNORED_BUILDS (optional native build
  # scripts it skips by default); those aren't needed to run. Judge by result.
  pnpm install || true
  if [ ! -d node_modules/next ]; then
    echo "Dependency install failed (node_modules/next missing)."
    exit 1
  fi
fi

# --- 5. Database -----------------------------------------------------------
if [ "$FRESH" -eq 1 ]; then
  say "Wiping local database"
  rm -f prisma/dev.db
fi
if [ ! -f prisma/dev.db ]; then
  say "Setting up database"
  pnpm db:migrate
  say "Seeding 213 Pokémon"
  pnpm db:seed
else
  # Keep schema current on an existing DB (no-op if already applied).
  pnpm db:migrate >/dev/null
fi

# --- 6. Boot ---------------------------------------------------------------
if [ "$MODE" = "prod" ]; then
  say "Building production bundle"
  pnpm build
  say "Starting on http://localhost:3000  (Ctrl+C to stop)"
  exec pnpm start
else
  say "Starting dev server on http://localhost:3000  (Ctrl+C to stop)"
  exec pnpm dev
fi
