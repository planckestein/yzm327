@echo off
chcp 65001 >nul
title Kurultay - testler
cd /d "%~dp0"
if not exist "araclar\python\python.exe" (
  echo Once Kurultay.cmd ile bir kez acin; tasinabilir Python o zaman kurulur.
  pause
  exit /b 1
)
"araclar\python\python.exe" -m pip install -q --disable-pip-version-check --no-warn-script-location -r requirements-test.txt
"araclar\python\python.exe" -m pytest -v
"araclar\python\python.exe" -m mypy
pause
