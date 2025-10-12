@echo off
setlocal EnableDelayedExpansion

REM ==== Settings ====
set INTERVAL=5

REM go to repo root (where this bat lives)
cd /d %~dp0

REM get current branch
for /f %%b in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%b

echo --------------------------------------------
echo Autopush running on branch: %BRANCH%
echo Checks every %INTERVAL% seconds. Press Ctrl+C to stop.
echo --------------------------------------------

:loop
REM detect changes
set "CHANGED="
for /f %%A in ('git status --porcelain') do set CHANGED=1

if defined CHANGED (
  echo Changes detected. Committing and pushing...

  git add -A
  REM commit may be a no-op sometimes; suppress output
  git commit -m "auto: save" 1>nul 2>nul

  git push origin %BRANCH%
  echo Pushed.
  echo.
)

timeout /t %INTERVAL% /nobreak >nul
goto loop
