@echo off
chcp 65001 >nul
title Aetheria Sound - 全屏沉浸流光音乐系统
echo ========================================================
echo   Aetheria Sound · 全屏沉浸流光音乐系统正在启动...
echo   本地服务地址: http://localhost:8080
echo ========================================================
echo.

start http://localhost:8080
node server.js

pause
