@echo off
setlocal

rem Arranca um servidor local na pasta deste ficheiro (porta 8000) e abre a página de entrada.
set "GAME_DIR=%~dp0"
if "%GAME_DIR:~-1%"=="\" set "GAME_DIR=%GAME_DIR:~0,-1%"
set "GAME_URL=http://localhost:8000/"

if not exist "%GAME_DIR%\index.html" goto :missing

netstat -ano | findstr /r /c:":8000 .*LISTENING" >nul
if errorlevel 1 goto :startserver
goto :open

:startserver
powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath 'py' -ArgumentList '-m http.server 8000 --bind 127.0.0.1' -WorkingDirectory '%GAME_DIR%' -WindowStyle Hidden"
powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 1"

:open
start "" "%GAME_URL%"
exit /b 0

:missing
echo Nao encontrei o index.html do jogo nesta pasta.
echo %GAME_DIR%
pause
exit /b 1
