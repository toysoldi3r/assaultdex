@echo off
REM AssaultDex one-click launcher for Windows.
REM Double-click this file. It installs Node.js (via winget) if missing, enables
REM pnpm, installs dependencies, sets up the local SQLite database, and starts
REM the site at http://localhost:3000. Keep the window open; Ctrl+C stops it.

setlocal enabledelayedexpansion
cd /d "%~dp0"

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
  REM winget updates PATH only for NEW shells; make Node visible right now.
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

REM --- 2. Package manager ---------------------------------------------------
REM Use pnpm THROUGH corepack (ships with Node). No global shim, no admin, no
REM PATH refresh needed - corepack fetches pnpm into a per-user cache on first
REM use. Fall back to npm only if corepack is somehow unavailable.
set "COREPACK_ENABLE_DOWNLOAD_PROMPT=0"
set "PM_INSTALL=corepack pnpm install"
set "PM_RUN=corepack pnpm"
call corepack pnpm --version >nul 2>&1
if errorlevel 1 (
  echo corepack/pnpm unavailable - falling back to npm.
  set "PM_INSTALL=npm install"
  set "PM_RUN=npm run"
)

REM --- 3. Environment file --------------------------------------------------
if not exist ".env" (
  echo Creating .env
  copy /y ".env.example" ".env" >nul
)

REM --- 4. Dependencies ------------------------------------------------------
if not exist "node_modules" (
  echo Installing dependencies. First time takes a few minutes...
  REM pnpm v10 exits non-zero on ERR_PNPM_IGNORED_BUILDS (optional native build
  REM scripts it skips by default). Those aren't needed - prebuilt binaries are
  REM fetched - so judge success by whether node_modules was created.
  call %PM_INSTALL%
  if not exist "node_modules\next" goto :fail
)

REM --- 5. Database ----------------------------------------------------------
if not exist "prisma\dev.db" (
  echo Setting up the database...
  call %PM_RUN% db:migrate
  if errorlevel 1 goto :fail
  echo Seeding 213 Pokemon...
  call %PM_RUN% db:seed
  if errorlevel 1 goto :fail
)

REM --- 6. Launch ------------------------------------------------------------
echo.
echo Starting the site at http://localhost:3000
echo The first page load compiles on demand and may take ~15s - refresh if blank.
echo Keep this window open. Press Ctrl+C to stop.
echo.
start "" http://localhost:3000
call %PM_RUN% dev
goto :eof

:fail
echo.
echo A step above failed. Read the message, fix it, and run this file again.
pause
exit /b 1
