@echo off
chcp 65001 >nul
title Kurultay
cd /d "%~dp0forum"
node scripts/baslat.mjs %*
if errorlevel 1 pause
