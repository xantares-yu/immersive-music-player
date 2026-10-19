@echo off
title Aetheria Sound Launcher
cd /d "%~dp0"
start "" ".\node_modules\electron\dist\electron.exe" "%~dp0"
exit
