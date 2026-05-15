@echo off
echo ==========================================
echo  ChatGÜIRE - API Server
echo ==========================================
cd /d "%~dp0\apps\api"
echo Starting API on http://localhost:3001 ...
echo.
call pnpm dev
pause
