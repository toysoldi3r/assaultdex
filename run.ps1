# AssaultDex local launcher (PowerShell).
#
# Invoked by run.bat (double-click). Shows a progress bar for each phase, skips
# any phase whose work is already done, and opens the browser only once the dev
# server actually answers - so you never land on a blank "refresh me" page.
#
# npm (bundled with Node) is used instead of pnpm to avoid pnpm v10 refusing to
# proceed over optional native build scripts.

Set-Location -LiteralPath $PSScriptRoot
$TOTAL = 5

function Phase($n, $label) {
  # Bar fills as phases complete: phase n starts at (n-1)/TOTAL.
  $pct = [int]((($n - 1) / $TOTAL) * 100)
  Write-Progress -Activity 'AssaultDex launcher' -Status "[$n/$TOTAL] $label" -PercentComplete $pct
  Write-Host ''
  Write-Host "[$n/$TOTAL] $label" -ForegroundColor Cyan
}

function Fail($msg) {
  Write-Progress -Activity 'AssaultDex launcher' -Completed
  Write-Host ''
  Write-Host "A step failed: $msg" -ForegroundColor Red
  Write-Host 'Read the message above, fix it, and run this file again.'
  Read-Host 'Press Enter to close'
  exit 1
}

Write-Host ''
Write-Host '===============================' -ForegroundColor Yellow
Write-Host '   AssaultDex local launcher'    -ForegroundColor Yellow
Write-Host '===============================' -ForegroundColor Yellow

try {
  # --- 1. Node.js ---------------------------------------------------------
  Phase 1 'Checking Node.js'
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js not found. Installing the LTS version via winget...'
    if (Get-Command winget -ErrorAction SilentlyContinue) {
      winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
      # winget only updates PATH for new shells; make Node visible right now.
      $env:PATH = "$env:ProgramFiles\nodejs;$env:PATH"
    } else {
      Write-Host 'winget is not available on this PC.'
      Write-Host 'Opening the Node.js download page - install the LTS version, then run this file again.'
      Start-Process 'https://nodejs.org/en/download'
      Read-Host 'Press Enter to close'
      exit 1
    }
  }
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node was installed but is not on PATH yet.'
    Write-Host 'Close this window and run the file one more time.'
    Read-Host 'Press Enter to close'
    exit 1
  }
  Write-Host "Using Node $(node -v)"

  # --- 2. Environment file ------------------------------------------------
  Phase 2 'Preparing environment'
  if (-not (Test-Path '.env')) {
    Copy-Item '.env.example' '.env' -Force
    Write-Host 'Created .env'
  } else {
    Write-Host '.env already present - skipping.'
  }

  # --- 3. Dependencies (npm) ----------------------------------------------
  Phase 3 'Installing dependencies'
  # A leftover pnpm install (pnpm-lock.yaml, no package-lock.json) is cleared so
  # npm starts clean and the two managers do not collide.
  if ((Test-Path 'pnpm-lock.yaml') -and (-not (Test-Path 'package-lock.json')) -and (Test-Path 'node_modules')) {
    Write-Host 'Clearing a previous pnpm install...'
    Remove-Item -Recurse -Force 'node_modules'
  }
  if (-not (Test-Path 'node_modules\next\package.json')) {
    Write-Host 'First install takes a few minutes (downloads ~400 packages)...'
    # --prefer-offline reuses the local npm cache before hitting the network.
    npm install --prefer-offline --no-audit --no-fund
    if (-not (Test-Path 'node_modules\next\package.json')) { Fail 'npm install did not complete' }
  } else {
    Write-Host 'Dependencies already installed - skipping.'
  }

  # --- 4. Database --------------------------------------------------------
  Phase 4 'Setting up the database'
  if (-not (Test-Path 'prisma\dev.db')) {
    npm run db:migrate
    if ($LASTEXITCODE -ne 0) { Fail 'db:migrate failed' }
    Write-Host 'Seeding Pokemon...'
    npm run db:seed
    if ($LASTEXITCODE -ne 0) { Fail 'db:seed failed' }
  } else {
    Write-Host 'Database already set up - skipping.'
  }
}
catch {
  Fail $_.Exception.Message
}

# --- 5. Launch ------------------------------------------------------------
# From here the dev server runs in the foreground (blocking) so its logs stream
# and Ctrl+C stops it. This section is outside the try/catch so a normal Ctrl+C
# does not trigger the failure prompt.
Phase 5 'Starting the dev server'
Write-Progress -Activity 'AssaultDex launcher' -Status 'Compiling on first request...' -PercentComplete 100
Write-Host ''
Write-Host 'Starting the site at http://localhost:3000 (Turbopack)' -ForegroundColor Green
Write-Host 'Keep this window open. Press Ctrl+C to stop.'
Write-Host ''

# Open the browser only once the server answers, so the first paint is a real
# page instead of a blank one you have to refresh. Runs as a background job
# while the dev server compiles in the foreground.
$opener = Start-Job {
  for ($i = 0; $i -lt 180; $i++) {
    try {
      Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2 | Out-Null
      Start-Process 'http://localhost:3000'
      break
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
}

try {
  # Turbopack dev compiles noticeably faster than the default webpack dev server.
  npm run dev:turbo
} finally {
  Write-Progress -Activity 'AssaultDex launcher' -Completed
  Stop-Job   $opener -ErrorAction SilentlyContinue
  Remove-Job $opener -ErrorAction SilentlyContinue
}
