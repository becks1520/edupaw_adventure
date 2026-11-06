@echo off
setlocal
cd /d "%~dp0"
title EduPaw Adventure - Server port 3003
set PORT=3003

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js belum terpasang. Unduh dari https://nodejs.org lalu jalankan ulang.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Pertama kali jalan: memasang dependensi (butuh internet)...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install gagal. Periksa koneksi internet.
    pause
    exit /b 1
  )
)

rem Mode normal: buka browser. Mode otomatis saat boot (argumen "bg"): tanpa browser.
if /i not "%~1"=="bg" start "" http://localhost:%PORT%

echo Server berjalan di http://localhost:%PORT%  (tutup jendela ini untuk menghentikan)
node lan-server.js
pause
