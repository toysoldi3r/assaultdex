#!/usr/bin/env bash
# AssaultDex one-shot launcher (macOS / Linux).
#
#   ./run.sh          # dev server on http://localhost:3000
#   ./run.sh prod     # production build + start
#   ./run.sh --fresh  # wipe the local DB, then dev server
#
# Installs Node (via brew/apt/dnf if missing), installs dependencies with npm,
# sets up + seeds the SQLite database, and boots the site. npm is used instead
# of pnpm to avoid pnpm v10 refusing to proceed over optional native builds.

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

say() { printf '\n\033[1;33m> %s\033[0m\n' "$1"; }

# --- 1. Node ---------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  say "Node.js not found - attempting install"
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

# --- 2. Env ----------------------------------------------------------------
if [ ! -f .env ]; then
  say "Creating .env (SQLite)"
  cp .env.example .env
fi

# --- 3. Dependencies (npm) -------------------------------------------------
# Clear a previous pnpm install so npm starts clean.
if [ -f pnpm-lock.yaml ] && [ ! -f package-lock.json ] && [ -d node_modules ]; then
  say "Clearing a previous pnpm install"
  rm -rf node_modules
fi
if [ ! -f node_modules/next/package.json ]; then
  say "Installing dependencies with npm"
  npm install --no-audit --no-fund
  if [ ! -f node_modules/next/package.json ]; then
    echo "Dependency install failed (node_modules/next missing)."
    exit 1
  fi
fi

# --- 4. Database -----------------------------------------------------------
if [ "$FRESH" -eq 1 ]; then
  say "Wiping local database"
  rm -f prisma/dev.db
fi
if [ ! -f prisma/dev.db ]; then
  say "Setting up database"
  npm run db:migrate
  say "Seeding 213 Pokemon"
  npm run db:seed
fi

# --- 5. Boot ---------------------------------------------------------------
if [ "$MODE" = "prod" ]; then
  say "Building production bundle"
  npm run build
  say "Starting on http://localhost:3000  (Ctrl+C to stop)"
  exec npm run start
else
  say "Starting dev server on http://localhost:3000  (Ctrl+C to stop)"
  exec npm run dev
fi
