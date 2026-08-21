@echo off
REM AssaultDex one-click launcher for Windows.
REM Double-click this file. It installs Node.js (via winget) if missing, installs
REM dependencies with pnpm, sets up the local SQLite database, and starts the
REM site at http://localhost:3000. Keep the window open; Ctrl+C stops.

setlocal enabledelayedexpansion
cd /d "%~dp0"

REM Quieter, faster boot: skip Next telemetry and let corepack fetch pnpm
REM without an interactive download prompt.
set "NEXT_TELEMETRY_DISABLED=1"
set "COREPACK_ENABLE_DOWNLOAD_PROMPT=0"

echo.
echo ===============================
echo   AssaultDex local launcher
echo ===============================
echo.

REM --- 1. Node.js -----------------------------------------------------------
where /q node
if errorlevel 1 (
  echo Node.js not found. Installing the LTS version via winget...
  where /q winget
  if errorlevel 1 (
    echo.
    echo winget is not available on this PC.
    echo Opening the Node.js download page - install the LTS version,
    echo then double-click this file again.
    start "" https://nodejs.org/en/download
    pause
    exit /b 1
  )
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  set "PATH=%ProgramFiles%\nodejs;%PATH%"
)

where /q node
if errorlevel 1 (
  echo.
  echo Node was installed but is not on PATH yet.
  echo Close this window and double-click the file one more time.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -v') do set "NODEV=%%v"
echo Using Node !NODEV!

REM --- 2. Environment file --------------------------------------------------
if not exist ".env" (
  echo Creating .env
  copy /y ".env.example" ".env" >nul
)

REM --- 3. Dependencies (pnpm via corepack) ---------------------------------
REM This is a pnpm project (same as CI). pnpm ships with Node through corepack,
REM installs faster than npm, and honours the project's .npmrc and build-script
REM settings - so none of npm's "unknown config" / "allow-scripts" warnings show.
REM Corepack reads the "packageManager" field in package.json to pick pnpm 9.
set "PM=corepack pnpm"
set "RUN=corepack pnpm run"
call corepack --version >nul 2>&1
if errorlevel 1 (
  echo corepack not found; falling back to npm.
  set "PM=npm"
  set "RUN=npm run"
)

REM A previous npm/older install leaves a flat node_modules without pnpm's
REM ".pnpm" store dir; clear it so pnpm can lay out its own tree cleanly.
if exist "node_modules" if not exist "node_modules\.pnpm" if not "!PM!"=="npm" (
  echo Clearing a previous non-pnpm install...
  rmdir /s /q node_modules
)

if not exist "node_modules\next\package.json" (
  echo Installing dependencies with !PM!. First time takes a minute...
  if "!PM!"=="npm" (
    call npm install --prefer-offline --no-audit --no-fund
  ) else (
    call corepack pnpm install --frozen-lockfile --prefer-offline --config.confirmModulesPurge=false
  )
  if not exist "node_modules\next\package.json" goto :fail
)

REM --- 4. Database ----------------------------------------------------------
if not exist "prisma\dev.db" (
  echo Setting up the database...
  call !RUN! db:migrate
  if errorlevel 1 goto :fail
  echo Seeding Pokemon...
  call !RUN! db:seed
  if errorlevel 1 goto :fail
)

REM --- 5. Launch ------------------------------------------------------------
echo.
echo Starting the site at http://localhost:3000
echo The first page load compiles on demand and may take ~15s - refresh if blank.
echo Keep this window open. Press Ctrl+C to stop.
echo.
start "" http://localhost:3000
call !RUN! dev:turbo
goto :eof

:fail
echo.
echo A step above failed. Read the message, fix it, and run this file again.
pause
exit /b 1
