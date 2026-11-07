@echo off
cd /d "%~dp0"
schtasks /create /tn "EduPawServer" /tr "wscript.exe \"%~dp0jalankan-tersembunyi.vbs\"" /sc onlogon /f
if errorlevel 1 goto GAGAL
echo.
echo Berhasil. Server EduPaw akan menyala otomatis setiap login Windows.
echo Mainkan di: http://localhost:3003
echo Untuk menyalakan sekarang tanpa restart, jalankan jalankan.bat
goto AKHIR

:GAGAL
echo.
echo [ERROR] Gagal membuat tugas otomatis. Klik kanan file ini lalu pilih Run as administrator.

:AKHIR
pause
