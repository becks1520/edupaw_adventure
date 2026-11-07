@echo off
rem Klik kanan file ini - "Run as administrator" agar HP/laptop lain bisa membuka game lewat Wi-Fi.
net session >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Jalankan sebagai Administrator: klik kanan file ini - Run as administrator.
  pause
  exit /b 1
)
netsh advfirewall firewall delete rule name="EduPaw 3003" >nul 2>nul
netsh advfirewall firewall add rule name="EduPaw 3003" dir=in action=allow protocol=TCP localport=3003 profile=private,domain
echo Port 3003 diizinkan untuk jaringan Private. Pemain lain bisa membuka http://IP-KOMPUTER:3003
pause
