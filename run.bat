@echo off
REM AssaultDex one-click launcher for Windows.
REM Double-click this file. It hands off to run.ps1, which installs Node.js (via
REM winget) if missing, installs dependencies, sets up the local SQLite database,
REM shows a progress bar for each phase, and starts the site at
REM http://localhost:3000. The browser opens once the server is ready.
REM Keep the window open; Ctrl+C stops the server.

cd /d "%~dp0"

REM -ExecutionPolicy Bypass applies only to this run, so no machine setting is
REM changed. run.ps1 handles its own error prompts, so we don't pause here.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1"
if errorlevel 1 (
  echo.
  echo The launcher could not start PowerShell. Make sure PowerShell is installed.
  pause
)
