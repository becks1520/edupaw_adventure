@echo off
setlocal
cd /d "%~dp0"
title EduPaw Adventure - Server port 3003
set "PORT=3003"

where node >nul 2>nul
if errorlevel 1 goto NONODE

if exist "node_modules\peer" goto RUN
echo Memasang modul multiplayer. Butuh internet, hanya sekali...
call npm install --no-audit --no-fund
if errorlevel 1 echo [INFO] npm install gagal. Game tetap jalan, hanya multiplayer LAN yang nonaktif.

:RUN
if /i "%~1"=="bg" goto START
start "" "http://localhost:%PORT%"

:START
echo.
echo Server EduPaw berjalan di http://localhost:%PORT%
echo Biarkan jendela ini terbuka selama bermain. Tutup untuk menghentikan.
echo.
node lan-server.js
echo.
echo Server berhenti. Jika ada pesan port dipakai, server sudah berjalan: buka http://localhost:%PORT%
pause
exit /b 0

:NONODE
where python >nul 2>nul
if errorlevel 1 goto NOPY
echo Node.js tidak ditemukan. Memakai Python sebagai server sederhana, mode satu pemain saja.
if /i not "%~1"=="bg" start "" "http://localhost:%PORT%"
python -m http.server %PORT%
pause
exit /b 0

:NOPY
echo [ERROR] Node.js belum terpasang.
echo Unduh Node.js LTS dari https://nodejs.org lalu jalankan file ini lagi.
pause
exit /b 1
