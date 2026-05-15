@echo off
echo ==========================================
echo  ChatGÜIRE - Full Stack Launcher
echo ==========================================
echo.
echo Docker containers should be running:
echo   - PostgreSQL  : localhost:5433
echo   - Redis       : localhost:6379
echo   - Evolution   : localhost:8080
echo.
echo Starting API Server  (http://localhost:3001) ...
start "ChatGÜIRE API" cmd /k "%~dp0\start-api.bat"

echo Starting Web Dashboard (http://localhost:3000) ...
start "ChatGÜIRE Web" cmd /k "%~dp0\start-web.bat"

echo.
echo Both servers launched in separate windows!
echo Press any key to close this launcher...
pause > nul
