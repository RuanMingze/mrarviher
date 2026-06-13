@echo off
chcp 65001 >nul
title Mrarviher Setup

echo ========================================
echo   Mrarviher Setup Script
echo ========================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Node.js not found. Downloading...
    if not exist temp mkdir temp
    curl -L -o temp\node-installer.msi https://npmmirror.com/mirrors/node/v26.1.0/node-v26.1.0-x64.msi --progress-bar
    start /wait "" temp\node-installer.msi
    rmdir /s /q temp >nul 2>&1
) else (
    for /f %%i in ('node --version') do set NODE_VER=%%i
    echo [OK] Node.js %NODE_VER%
)

where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    npm install -g pnpm
) else (
    for /f %%i in ('pnpm --version') do set PNPM_VER=%%i
    echo [OK] pnpm %PNPM_VER%
)

echo.
echo [INSTALL] Dependencies...
call pnpm install

echo.
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/

echo [BUILD] Building application...
call pnpm build:win

echo.
if exist "dist\win-unpacked\Mrarviher.exe" (
    echo [SUCCESS] Build complete!
) else (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo [REGISTRY] Setting up file association...
if exist "install-file-association.reg" (
    start "" "install-file-association.reg"
    echo [INFO] Registry window opened - click YES
    timeout /t 5 >nul
) else (
    echo [WARN] No registry file found
)

echo.
echo ========================================
echo   DONE - dist\win-unpacked\Mrarviher.exe
echo ========================================
pause
