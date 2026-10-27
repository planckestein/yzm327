@echo off
chcp 65001 >nul
title Kurultay
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0araclar\baslat.ps1" %*
if errorlevel 1 pause
