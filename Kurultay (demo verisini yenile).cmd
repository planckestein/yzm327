@echo off
chcp 65001 >nul
title Kurultay - demo verisi yenileniyor
cd /d "%~dp0forum"
node scripts/baslat.mjs --demo %*
if errorlevel 1 pause
