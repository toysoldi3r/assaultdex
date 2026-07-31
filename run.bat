@echo off
REM AssaultDex one-click launcher for Windows.
REM Double-click this file. It installs Node.js (via winget) if missing, installs
REM the project's dependencies with npm, sets up the local SQLite database, and
REM starts the site at http://localhost:3000. Keep the window open; Ctrl+C stops.
REM
REM npm (bundled with Node) is used instead of pnpm to avoid pnpm v10 refusing to
REM proceed over optional native build scripts.

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

REM --- 2. Environment file --------------------------------------------------
if not exist ".env" (
  echo Creating .env
  copy /y ".env.example" ".env" >nul
)

REM --- 3. Dependencies (npm) ------------------------------------------------
REM If a previous pnpm install is present (pnpm-lock.yaml, no package-lock.json),
REM clear it so npm starts clean and the two managers don't collide.
if exist "pnpm-lock.yaml" if not exist "package-lock.json" if exist "node_modules" (
  echo Clearing a previous pnpm install...
  rmdir /s /q node_modules
)
if not exist "node_modules\next\package.json" (
  echo Installing dependencies with npm. First time takes a few minutes...
  call npm install --no-audit --no-fund
  if not exist "node_modules\next\package.json" goto :fail
)

REM --- 4. Database ----------------------------------------------------------
if not exist "prisma\dev.db" (
  echo Setting up the database...
  call npm run db:migrate
  if errorlevel 1 goto :fail
  echo Seeding 213 Pokemon...
  call npm run db:seed
  if errorlevel 1 goto :fail
)

REM --- 5. Launch ------------------------------------------------------------
echo.
echo Starting the site at http://localhost:3000
echo The first page load compiles on demand and may take ~15s - refresh if blank.
echo Keep this window open. Press Ctrl+C to stop.
echo.
start "" http://localhost:3000
call npm run dev
goto :eof

:fail
echo.
echo A step above failed. Read the message, fix it, and run this file again.
pause
exit /b 1
