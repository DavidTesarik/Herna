@echo off
cd /d "%~dp0"
echo Nahravam Hernu na GitHub...
git add -A
git commit -m "Aktualizace %date% %time:~0,5%"
git push origin HEAD:main
echo.
echo Hotovo. Pokud vyse neni zadna chyba, nova verze bude na webu za 1-2 minuty.
pause
