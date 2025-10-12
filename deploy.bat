@echo off
echo.
echo ============================================
echo 🚀 Navigoplan auto deploy starting...
echo ============================================

REM Πήγαινε στον φάκελο του project (ρίζα)
cd /d %~dp0

REM Έλεγξε αν υπάρχουν αλλαγές στο git
set hasChanges=
for /f "tokens=1" %%i in ('git status --porcelain') do (
    set hasChanges=1
    goto :commit
)

:commit
if defined hasChanges (
    echo 🟡 Found local changes — committing...
    git add -A
    git commit -m "auto deploy update"
) else (
    echo ✅ No local changes — doing empty commit to trigger redeploy...
    git commit --allow-empty -m "trigger redeploy"
)

echo.
echo 🛫 Pushing to origin/main...
git push origin main

echo.
echo 🌐 Opening Vercel Deployments page...
start "" "https://vercel.com/navigoplans-projects/navigoplan/deployments"

echo.
echo ✅ Done! Check Vercel for deployment status.
pause
