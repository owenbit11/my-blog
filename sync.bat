@echo off
echo [1/3] Cleaning local cache...
rd /s /q .next

echo [2/3] Committing changes...
git add .
set /p msg="Enter commit message (or press Enter for 'update'): "
if "%msg%"=="" set msg=update
git commit -m "%msg%"

echo [3/3] Pushing to GitHub...
git push

echo Done! Vercel will deploy your changes in 1-2 minutes.
pause