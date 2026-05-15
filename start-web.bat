@echo off
echo ==========================================
echo  ChatGÜIRE - Web Dashboard
echo ==========================================
cd /d "%~dp0\apps\web"
echo Starting Next.js on http://localhost:3000 ...
echo.
call pnpm dev
pause
