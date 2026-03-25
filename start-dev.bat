@echo off
cd /d "%~dp0"
echo Starting Next.js dev server...
echo Open: http://127.0.0.1:3000
echo API test: http://127.0.0.1:3000/api/posts
echo.
call npm run dev
pause
